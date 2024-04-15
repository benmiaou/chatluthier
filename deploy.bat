ssh -i chatluthier.pem ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com "rm -rf /home/ec2-user/chatluthier/assets/*"
scp -i chatluthier.pem -r public ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:/home/ec2-user/chatluthier
scp -i chatluthier.pem -r assets ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:/home/ec2-user/chatluthier
scp -i chatluthier.pem server.js ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:/home/ec2-user/chatluthier
scp -i chatluthier.pem manyfest.json ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:/home/ec2-user/chatluthier
scp -i chatluthier.pem package-lock.json ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:/home/ec2-user/chatluthier
scp -i chatluthier.pem package.json ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:/home/ec2-user/chatluthier
scp -i chatluthier.pem service-worker.js ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:/home/ec2-user/chatluthier
ssh -i chatluthier.pem ec2-user@ec2-13-60-6-122.eu-north-1.compute.amazonaws.com "cd /home/ec2-user/chatluthier && find . -type f \( -name '*.js' -o -name '*.html' \) -exec sed -i 's|http://127.0.0.1:3000|http://ec2-13-60-6-122.eu-north-1.compute.amazonaws.com:3000|g' {} \; && pm2 restart all"
