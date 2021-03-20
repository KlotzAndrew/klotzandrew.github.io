---
layout: post
title: "Making your first kernel module"
date: 2021-03-20 11:00:00 -0500
categories: keyboards
featured: images/linux.png
description: ""
---


Linux kernel modules are pieces of code that can be loaded and unloaded into the kernel without rebooting the system. Running code inside kernel space instead of user space is similar to what we can do with eBPF ([intro to BPF here][BPF]). Although eBFP is newer and provides safety guarantees, there are more constraints on what you can write compared to a kernel module.

If you want to skip to the full source code, it is on [GitHub here][code].

## A working setup

An error in our kernel module can crash our system, so my first piece of advice is don't test your kernel module in the kernel of the host system you are developing on! My quickest way to get set up is to use Vagrant, Docker will not work here because it shares the same kernel as the host. On a Ubuntu host machine this should get Vagrant running if you do not already have it:

```bash
apt install virtualbox

curl -SL --progress-bar https://releases.hashicorp.com/vagrant/2.2.14/vagrant_2.2.14_linux_amd64.zip --output /tmp/vagrant.zip
unzip -o /tmp/vagrant.zip -d /usr/local/bin
rm  /tmp/vagrant.zip

# libarchive-tools not default in ubuntu 20.04
apt-get install libarchive-tools

vagrant --version

vagrant plugin install vagrant-vbguest
```

With a barebones Vagrantfile to mount our working directory in a virtualbox:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.box = "debian/buster64"
  config.vm.synced_folder ".", "/home/vagrant/src"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
  end

  config.vm.provision "shell", inline: <<-SHELL
    mkdir -p /home/vagrant/src
  SHELL
end
```

We should be able to run `vagrant up && vagrant ssh`, then `cd src` to drop us into a safe shell with our working directory to run kernel modules in. Before we get started you will need to install the kernel headers for your kernel version, using `apt-get install build-essential linux-headers-`uname -r``

## The module

There are only a few pieces to the kernel module API we need for a fully running hello world.

### 1) linux headers
Add these at the top of the file, required for compiling:
```c
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
```

### 2) licence
Add a licence for the module
```c
MODULE_LICENSE("GPL");
```
### 3) the functions

There are two function signatures we need, an init function that runs when the module is loaded and an exit function that runs when the module is removed:
```c
static int hello_init(void) { return 0; }
static void hello_exit(void) {}
```

We want a way to verify this module is actually running, so we are going to add a print line. The kernel module does not have access to `print`, so it has its own `printk`, that takes a kernel log level with a message. Let's add in hello and goodbye to give us:

```c
static int hello_init(void)
{
  printk(KERN_ALERT "Hello world\n");
  return 0;
}

static void hello_exit(void)
{
  printk(KERN_ALERT "Goodbye world\n");
}
```

### 4) register the functions

Using our headers we need to register our functions:
```c
module_init(hello_init);
module_exit(hello_exit);
```
And this takes us to a fully working hello.c module file

```c
// hello.c
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Andrew Klotz");
MODULE_DESCRIPTION("A Simple Hello World Module");

static int hello_init(void)
{
  printk(KERN_ALERT "Hello world\n");
  return 0;
}

static void hello_exit(void)
{
  printk(KERN_ALERT "Goodbye world\n");
}

module_init(hello_init);
module_exit(hello_exit);
```

## Compiling

The next part is to compile our modules with a Makefile:

```Makefile
obj-m := hello.o

all:
  make -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules

clean:
  make -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean

.PHONY: setup
setup:
  apt-get install build-essential linux-headers-`uname -r`
```

What is interesting here is if we look into `cat /lib/modules/$(uname -r)/build`, we will find a Linux Makefile that is doing the heavy lifting for us. What we need to do is call out to it with some commands, our current directory, and include our .c files in obj-m.

## Running

Now with everything setup:
1. Run `make all`, which should output a hello.ko file
1. Install our module with `sudo /sbin/insmod hello.ko`
1. Remove our module with `sudo /sbin/rmmod hello`
1. Verify out module logged correctly with `sudo tail /var/log/kern.log`

If everything worked correctly you should see something like this:

```
Mar 20 20:48:21 buster kernel: [   93.240717] Hello world
Mar 20 20:48:27 buster kernel: [  100.023905] Goodbye world
```

Congrats, you have a working kernel module! Don't forget to run `vagrant destroy` to clean up after yourself. The [full code is on GitHub][code] if you want to take a look.


[BPF]: https://klotzandrew.com/blog/bpf-intro-syscall-counting
[code]: https://github.com/KlotzAndrew/kernel-modules
