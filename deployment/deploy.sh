#!/bin/bash

GC='\033[0;32m'
NC='\033[0m'

echo -e "${GC}#### STOPPING SERVERS ############################################${NC}"
sudo supervisorctl stop guni:gunicorn
sudo service nginx stop

echo
echo -e "${GC}#### GIT PULL ####################################################${NC}"
cd /home/ubuntu/poseidon
git reset --hard HEAD
git checkout origin/master
git pull origin master

echo
echo -e "${GC}#### PIPENV, MIGRATIONS AND STATIC ##################################${NC}"
cd /home/ubuntu/poseidon/webapp
pipenv install
pipenv run ./manage.py migrate

echo
echo -e "${GC}#### NPM #########################################################${NC}"
cd /home/ubuntu/poseidon/webapp/frontend
npm install
npm run build
cd /home/ubuntu/poseidon/webapp
pipenv run ./manage.py collectstatic --noinput

echo
echo -e "${GC}#### STARTING SERVERS ############################################${NC}"
cd /home/ubuntu/
sudo supervisorctl start guni:gunicorn
sudo service nginx start

echo
echo -e "${GC}#### DONE!! ######################################################${NC}"
