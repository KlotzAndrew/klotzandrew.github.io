---
layout: post
title: "Deploy an EC2 to run Docker with Terraform"
date: 2020-04-18 17:00:00 -0500
categories: docker, terraform, aws
featured: images/terraform.jpeg
description: ""
---

So you have a Docker container running locally and you want to run it in the cloud. Terraform makes it easy to quickly set up the cloud components for us to use.

What want to create:
 - a Docker repository to push images to
 - an ec2 instance that can pull and run those Docker images
 - a database for the ec2/containers to connect to

Prerequisites:
 - an AWS account
 - a ssh key-pair in AWS
 - AWS access tokens set in the environment as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

There are a lot of individual pieces to put together, by the end we should have everything in one place to copy/paste and use. The resources here should be around the free tier.

### Setup

Starting with some Terraform housekeepers, we need to declare which cloud provider we are using, the terraform version, the VPC we want to use and the subnets.

```hcl
provider "aws" {
  region = "us-east-2"
}

terraform {
  required_version = ">= 0.12.0"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnet_ids" "all" {
  vpc_id = data.aws_vpc.default.id
}
```

There are a number of shortcuts taken like using the default VPC/hardcoding database passwords, that you would likely want to change if this was a full-fledged production setup.

### ECR

We need a repo to store containers, the plan is our server only runs containers. So we build these containers in CI, push to the repo and have our EC2 only run containers.

```hcl
resource "aws_ecr_repository" "hello-world" {
  name                 = "hello-world"
  image_tag_mutability = "MUTABLE"

  tags = {
    project = "hello-world"
  }
}
```

### EC2

For our EC2 instance we want a few features:
 - allows HTTP/HTTPS/Ping traffic in from anywhere
 - allows ssh access from only our IP
 - uses our existing key-pair
 - run docker containers

#### EC2 Profile

For our ec2 instance to pull containers from ECR we need an IAM profile for granting access to ECR, and later attach this profile to the EC2 instance.

```hcl
resource "aws_iam_role" "ec2_role_hello_world" {
  name = "ec2_role_hello_world"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow"
    }
  ]
}
EOF

  tags = {
    project = "hello-world"
  }
}

resource "aws_iam_instance_profile" "ec2_profile_hello_world" {
  name = "ec2_profile_hello_world"
  role = aws_iam_role.ec2_role_hello_world.name
}

resource "aws_iam_role_policy" "ec2_policy" {
  name = "ec2_policy"
  role = aws_iam_role.ec2_role_hello_world.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}
```

For more secure permissions we would lock this down to just the ECR repository we created, instead of `"Resource": "*"`.

#### EC2 Security groups

We need 2 groups, the first allows all HTTP/HTTPS traffic, as well as ICMP for pinging. The second allows ssh access. We are guarding access with an ssh key, but it also helps to lock the port down from external access as well. You are going to have to replace 127.0.0.1 with your actual IP.

```hcl
module "dev_ssh_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "ec2_sg"
  description = "Security group for ec2_sg"
  vpc_id      = data.aws_vpc.default.id

  ingress_cidr_blocks = ["127.0.0.1/32"]
  ingress_rules       = ["ssh-tcp"]
}

module "ec2_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "ec2_sg"
  description = "Security group for ec2_sg"
  vpc_id      = data.aws_vpc.default.id

  ingress_cidr_blocks = ["0.0.0.0/0"]
  ingress_rules       = ["http-80-tcp", "https-443-tcp", "all-icmp"]
  egress_rules        = ["all-all"]
}
```

#### The instance

We need an AMI ID for our instance. AMI IDs change per region and over time, our filters will just look for the latest from amazon. Afterward, we wire up our EC2 to the security groups and profile we created. This container needs to run docker containers, so we add a user_data script that installs both docker and docker-compose.

This assumes you already have a key-pair in AWS, if not head to the AWS console and create one (or even better, add it to terraform).

```hcl
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-ebs"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.micro"

  root_block_device {
    volume_size = 8
  }

  vpc_security_group_ids = [
    module.ec2_sg.this_security_group_id,
    module.dev_ssh_sg.this_security_group_id
  ]
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  tags = {
    project = "hello-world"
  }

  key_name                = "hello-world-key"
  monitoring              = true
  disable_api_termination = false
  ebs_optimized           = true
}
```

### Database

#### Security grups

Our database is going to have a single security group that only allows inbound database traffic from our EC2 instance.

```hcl
module "db_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "db_sg"
  description = "Security group for db_sg"
  vpc_id      = data.aws_vpc.default.id

  ingress_with_source_security_group_id = [
    {
      description              = "db access"
      rule                     = "postgresql-tcp"
      source_security_group_id = module.ec2_sg.this_security_group_id
    }
  ]
  egress_rules = ["all-all"]
}
```

#### RDS

Wire the database up with the VPC, Subnets, security group. I won't get into Postgres parameter groups here, but using SSD you most likely want a random_page_cost lower than the default value of 4


```hcl
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 2.0"

  identifier = "hello-world-db-postgres"

  engine                       = "postgres"
  engine_version               = "12.2"
  instance_class               = "db.t3.micro"
  allocated_storage            = 30
  storage_encrypted            = true
  performance_insights_enabled = true

  name     = "postgres"
  username = "helloworld"
  password = "verysecretpassword"
  port     = "5432"

  iam_database_authentication_enabled = true

  vpc_security_group_ids = [module.db_sg.this_security_group_id]

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  backup_retention_period = 0

  tags = {
    project = "hello-world"
  }

  subnet_ids = data.aws_subnet_ids.all.ids

  family                    = "postgres12"
  major_engine_version      = "12"
  final_snapshot_identifier = "hello-world-db-postgres"
  deletion_protection       = false

  parameters = [
    {
      name  = "random_page_cost"
      value = "1.1"
    }
  ]
}
```

Now at the end of this, we have a full main.tf file that will let us ssh into an ec2 host and run docker containers that can talk to a database.

This is the full file:
```hcl
# main.tf
provider "aws" {
  region = "us-east-2"
}

terraform {
  required_version = ">= 0.12.0"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnet_ids" "all" {
  vpc_id = data.aws_vpc.default.id
}

### ECR

resource "aws_ecr_repository" "hello-world" {
  name                 = "hello-world"
  image_tag_mutability = "MUTABLE"

  tags = {
    project = "hello-world"
  }
}

### EC2

module "dev_ssh_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "ec2_sg"
  description = "Security group for ec2_sg"
  vpc_id      = data.aws_vpc.default.id

  ingress_cidr_blocks = ["205.175.212.203/32"]
  ingress_rules       = ["ssh-tcp"]
}

module "ec2_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "ec2_sg"
  description = "Security group for ec2_sg"
  vpc_id      = data.aws_vpc.default.id

  ingress_cidr_blocks = ["0.0.0.0/0"]
  ingress_rules       = ["http-80-tcp", "https-443-tcp", "all-icmp"]
  egress_rules        = ["all-all"]
}

data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-ebs"]
  }
}

resource "aws_iam_role" "ec2_role_hello_world" {
  name = "ec2_role_hello_world"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF

  tags = {
    project = "hello-world"
  }
}

resource "aws_iam_instance_profile" "ec2_profile_hello_world" {
  name = "ec2_profile_hello_world"
  role = aws_iam_role.ec2_role_hello_world.name
}

resource "aws_iam_role_policy" "ec2_policy" {
  name = "ec2_policy"
  role = aws_iam_role.ec2_role_hello_world.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.micro"

  root_block_device {
    volume_size = 8
  }

  user_data = <<-EOF
    #!/bin/bash
    set -ex
    sudo yum update -y
    sudo amazon-linux-extras install docker -y
    sudo service docker start
    sudo usermod -a -G docker ec2-user
    sudo curl -L https://github.com/docker/compose/releases/download/1.25.4/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  EOF

  vpc_security_group_ids = [
    module.ec2_sg.this_security_group_id,
    module.dev_ssh_sg.this_security_group_id
  ]
  iam_instance_profile = aws_iam_instance_profile.ec2_profile_hello_world.name

  tags = {
    project = "hello-world"
  }

  monitoring              = true
  disable_api_termination = false
  ebs_optimized           = true
}


### DATABASE

module "db_sg" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "db_sg"
  description = "Security group for db_sg"
  vpc_id      = data.aws_vpc.default.id

  ingress_with_source_security_group_id = [
    {
      description              = "db access"
      rule                     = "postgresql-tcp"
      source_security_group_id = module.ec2_sg.this_security_group_id
    }
  ]
  egress_rules = ["all-all"]
}

module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 2.0"

  identifier = "hello-world-db-postgres"

  engine                       = "postgres"
  engine_version               = "12.2"
  instance_class               = "db.t3.micro"
  allocated_storage            = 30
  storage_encrypted            = true
  performance_insights_enabled = true

  name     = "postgres"
  username = "helloworld"
  password = "verysecretpassword"
  port     = "5432"

  iam_database_authentication_enabled = true

  vpc_security_group_ids = [module.db_sg.this_security_group_id]

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  backup_retention_period = 0

  tags = {
    project = "hello-world"
  }

  subnet_ids = data.aws_subnet_ids.all.ids

  family                    = "postgres12"
  major_engine_version      = "12"
  final_snapshot_identifier = "hello-world-db-postgres"
  deletion_protection       = false

  parameters = [
    {
      name  = "random_page_cost"
      value = "1.1"
    }
  ]
}
```

Hope this helps, let me know if there is anything you would add for your setup!
