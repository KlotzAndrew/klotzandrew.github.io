#!/bin/bash

sha=$(git rev-parse --short HEAD)
go build -ldflags "-X main.GitSHA=$sha" -o main
