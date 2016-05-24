---
layout: post
title:  "Interactor Pattern: Keep your rails app skinny"
date:   2016-05-23 09:21:10 -0400
categories: ruby
---

Ever struggled with where where to stick your Rails app logic? or had controllers and models getting big?
When I first started with rails the MVC seemed like it covered it all;
but as my application logic started to get complex, and it was less clear where specific pieces of logic should live.
Does a 'process payment' method live on a controller or a model?
It really felt like there should be another standard rails layer between the controller and the model to put my code.
The Interactor gem provides a simple pattern to organize your application logic, and keep your app from feeling bloated.

The interactor gem provides a pattern for creating single-purpose objects to contain your business logic.
I like the put them in `app/interactors` and it even feels just like rails.
Interactors have a single public method `call` that takes a hash as an argument.
This hash gets converted into a `context`, should have all the information the interactor needs to complete this piece of logic.
The interactor can add information to the context, which can be useful for returning values back to what called the interactor.
The most useful part about the context is that it responds to `context.success?` and you can `context.fail!` it!
Which will return from the interactor.

A basic interactor for purchasing tickets could look something like this:

{% highlight ruby %}
class PurchaseTicket
  include Interactor

  def call
    if context.user? && context.concert?
      ticket          = purchase_ticket(context.user, context.concert)
      context.ticket  =  ticket
    else
      context.fail!(message: "Need a user and concert to purchase a ticket!")
    end
  end

  private

  def purchase_ticket(user, concert)
    # create ticket logic
  end
end
{% endhighlight %}

It is an object that includes `Interactor` and defines a method `call`.
The context has the information required to purchase a ticket,
and the interactor has all the logic require to handle that action.

What does this mean for your rails app?
You can keep your business logic out of your controllers and models.
In the case above, the controller method could look something like this:

{% highlight ruby %}
class TicketsController < ApplicationController
  def create
    result = PurchaseTicket.call(ticket_params)

    if result.success?
      render :show, result.ticket
    else
      flash[:error] = result.message
      render :new
    end
  end
end
{% endhighlight %}

This controller method does not need to know how to purchase a ticket.
Instead it needs to know if a ticket was purchased successfully, and what views to render.
This also helps keep the Ticket model clean:

{% highlight ruby %}
class Ticket < ActiveRecord::Base
 belongs_to: user
 belongs_to: concert
 validates: price, presence: true
end
{% endhighlight %}

This model never has to know how tickets are purchased, or who does the purchasing.
Its responsibility can stick to just describing out applications data.

The Interactor gem is simple enough that you could pick it up and improve your app right now.
Once you get started, figuring out how to keep controllers and models skinny will not longer be a question.
There are a bunch of other hooks and patterns to the gem I recommend you check out (like chaining interactors)!

[Interactor Gem's GitHub repo][interactor-gh]

[interactor-gh]:   https://github.com/collectiveidea/interactor