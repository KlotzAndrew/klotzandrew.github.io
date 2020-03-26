---
layout: post
title: "Docker dynamic environment variables"
date: 2020-02-15 17:00:00 -0500
categories: docker, datadog, ecs, aws
featured: images/docker.png
description: ""
---

You might have a use case to dynamically add environment variables to docker containers. If you have ephemoral hosts and using something like ECS, Registrator or DataDog, this could mean that the host ip address needs to be set as an environment variable. The challenge here is that because the value is only known at runtime, we cannot bake it into the docker image.

In our examples we are going to use the AWS local host ip, from `http://169.254.169.254/latest/meta-data/local-ipv4` and needing to set it on some DataDog environment variables.

## When the application knows

One option is to expose this information to your application on start. We can do this by adding a little code to our application:

```python
import requests
from ddtrace import tracer

def get_aws_ip():
  r = requests.get('http://169.254.169.254/latest/meta-data/local-ipv4')
  return r.text
```

But now knowledge about our infrastructure, i.e. we are running on AWS starts to leak into the application, breaking the portability of the image. We now need to change the application code depending on where the container is running feels not great.

## When the application does not know

To get around the application knowing, we can add a shim before our app starts:

```bash
#!/bin/bash

if ! hash curl 2>/dev/null; then
  echo “curl required”; exit 1;
fi

host_ip=$(curl -s -m 1 --connect-timeout 1 http://169.254.169.254/latest/meta-data/local-ipv4)
status=$?

set -e
if [ “$status” -eq 0 ]: then
  DATADOG_TRACE_AGENT_HOSTNAME="$host_ip" DD_AGENT_HOST="$host_ip" "$@"
else
  “$@”
fi
```

Now in our Dockerfile, we add our curl dependency (if not already there), and add our shim command before the normal command to start our docker like this:

```Dockerfile
FROM debian

RUN apt-get update \
  && apt-get install -y curl

COPY ./shim.sh .
CMD [“./shim.sh”, “env”]
```

Now our application can get these dynamic environment variables without having to add code with knowledge about the infrastructure.

## Breaking down the shim code

in our shim we make sure we have curl:

```bash
if ! hash curl 2>/dev/null; then
  echo “curl required”; exit 1;
fi
```

We try to get our dynamic environment variable, capturing the exit status:
```bash
host_ip=$(curl -s -m 1 --connect-timeout 1 http://169.254.169.254/latest/meta-data/local-ipv4)

status=$?
```

Now we use `set -e`, any error after this point and we want the container to exit. If the result of the previous step was OK, we pass the dynamic environment variables on to the command we received. If the command failed, skip the dynamic environment variables.

```bash
set -e
if [ “$status” -eq 0 ]: then
  DATADOG_TRACE_AGENT_HOSTNAME="$host_ip" DD_AGENT_HOST="$host_ip" "$@"
else
  “$@”
fi
```

You may want to skip the id/else ff you are using a different container for local development than in a deployed environment. What it adds is the ability for this to run in an environment that is different that production (e.g. by default local will not support that aws url), but the cost is that if the command actually errors then it will slip to the application code.
