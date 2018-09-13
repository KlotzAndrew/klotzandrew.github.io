---
layout: post
title: "Container from scratch"
date: 2018-09-12 17:20:00 -0500
categories: docker, containers
---

We are doing to be building a docker from scratch, and I do not mean a Dockerfile
from scratch, I litterally mean the container. Getting there not nearly as crazy as I thought
it would be and involves using namespaces, which are the building blocks to making an
isolated environment. Having seen some really cool examples of building a container from scratch, I
thought would run through it myself to get a better understanding. Some great
resources on this that I took a look at are from
<a href="https://www.youtube.com/watch?v=Utf-A4rODH8">Liz Rice</a> and
<a href="http://bit.ly/1nDqpDI">Julian Friedman</a>.

Before getting into the code, namespaces are tools to seperate things on a system.
There are 7 linux namespaces and we are going to use 3 of them here: Mount, Process ID, and UTS

- Mount: Isolated filesystem, not able to modify files on our hosts filesystem
- Pid: Process will appear as a familiar Pid 1, and not be able to see the hosts Pids
- UTS: Container will have its own hostname, and not be able to modify the hosts hostname

There are 4 others:

- Network
- Interprocess Communication
- User ID
- Contrl Group

You can read more about here: https://en.wikipedia.org/wiki/Linux_namespaces

Now to get start started on the code! We are going to need a ubuntu machine and a spare filesystem.
For this demo I'm going to use a DigitalOcean droplet and cool container tool (lxc) to create
us an extra filesystem.

The first thing that we will need is a container that can run a command. So we can start off
with a golang program that takes input simmilar to `docker run /bin/bash`, but ours will
look like `go run main.go run bash`

# use golang to run a command
```golang
package main

import (
    "fmt"
    "os"
    "os/exec"
)

func main() {
    switch os.Args[1] {
        case "run":
            run()
        default:
            panic("invalid command!")
    }
}

func run() {
    fmt.Printf("running %v\n", os.Args[2:])

    cmd := exec.Command(os.Args[2], os.Args[3:]...)
    cmd.Stdin = os.Stdin
    cmd.Stdout = os.Stdout
    cmd.stderr = os.Stderr

    must(cmd.Run())
}

func must(err err) {
    if err !=nil {
        panic(err)
    }
}
```

The above code takes arguments starting with `run` and passes them to `exec.Command`, adding in stdin/stdout/stderr.
So far this looks the same as any program
that is making a call out to the system (although with arbitrarty user input).

<img src="/assets/cfs-exec.png" width="200">

Running the above with `go run main.go run /bin/bash`, we have a container running a shell - but it can see everything.
Although it cannot see my paused vim running from the previous shell. Exiting out and we can again

The next step is to add in some namespaces, here we can use `cmd.SysProcAttr` to
tell the command to use its own namespaces

# stargin with namespaces
```golang
cmd.SysProcAttr = &syscall.SysProcAttr{
    Cloneflags: syscall.CLONE_NEWUTS | syscall.CLONE_NEWPID
}
```

Including `syscall.CLONE_NEWUTS` is for the UTS namespace, and `syscall.CLONE_NEWPID` is
for the PID namespace. Adding this alone won't give us the namespaces in our /bin/bash
invocation because we need to run our command from the forked exec. So what
we will do is run a command that forks our current process with the namesapces, and in
that command we run our actual command as a child:

```golang
func main() {
	switch os.Args[1] {
	case "run":
		run()
	case "child":
		child()
	default:
		panic("invalid command!")
	}
}

func run() {
	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS | syscall.CLONE_NEWPID,
	}

	must(cmd.Run())
}

func child() {
	fmt.Printf("running %v as PID %d\n", os.Args[2:], os.Getpid())

	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	must(cmd.Run())
}
```
Running again with `go run main.go /bin/bash` give us the ability to isolate
our hostname, beacuse of: `syscall.CLONE_NEWUTS`

<img src="/assets/cfs-hostname.png" width="200">

Our PID will not actaully show PID 1 yet even though we have `syscall.CLONE_NEWPID`, because ps also looks
at `ls /proc` for running processes. We will be able to get to this while doing the next step.

Next up is the filesystem namespace.
What we will have to do is, in our child process, change our root directory and current diretory to
the new filesystem before running the command. If you do not have an extra filessytem
sitting around, you can use cool container tool lxc to create one:

```bash
apt-get install lxc
sudo lxc-create -t ubuntu -n container
```

The above command will create a ubuntu filesystem, in the
/var/lib/lxc/container/rootfs directory.

Otherwise, this is what we need to do is add:
```golang
must(syscall.Chroot("mynewfs"))
must(os.Chdir("/"))
```

to our child function:
```golang
func child () {
    fmt.Printf("running %v as PID %d\n", os.Args[2:], os.Getpid())

    cmd := exec.Command(os.Args[2], os.Args[3:]...)
    cmd.Stdin = os.Stdin
    cmd.Stdout = os.Stdout
    cmd.stderr = os.Stderr

    must(syscall.Chroot("/var/lib/lxc/container/mynewfs"))
    must(os.Chdir("/"))
    must(syscall.Mount("proc", "proc", "proc", 0, ""))

    must(cmd.Run())
}
```

We also need to call `must(syscall.Mount("proc", "proc", "proc", 0, ""))`, this
is due to proc needing to be mounted in a new filesystem (which it is in our case).
An alternative would be to run ``mount -t proc proc /proc`` from the filesystem from a shell, but regardless
it needs be run

Now if we hop into out container with `go run main.go run /bin/bash`, we have what
looks like a container!

Running `ps` will show us as process 1

Running `hostname` will show our containers hostname

Running `ls` will show our containers filesystem

<img src="/assets/cfs-container.png" width="600">

While there is much more than this to get docker working as well as it does, this
covers the basics of getting our own namespaces to execute inside! If you want to try out more,
there are a few namespaces we did not go through, including cgroups - which are
namespaces that do the really cool part of controlling resources like cpu and memory allocation.

The full code to get everything running:

```golang
package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func main() {
	switch os.Args[1] {
	case "run":
		run()
	case "child":
		child()
	default:
		panic("invalid command!")
	}
}

func run() {
	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS | syscall.CLONE_NEWPID,
	}

	must(cmd.Run())
}

func child() {
	fmt.Printf("running %v as PID %d\n", os.Args[2:], os.Getpid())

	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	must(syscall.Chroot("/var/lib/lxc/container/rootfs"))
	must(os.Chdir("/"))
	must(syscall.Mount("proc", "proc", "proc", 0, ""))

	must(cmd.Run())
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
```
