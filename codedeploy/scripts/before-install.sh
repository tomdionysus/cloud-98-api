#!/bin/sh
yum update -y 
yum install amazon-cloudwatch-agent -y
rm -rf /home/api/branch.txt
rm -rf /home/api/api.tgz
rm -rf /home/api/app/*
