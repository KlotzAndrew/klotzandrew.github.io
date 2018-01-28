---
layout: post
title:  "Lost messages with sidekiq"
date:   2018-01-28 16:58:04 -0500
categories: ruby, sidekiq, redis
---

Sidekiq is a great library for getting asynchronous library for quickly
moving work into background jobs in Rails/Ruby apps, but it can drop messages.
Understanding of when this can happen will hopefully help prevent you from
putting critical 'cannot-lose-this' messages somewhere they can be lost or cut
down debugging time.

The general API for Sidekiq looks like this, `UserMailer.perform_async` enqueues
a job to Redis and that eventually runs then `UserMailer.new.perform` method:

```ruby
class User < ActiveRecord::Base
  after_commit :greet, :on => :create

  def greet
    UserMailer.perform_async(self.id)
  end
end

class UserMailer
  include Sidekiq::Worker

  def perform(id)
    contact = Contact.find(id)
    send_email(contact)
  end

  private

  def send_email(contact)
    # email code
  end
end
```

Sidekiq 'best practices' for rails generally advise firing events in an
`after_commit` hook to prevent race conditions. The race being, if the sidekiq
job fires _before_ the database transaction commits, the worker will error
when trying to find the not-yet-commited database record. This is an important
detail that we will get back to in a second.

## Where messages can be dropped:

#### 1) Redis as a datastore

###### If Redis restarts after enqueueing a job, messages are lost

Redis is incredibly fast and one of the reasons sidekiq itself is so quick, but the drawback to speed in this case is data durability. Using the default options When writing
a value to Redis, Redis will confirm the write without it having been persisted
to disk. Redis default is to only persist in memory - which is greate for speed.
There is an option to turn on an Append Only File, where redis persists
data to disk with `fsync`, but by default the write to disk happens once every
second `appendfsync everysec`, the implications of this is that there is still a window
where your message only exists in memory and a Redis restart will lose your message!

It is possible to toggle `appendfsync always` which writes to disk after every
command. The speed and throughputs of writes will drop drastically, so you
probably want to use a diffferent Redis instance for speed sensitive
operations like caching.

#### 2) After Commit

###### If your app or Redis restarts while enqueuing a job, messages are lost

The recommendation for using `after_commit` touches on the issues of distributed
transactions. What our `after_commit` code is doing:
  1. Save record to primary database, then
  1. Save data to Redis

The semantics of what we _want_ is our data saved in two places
in an ACID-style transaction, but our code is doing this in two separate
operations. After the first operation finishes, the *intent* to save data in
Redis exists only in memory, if our app restarts during that time - the message
is lost.

For durability, a potentially implementation would persist the *intent* to
publish to Redis inside the first database transaction (e.g. `after_save`) and
cleanup on job run. With that, should the application restart it can check for in-flight messages and continue where it left off.

There is an post I wrote on the **Outbox Pattern** for ways to impliment this.

#### 3) Reliable Push

###### If your app restarts while enqueuing a job, messages are lost

Reliable Push is a pro feature designed to add durability around publishing while
a Redis connection is interrupted or unavailable. If the connection is unavailable,
Sidekiq will store the message in memory and retry when the connection becomes
available again.

The issues here are again around your application restarting while enqueueing a
job. When the job is being held in memory an application restart will drops it.
This feature reduces the chance of a dropped message, but architecturally there
is still a gap in durability guarantees.

#### 4) Worker restarts

###### If your worker restarts while processing work, messages are lost

This one differs a little depending on which version of Sidekiq you are using.

In the public version: sidekiq workers uses `BRPOP` to fetch the latest job from
Redis:

```ruby
def retrieve_work
  work = Sidekiq.redis { |conn| conn.brpop(*queues_cmd) }
  UnitOfWork.new(*work) if work
end
```

As soon as this happens, the job *only* exists in memory of that worker,
a worker restart will drop the message

In Sidekiq Pro version < 3: Sidekiq workers use the atomic `BRPOPLPUSH` command
to push in-process work into a 'working' queue, one for each worker. If you
ever wondered what that `-i` index flag is used for in the command line, this
is roughly the code block it gets used in:

```ruby
def working_queue_name(q)
  if options[:ephemeral_hostname]
    "queue:#{q}_#{options[:index]}"
  else
    "queue:#{q}_#{Socket.gethostname}_#{options[:index]}"
  end
end
```

This constructs the name of the 'working' queue that the sidekiq work lives in.
When a worker restarts it checks its 'working' queue to see if there were any
in-flight jobs is needs to resume before fetching new work. The interesting part
here is the `Socket.gethostname` call. If you are using docker, this will be
different on each worker restart. The implication to this is if
`options[:ephemeral_hostname]` returns false, jobs will become permanently
orphaned in 'working' queues - essentially lost. E.g. placing in-flight jobs
into a working queue named `app:queue:default_9990eeababc0_0`, and on restart
incorrectly looking at a new working queue named `app:queue:default_285c9f0f9d3d_0`
for those flight jobs.

Sidekiq Pro version >= 4 has job recovery feature that periodically looks for
orphaned jobs and recovers them.

### Final thoughts

One of the very real questions to all of this is, should I care? Depending on
your requirements maybe not.

For example, one on end if you are sending welcome emails, dropping a few here
or there might have a very small business impact compared to the value of
building another feature. But on the other end, if you find yourself using
Sidekiq for mission critical jobs, data replication, or some other
'cannot-lose-this' function, then this might become an issue.

Sidekiq itself has a price chart for making cost tradeoffs (although it is for
upgrading to pro), but the concept is essentially the same tradeoff here. The
biggest advantage to Sidekiq is how little developer time it takes to get
features out the door.
