---
layout: post
title: "TLA+ verifying a money transfer"
date: 2019-12-07 17:00:00 -0500
categories: tlaplus, concurrency
image: tlaplus_transfer.png
---

What could go wrong with transferring money between two accounts? I have written about how easy it is to get wrong (giving away or losing money) and patterns for preventing problems like with the <a href="http://klotzandrew.com/blog/dropped-messages-outbox-pattern">outbox pattern</a>. <a href="https://lamport.azurewebsites.net/tla/tla.html">TLA+</a> provides a language and tooling for proving systems that might be able to help us understand if we have design flaws. <a href="https://learntla.com/introduction/example/">The first example from TLA+</a> is about transferring money from alice to bob, this is the basic premise:

Alice and bob have accounts
We want to transfer money from alice to bob
No account can go negative
Invariant: total money in the system should be constant at all times

In the example they end with an incomplete example:


```tlaplus
---- MODULE Transfer ----
EXTENDS Naturals, TLC

(* --algorithm transfer
variables alice_account = 10, bob_account = 10,
         account_total = alice_account + bob_account;

process Transfer \in 1..2
 variable money \in 1..20;
begin
Transfer:
 if alice_account >= money then
   MoveMoney: alice_account := alice_account - money;
              bob_account := bob_account + money;
end if;
C: assert alice_account >= 0;
end process

end algorithm *)

\* BEGIN TRANSLATION
\* ...
\* END TRANSLATION

MoneyInvariant == alice_account + bob_account = account_total
```

Where we have a race condition that violates our money invariant. Can you spot it? Critically, the `MoveMoney` step happens *after* the balance check on alice’s account, both processes will pass the balance check in parallel and then potentially bring the account into negative. A solution would be to keep the balance check and money movement in the same step to prevent the race:

```tla
\* ...
Transfer:
  if alice_account >= money then
    alice_account := alice_account - money;
    bob_account := bob_account + money;
  end if;
\* ...
```

Now lets say these balances are on different systems (microservices maybe?) that are unable to atomicly operate on each other, what would a locking mechanism look like? To change the setup, we will need to update each money movement line to its own steps: `MoveAlice`, `MoveBob` - to describe them no longer being atomic.

Now how to counteract the loss of atomicity? We can start with awaiting on a locked flag that only one process at a time can hold. Running this and having it fail might come as a little surprise, since the lock prevents concurrency of processes for balance changes, but that is not where our invariant is being violated.

<div style="text-align: center; margin-bottom: 2rem;">
  <img src="../../assets/tlaplus_transfer.png" alt="tlaplus transfer" width="700">
  <div>(what was the invariant again?)</div>
</div>

Since the balances are on different steps, the invariant `MoneyInvariant == alice_account + bob_account = account_total` is impossible to enforce. Our system guarantees this is true *eventually* after an individual process has completed, but during that processes execution we have no atomic operator to guarantee that in this setup.

What needs to change for the system to validate? We have to relax our invariant `MoneyInvariant == alice_account + bob_account <= account_total`, and then inside our process update the logic to always withdraw *then* deposit, which we can assert has been balanced on processes completion. This is similar to the money being ‘in transit’ and unavailable until the processes have settled.

```tla
---- MODULE Transfer ----
EXTENDS Naturals, TLC

(* --algorithm transfer
variables alice_account = 10, bob_account = 10, locked = 0,
         account_total = alice_account + bob_account;

process Tranfer \in 1..2
   variable money \in 1..20

begin
Transfer:
 await locked = 0;
 locked := 1;
Move:
 if alice_account >= money then
   MoveAlice: alice_account := alice_account - money;
   MoveBob: bob_account := bob_account + money;
 end if;
Finish:
 locked := 0;
 assert alice_account + bob_account = account_total;

end process
end algorithm *)

\* BEGIN TRANSLATION
\* ...
\* END TRANSLATION

MoneyEventualInvariant == alice_account + bob_account <= account_total
```

Now if you are interested, you could add an invariant to represent the eventual consistency. When no processes are running so at some point we can say `MoneyInvariant == alice_account + bob_account = account_total`. We mentioned microservices earlier, if these were different services we would also need to add in the possibility that a process would crash halfway through - where one account would have money withdrawn and not yet deposited in the second.
