# Enable package managers to access packages over https
sudo apt-get install apt-transport-https

# Add the correct source lists to apt
sudo mv /home/vagrant/onion/tor-sources.list /etc/apt/sources.list.d/tor-sources.list

# Install Tor
# TODO: Make output more quiet
curl -s https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc | sudo gpg --import
sudo gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | sudo apt-key add -

sudo apt-get update
sudo apt-get -y install tor deb.torproject.org-keyring

# Install nginx
sudo apt-get -y install nginx

# Copy nginx configuration to the correct spot
sudo cp /home/vagrant/nginx.conf /etc/nginx/sites-available/nginx.conf
sudo chmod 644 /etc/nginx/sites-available/nginx.conf
sudo ln -s /etc/nginx/sites-available/nginx.conf /etc/nginx/sites-enabled/nginx.conf

# Remove the default nginx configuration
sudo rm /etc/nginx/sites-enabled/default

# Start nginx
# Maybe use systemd instead!
echo "Starting nginx server..."
sudo service nginx start -c /etc/nginx/sites-enabled/nginx.conf
sudo service nginx status
