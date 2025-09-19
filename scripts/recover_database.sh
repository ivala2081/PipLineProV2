#!/bin/bash

# Database Recovery Script for PipLinePro
# This script helps recover from database corruption issues

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

# Check if Python virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    print_warning "Virtual environment not detected. Activating .venv..."
    if [ -d ".venv" ]; then
        source .venv/bin/activate
        print_success "Virtual environment activated"
    else
        print_error "Virtual environment not found. Please create and activate it first."
        exit 1
    fi
fi

# Make the recovery script executable
chmod +x scripts/database_recovery.py

print_status "PipLinePro Database Recovery Tool"
echo "=================================="

# Check database integrity first
print_status "Checking database integrity..."
python scripts/database_recovery.py --action check

echo ""
print_status "Available actions:"
echo "1. Check database integrity"
echo "2. Create backup"
echo "3. Repair database"
echo "4. Recover from backup"
echo "5. Recreate database (WARNING: Loses all data)"
echo "6. Show recovery options"
echo ""

read -p "Select an action (1-6): " choice

case $choice in
    1)
        print_status "Checking database integrity..."
        python scripts/database_recovery.py --action check --verbose
        ;;
    2)
        print_status "Creating database backup..."
        python scripts/database_recovery.py --action backup
        ;;
    3)
        print_warning "This will attempt to repair the corrupted database."
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            python scripts/database_recovery.py --action repair --force
        else
            print_status "Repair cancelled."
        fi
        ;;
    4)
        print_warning "This will restore the database from backup."
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            python scripts/database_recovery.py --action recover --force
        else
            print_status "Recovery cancelled."
        fi
        ;;
    5)
        print_error "WARNING: This will recreate the database and LOSE ALL DATA!"
        read -p "Are you absolutely sure? Type 'YES' to continue: " confirm
        if [[ $confirm == "YES" ]]; then
            python scripts/database_recovery.py --action recreate --force
        else
            print_status "Recreation cancelled."
        fi
        ;;
    6)
        print_status "Showing recovery options..."
        python scripts/database_recovery.py --action options
        ;;
    *)
        print_error "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

print_success "Database recovery operation completed."
