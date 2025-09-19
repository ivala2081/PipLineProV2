#!/bin/bash

# Database Recovery System Installation Script for PipLinePro
# This script sets up the database recovery system on Linux servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    print_error "Please run this script from the PipLinePro root directory"
    exit 1
fi

print_status "Installing Database Recovery System for PipLinePro"
echo "=================================================="

# Check if Python virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    print_warning "Virtual environment not detected. Activating .venv..."
    if [ -d ".venv" ]; then
        source .venv/bin/activate
        print_success "Virtual environment activated"
    else
        print_error "Virtual environment not found. Please create and activate it first."
        print_status "Run: python -m venv .venv && source .venv/bin/activate"
        exit 1
    fi
fi

# Make recovery scripts executable
print_status "Making recovery scripts executable..."
chmod +x scripts/database_recovery.py
chmod +x scripts/recover_database.sh
chmod +x scripts/test_database_recovery.py
print_success "Recovery scripts are now executable"

# Create backups directory if it doesn't exist
print_status "Creating backups directory..."
mkdir -p backups
print_success "Backups directory created"

# Test the recovery system
print_status "Testing database recovery system..."
if python scripts/database_recovery.py --action check > /dev/null 2>&1; then
    print_success "Database recovery system is working correctly"
else
    print_warning "Database recovery system test failed, but installation completed"
fi

# Create a systemd service file for automatic database maintenance (optional)
print_status "Creating systemd service template for database maintenance..."
cat > scripts/pipeline-db-maintenance.service << EOF
[Unit]
Description=PipLinePro Database Maintenance Service
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/.venv/bin
ExecStart=$(pwd)/.venv/bin/python -c "from app.services.database_prevention_service import database_prevention_service; from app import create_app; app = create_app(); app.app_context().push(); database_prevention_service.perform_maintenance()"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

print_success "Systemd service template created at scripts/pipeline-db-maintenance.service"

# Create a cron job template for regular maintenance
print_status "Creating cron job template for database maintenance..."
cat > scripts/db-maintenance-cron << EOF
# PipLinePro Database Maintenance Cron Job
# Run daily at 2 AM
0 2 * * * cd $(pwd) && source .venv/bin/activate && python -c "from app.services.database_prevention_service import database_prevention_service; from app import create_app; app = create_app(); app.app_context().push(); database_prevention_service.perform_maintenance()" >> logs/db-maintenance.log 2>&1

# Weekly database backup at 3 AM on Sundays
0 3 * * 0 cd $(pwd) && source .venv/bin/activate && python scripts/database_recovery.py --action backup >> logs/db-backup.log 2>&1
EOF

print_success "Cron job template created at scripts/db-maintenance-cron"

# Create a quick recovery script
print_status "Creating quick recovery script..."
cat > scripts/quick_recovery.sh << 'EOF'
#!/bin/bash
# Quick Database Recovery Script for PipLinePro

echo "🚀 PipLinePro Quick Database Recovery"
echo "====================================="

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Run database check
echo "Checking database integrity..."
python scripts/database_recovery.py --action check

# Ask if user wants to run recovery
echo ""
read -p "Do you want to run database recovery? (y/N): " choice
if [[ $choice =~ ^[Yy]$ ]]; then
    python scripts/database_recovery.py --action repair --force
fi

echo "Recovery process completed."
EOF

chmod +x scripts/quick_recovery.sh
print_success "Quick recovery script created at scripts/quick_recovery.sh"

# Display installation summary
echo ""
print_success "Database Recovery System Installation Complete!"
echo "=================================================="
echo ""
echo "📁 Files created:"
echo "  - scripts/database_recovery.py (executable)"
echo "  - scripts/recover_database.sh (executable)"
echo "  - scripts/test_database_recovery.py (executable)"
echo "  - scripts/quick_recovery.sh (executable)"
echo "  - scripts/pipeline-db-maintenance.service (systemd service)"
echo "  - scripts/db-maintenance-cron (cron job template)"
echo "  - backups/ (directory for database backups)"
echo ""
echo "🔧 Usage:"
echo "  - Check database: python scripts/database_recovery.py --action check"
echo "  - Create backup: python scripts/database_recovery.py --action backup"
echo "  - Repair database: python scripts/database_recovery.py --action repair --force"
echo "  - Interactive recovery: ./scripts/recover_database.sh"
echo "  - Quick recovery: ./scripts/quick_recovery.sh"
echo ""
echo "📋 Optional Setup:"
echo "  - To enable automatic maintenance, add the cron job:"
echo "    crontab -e"
echo "    # Add the contents of scripts/db-maintenance-cron"
echo ""
echo "  - To enable systemd service (if using systemd):"
echo "    sudo cp scripts/pipeline-db-maintenance.service /etc/systemd/system/"
echo "    sudo systemctl daemon-reload"
echo "    sudo systemctl enable pipeline-db-maintenance.service"
echo ""
print_success "Installation completed successfully!"
