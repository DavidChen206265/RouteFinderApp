# run ./deploy.sh under the RouteFinderApp's root path
#!/bin/bash
# RouteFinderApp Deploy Script

cd ~/projects/RouteFinderApp || exit

git pull

sudo docker compose up -d --force-recreate

sudo docker image prune -f

echo "Depolyment completed."