FROM golang:latest

WORKDIR /go/src/github.com/klotzandrew/klotzandrew.io

COPY .git .
COPY . .

RUN GIT_SHA=$(git rev-parse --short HEAD) && \
  go build -ldflags "-X main.GitSHA=$GIT_SHA" -o main

CMD ["./main"]
