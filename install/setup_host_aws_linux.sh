#/bin/sh

## Node
yum update
yum install -y python3 gcc gcc-c++ make python3-pip ruby ntp wget amazon-cloudwatch-agent 
wget https://nodejs.org/dist/v16.15.0/node-v16.15.0.tar.gz
tar -xzf node-v16.15.0.tar.gz 
cd node-v16.15.0/
./configure
make install
cd ..
rm -rf node-v16.15.0 node-v16.15.0.tar.gz 
yum remove -y gcc-c++ make ruby

## CodeDeploy
export AWS_REGION=$(curl http://169.254.169.254/latest/meta-data/placement/region)
wget https://aws-codedeploy-$AWS_REGION.s3.amazonaws.com/latest/install
chmod +x ./install
./install auto
rm -rf ./install
service codedeploy-agent start

# App User
adduser api
mkdir /home/api/app
mkdir /home/api/.ssh

# Permissions
chown -R api:api /home/api/app
chown -R api:api /home/api/.ssh
chmod -R 600 /home/api/.ssh
