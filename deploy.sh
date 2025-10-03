#!/bin/bash

# PipLine Treasury System - Linux Deployment Script
# This script prepares and deploys the system to a Linux server

set -e  # Exit on any error

echo "🚀 Starting PipLine Treasury System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Check if Python 3.8+ is installed
python_version=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
if [[ $(echo "$python_version >= 3.8" | bc -l) -eq 0 ]]; then
    print_error "Python 3.8+ is required. Current version: $python_version"
    exit 1
fi

print_status "Python version check passed: $python_version"

# Check if required system packages are installed
print_status "Checking system dependencies..."

# Update package list
sudo apt-get update

# Install required system packages
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    supervisor \
    git \
    curl \
    wget \
    build-essential \
    libpq-dev \
    python3-dev

print_status "System dependencies installed successfully"

# Create application directory
APP_DIR="/opt/pipeline"
print_status "Creating application directory: $APP_DIR"

sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Create virtual environment
print_status "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p logs
mkdir -p instance
mkdir -p static/uploads
mkdir -p backups

# Set proper permissions
chmod 755 logs instance static/uploads backups
chmod 644 requirements.txt config.py app.py

# Create environment file from template
if [ ! -f .env ]; then
    print_warning "Creating .env file from template..."
    cp env.example .env
    print_warning "Please edit .env file with your actual configuration values"
    print_warning "Especially update database credentials and secret keys"
fi

# Create systemd service file
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/pipeline.service > /dev/null <<EOF
[Unit]
Description=PipLine Treasury System
After=network.target postgresql.service redis.service

[Service]
Type=exec
User=$USER
Group=$USER
WorkingDirectory=$APP_DIR
Environment=PATH=$APP_DIR/venv/bin
ExecStart=$APP_DIR/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/pipeline > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Static files
    location /static/ {
        alias $APP_DIR/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend files
    location / {
        alias $APP_DIR/frontend/dist/;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public";
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/pipeline /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Create log rotation configuration
print_status "Creating log rotation configuration..."
sudo tee /etc/logrotate.d/pipeline > /dev/null <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload pipeline
    endscript
}
EOF

# Create backup script
print_status "Creating backup script..."
tee $APP_DIR/backup.sh > /dev/null <<EOF
#!/bin/bash
# Backup script for PipLine Treasury System

BACKUP_DIR="$APP_DIR/backups"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pipeline_backup_\$DATE.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p \$BACKUP_DIR

# Create backup
tar -czf \$BACKUP_DIR/\$BACKUP_FILE \\
    --exclude='venv' \\
    --exclude='__pycache__' \\
    --exclude='*.pyc' \\
    --exclude='.git' \\
    --exclude='node_modules' \\
    --exclude='frontend/dist' \\
    --exclude='logs/*.log' \\
    .

# Database backup (if using PostgreSQL)
if [ -f .env ]; then
    source .env
    if [ ! -z "\$POSTGRES_DB" ] && [ ! -z "\$POSTGRES_USER" ]; then
        pg_dump -h \$POSTGRES_HOST -U \$POSTGRES_USER \$POSTGRES_DB > \$BACKUP_DIR/database_backup_\$DATE.sql
    fi
fi

# Clean old backups (keep last 30 days)
find \$BACKUP_DIR -name "pipeline_backup_*.tar.gz" -mtime +30 -delete
find \$BACKUP_DIR -name "database_backup_*.sql" -mtime +30 -delete

echo "Backup completed: \$BACKUP_FILE"
EOF

chmod +x $APP_DIR/backup.sh

# Create cron job for backups
print_status "Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

# Build frontend
print_status "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Set up database
print_status "Setting up database..."
source venv/bin/activate

# Initialize database (this will create tables)
python -c "
from app import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
    print('Database tables created successfully')
"

# Reload systemd and start services
print_status "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable pipeline
sudo systemctl start pipeline
sudo systemctl enable nginx
sudo systemctl restart nginx
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Check service status
print_status "Checking service status..."
sudo systemctl status pipeline --no-pager
sudo systemctl status nginx --no-pager
sudo systemctl status postgresql --no-pager
sudo systemctl status redis-server --no-pager

print_status "Deployment completed successfully!"
print_warning "Important next steps:"
print_warning "1. Edit $APP_DIR/.env with your actual configuration"
print_warning "2. Update Nginx configuration with your domain name"
print_warning "3. Set up SSL certificate (Let's Encrypt recommended)"
print_warning "4. Configure firewall rules"
print_warning "5. Test the application at http://your-domain.com"

echo ""
print_status "Useful commands:"
echo "  Check logs: sudo journalctl -u pipeline -f"
echo "  Restart app: sudo systemctl restart pipeline"
echo "  Check status: sudo systemctl status pipeline"
echo "  Manual backup: $APP_DIR/backup.sh"
