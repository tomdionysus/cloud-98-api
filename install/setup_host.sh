#/bin/bash

# Apt
apt update
apt upgrade -y 
apt install -y nodejs npm ntp wget python2-minimal python3-pip
pip install awscli --upgrade

## Ruby
wget -O ruby-install-0.8.3.tar.gz https://github.com/postmodern/ruby-install/archive/v0.8.3.tar.gz
tar -xzvf ruby-install-0.8.3.tar.gz
cd ruby-install-0.8.3/
sudo make install
ruby-install --system ruby 2.7.0
cd ..
rm -rf ruby-install-0.8.3

## CodeDeploy
export AWS_REGION=$(curl http://169.254.169.254/latest/meta-data/placement/region)
wget https://aws-codedeploy-$AWS_REGION.s3.amazonaws.com/latest/install
chmod +x ./install
./install auto
rm ./install
service codedeploy-agent start

# App User
adduser --disabled-password --gecos "" api
mkdir /home/api/app
mkdir /home/api/.ssh
mkdir /var/log/api

# App
aws s3 cp s3://cloud98-deploy/api/api.tgz /home/api/ --region=ap-southeast-2
aws s3 cp s3://cloud98-config/api/api.env /home/api/app/ --region=ap-southeast-2
tar -xzf /home/api/api.tgz -C /home/api/app
mv /home/api/app/codedeploy/* /home/api/app/

# Permissions
chown -R api:api /home/api/app
chown -R api:api /home/api/.ssh
chmod -R 700 /home/api/.ssh
chmod -R 700 /var/log/api
chown -R api:api /var/log/api