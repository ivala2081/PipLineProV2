#!/bin/bash

# ============================================================================
# Database Restore Script for PipLineProV2
# ============================================================================
# This script restores a database backup
#
# Usage:
#   ./scripts/restore-database.sh <backup_file>
#
# Example:
#   ./scripts/restore-database.sh backups/backup_20260215_120000.sql.gz
#
# ⚠️  WARNING: This will overwrite existing data! ⚠️
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Helper functions
# ============================================================================

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# Main execution
# ============================================================================

if [ $# -ne 1 ]; then
  log_error "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Check if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  log_info "Decompressing backup..."
  gunzip -k "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

log_warn "========================================="
log_warn "⚠️  DATABASE RESTORE WARNING ⚠️"
log_warn "========================================="
log_warn "You are about to restore from: $BACKUP_FILE"
log_warn "This will OVERWRITE existing data!"
log_warn ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  log_info "Restore cancelled"
  exit 0
fi

log_info "Starting database restore..."

# Restore using psql through supabase
if supabase db reset --linked 2>&1; then
  if cat "$BACKUP_FILE" | supabase db execute --linked 2>&1; then
    log_info "========================================="
    log_info "Restore completed successfully!"
    log_info "========================================="
  else
    log_error "Restore failed during data import"
    exit 1
  fi
else
  log_error "Database reset failed"
  exit 1
fi
