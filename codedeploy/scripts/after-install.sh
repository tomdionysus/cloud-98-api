#!/bin/sh
export ENV_NAME=`cat /home/api/branch.txt`
export S3_CONFIG_BUCKET=cloud98-config/api

## ENV Config
aws s3 cp s3://$S3_CONFIG_BUCKET/api.env /home/api --region=ap-southeast-2
rm -rf /home/api/app
mkdir /home/api/app
tar xzf /home/api/app.tgz -C /home/api/app
cd /home/api/app
npm install
chown -R api:api /home/api/app

## Systemd service
aws s3 cp s3://$S3_CONFIG_BUCKET/api.service /lib/systemd/system/api.service --region=ap-southeast-2
systemctl daemon-reload
systemctl enable api