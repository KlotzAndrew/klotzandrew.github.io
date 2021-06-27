---
layout: post
title: "Systemd Hellod World"
date: 2021-06-26 11:00:00 -0500
categories: linux, systemd
featured: images/hellod-startup.png
description: ""
---

Coming from a world of containers managed by Docker, systemd lets us do that for binaries on a host. We will be setting up a small webserver that is managed by systemd on our machine. Our little server will be called hellod.

We will be using go `net/http`, and creating 2 paths that are available on port `8080`:
`/` responds to a request
`/kill` exits the process, simulating something bad happening

```go
// main.go
package main

import (
  "fmt"
  "net/http"
  "os"
)

func main() {
  http.HandleFunc("/", func(w http.ResponseWriter, req *http.Request) {
    fmt.Println("got a request!")
    fmt.Fprintf(w, "Systemd %s!", "hello")
  })

  http.HandleFunc("/kill", func(w http.ResponseWriter, req *http.Request) {
    fmt.Println("killed by handler")
    os.Exit(1)
  })

  fmt.Println("starting up!")
  if err := http.ListenAndServe(":8080", nil); err != nil {
    panic(err)
  }
  fmt.Println("shutting down")
}
```

The systemd docs have an example service file we can mostly fill out:
Description - to tell us what this is
ExecStart - the command we will be starting, our go `hellod` binary
WantedBy - the target machine state for enabling start on boot, `multi-user.target` is when everything before the GUI has been started
Restart - restarts our binary when it stops
RestartSec - time interval between restarts

```ini
# hellod.service
[Unit]
Description=our hellod service

[Service]
ExecStart=/usr/local/bin/hellod
Restart=on-failure
RestartSec=100ms

[Install]
WantedBy=multi-user.target
```

Now we need a few commands to put the files in the right places, this is the Makefile I will be using:

```Makefile
# Makefile
setup:
  go build -o hellod ./...
  sudo mv hellod /usr/local/bin/hellod

  sudo cp hellod.service /etc/systemd/system/hellod.service
  sudo systemctl daemon-reload

logs:
  journalctl -u hellod.service --follow
```

## Seeing it in action

We need two shells, one for tailing our service's logs and the other for hitting our webserver.

### In one shell

First, we need to start by building our go webserver, putting the binary in a bin folder, and moving our hellod.service to where systemd expects to find it.

```bash
make setup
systemctl start hellod.service
make logs
# Jun 27 13:34:28 hellod-machine systemd[1]: Started hellod.
# Jun 27 13:34:28 hellod-machine hellod[41947]: starting up!
```

### In another shell

This shell will be for viewing the status of our webserver and hitting its endpoints. Assuming all goes well, systemctl will show us that our binary is active and running:

```bash
systemctl status hellod.service
# ● hellod.service - our hellod service
#      Loaded: loaded (/etc/systemd/system/hellod.service; disabled; vendor preset: enabled)
#      Active: active (running) since Sun 2021-06-27 13:34:28 EDT; 52s ago
#    Main PID: 41947 (hellod)
#       Tasks: 5 (limit: 38391)
#      Memory: 1.3M
#      CGroup: /system.slice/hellod.service
#              └─41947 /usr/local/bin/hellod

# Jun 27 13:34:28 hellod-machine systemd[1]: Started hellod.
# Jun 27 13:34:28 hellod-machine hellod[41947]: starting up!
```

Next, we want to hit it with a few web requests to make sure everything is working, using our `/kill` endpoint to make sure it also gets restarted correctly.

```bash
# the output here is from our journalctl log tail

curl 0.0.0.0:8080
# Jun 27 13:37:30 hellod-machine hellod[41947]: got a request!

curl 0.0.0.0:8080/kill
# Jun 27 13:56:51 hellod-machine hellod[54506]: killed by handler
# Jun 27 13:56:51 hellod-machine systemd[1]: hellod.service: Main process exited, code=exited, status=1/FAILURE
# Jun 27 13:56:51 hellod-machine systemd[1]: hellod.service: Failed with result 'exit-code'.
Jun 27 15:16:32 potato-v2 systemd[1]: hellod.service: Scheduled restart job, restart counter is at 1.
Jun 27 15:16:32 potato-v2 systemd[1]: Stopped our hellod service.
Jun 27 15:16:32 potato-v2 systemd[1]: Starting our hellod service...
Jun 27 15:16:32 potato-v2 systemd[1]: Started our hellod service.
Jun 27 15:16:32 potato-v2 hellod[71206]: starting up!
```

We can see our service is running and exited when we expected it to. Last is making sure it started back up again:

```bash
systemctl status hellod.service
● hellod.service - our hellod service
     Loaded: loaded (/etc/systemd/system/hellod.service; disabled; vendor preset: enabled)
     Active: active (running) since Sun 2021-06-27 15:16:32 EDT; 37s ago
    Process: 71205 ExecStartPre=/bin/echo startup begin (code=exited, status=0/SUCCESS)
    Process: 71208 ExecStartPost=/bin/echo startup end (code=exited, status=0/SUCCESS)
   Main PID: 71206 (hellod)
      Tasks: 6 (limit: 38391)
     Memory: 1.6M
     CGroup: /system.slice/hellod.service
             └─71206 /usr/local/bin/hellod

Jun 27 15:16:32 potato-v2 systemd[1]: Starting our hellod service...
Jun 27 15:16:32 potato-v2 echo[71205]: startup begin
Jun 27 15:16:32 potato-v2 echo[71208]: startup end
Jun 27 15:16:32 potato-v2 systemd[1]: Started our hellod service.
Jun 27 15:16:32 potato-v2 hellod[71206]: starting up!

curl 0.0.0.0:8080
# Jun 27 15:17:25 potato-v2 hellod[71206]: got a request!
```

The last piece of the puzzle is to enable this to start when the machine starts, or restarts. With `sudo systemctl start hellod.service` we now have a fully running systemd service, hellod!
