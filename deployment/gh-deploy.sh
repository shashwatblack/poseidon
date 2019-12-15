#!/bin/bash

GC='\033[0;32m'
NC='\033[0m'

echo -e "${GC}#### DEPLOYING TO GITHUB.IO #################################################${NC}"
current_path=$(pwd)
root=$(git rev-parse --show-toplevel)
git_head=$(git rev-parse HEAD)

echo -e "${GC}#### CREATING GH_PAGES DIRECTORY ############################################${NC}"
cd $root
dir="gh_pages"
if [ -f $dir ] ; then
    rm -rf $dir
fi
mkdir $dir
cd $dir

echo -e "${GC}#### CREATING INDEX.HTML ####################################################${NC}"
wget localhost:8000
sed -i 's/\/static\/landing/\/poseidon\/landing/g' index.html
sed -i 's/\/app/\/poseidon\/app/g' index.html
cd $root
cp -r webapp/frontend/static/landing $dir

echo -e "${GC}#### BUILDING FRONTEND ######################################################${NC}"
cd webapp/frontend
ng build --prod=true --base-href '/poseidon/app/'
cd $root
cp -r webapp/frontend/static/app $dir

echo -e "${GC}#### PUSHING BRANCH TO REMOTE ###############################################${NC}"
git add $dir
git commit -m "gh_pages $(date)"
git push origin :gh-pages
git subtree push --prefix $dir origin gh-pages

echo -e "${GC}#### RESETTING GIT ##########################################################${NC}"
git reset --hard $git_head
rm -rf $dir
cd $current_path

echo -e "${GC}#### ALL DONE ###############################################################${NC}"
