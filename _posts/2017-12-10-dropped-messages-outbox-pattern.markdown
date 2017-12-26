---
layout: post
title:  "Preventing RabbitMQ dropped messages with an Outbox"
date:   2017-12-10 16:58:04 -0500
categories: rabbitmq, ruby
---

If you have dropped messages after introducing RabbitMQ (or another messaging
tool) then this is for you, a quick example on the most common issue I see
when adding messaging and a pattern you can use to fix it.

Adding messaging to a web app can have a lot of benefits, asynchronous
processing, decoupling services. It usually comes up when talking about moving
to microservices but there are some architectural patterns to be aware of that
prevent dropping messages.

The easiest way to accidentally introduce this type of bug is adding a method
like this `transfer_with_publish` to replace `transfer`. Here we pulled the
deposit method to a service that receives its data through RabbitMQ using
RabbitMQClient.

```ruby
class Cart
  def transfer(sender, receiver)
    DB.transaction do
      sender.withdraw(100)
      receiver.deposit(100)
    end
  end

  def transfer_with_publish(sender, receiver)
    sender.withdraw(100)
    RabbitMQClient.publish_deposit(user_id: receiver.id, amount: 100)
  end
end
```

To understand why this will fail sometimes, we can take a quick look at why
we use database transactions. If we were withdrawing money from one user and
depositing that amount to another user, we would put those two operations in a
transaction to guarantee they execute together or not at all. Removing the
transaction would potentially produce bugs where money disappeared.

```ruby
DB.transaction do
  david.withdrawal(100)
  mary.deposit(100)
end
```

Our messaging example is structurally identical to our transaction example with
one difference - there is no distributed transaction method for our database and
messaging queue. which means when we look at our messaging example our code
actually looks like this

```ruby
# DB.transaction do
  david.withdrawal(100)
  mary.deposit(100)
# end
```

We would expect an error like this to sometimes happen:

1. `david.withdrawal(100)`
2. something crashes (e.g. database/webserver)
3. `mary.deposit(100)` never happens

One way to deal with this is to use an 'Outbox'. This is a pattern where we
store what we intend to publish in a table (e.g. 'outbox_messages'), and then
later publish that data. The interesting part of this is that committing the
contents of our message **is** done same transaction as committing the original
change.

```ruby
def transfer_with_publish(sender, receiver)
  Transaction do
    sender.withdraw(100)
    OutboxMessage.create(
      user_id:         receiver.id,
      amount:          100,
      idempotence_key: SecureRandom.uuid
    )
  end
end

# an asynchronous worker
loop do
  OutboxMessage.each do |message|
    RabbitMQClient.publish_deposit(
      user_id:         message.user_id,
      amount:          message.amount,
      idempotence_key: message.idempotence_key
    )
    message.delete
  end
end
```

The sequence of steps in this example:

1. `sender.withdraw(100)` *and* the outbox message are committed
1. Worker loop publishes message
1. Delete the message

Unlike the problem we started with, where an error can cause dropped messages,
an error here will only cause the asynchronous worker to restart - but the
message will eventually be delivered. The Outbox pattern is not the only way to
deal with dropped messages but it is a pretty easy one to start using.
