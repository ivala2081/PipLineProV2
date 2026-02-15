#!/bin/bash

# ============================================================================
# Database Backup Script for PipLineProV2
# ============================================================================
# This script creates timestamped backups of critical database tables
# and uploads them to secure storage (optional).
#
# Usage:
#   ./scripts/backup-database.sh
#
# Requirements:
#   - Supabase CLI installed (npm install -g supabase)
#   - Supabase project linked (supabase link)
#   - (Optional) AWS CLI for S3 uploads
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"

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

check_requirements() {
  log_info "Checking requirements..."

  if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
  fi

  if [ -z "$PROJECT_REF" ]; then
    log_error "SUPABASE_PROJECT_REF environment variable not set"
    log_info "Get your project ref from: https://supabase.com/dashboard/project/_/settings/general"
    exit 1
  fi

  log_info "All requirements met ✓"
}

create_backup_dir() {
  mkdir -p "$BACKUP_DIR"
  log_info "Backup directory: $BACKUP_DIR"
}

# ============================================================================
# Backup critical tables
# ============================================================================

backup_database() {
  log_info "Starting database backup..."

  local BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

  # Critical tables to backup
  local TABLES=(
    "profiles"
    "organizations"
    "organization_members"
    "organization_invitations"
    "transfers"
    "transfer_categories"
    "payment_methods"
    "transfer_types"
    "psps"
    "psp_settlement_methods"
    "psp_settlements"
    "wallets"
    "wallet_snapshots"
    "god_audit_log"
    "login_attempts"
  )

  log_info "Backing up ${#TABLES[@]} tables..."

  # Build table list for supabase command
  local TABLE_ARGS=""
  for table in "${TABLES[@]}"; do
    TABLE_ARGS="$TABLE_ARGS -t $table"
  done

  # Create backup
  if supabase db dump --data-only $TABLE_ARGS > "$BACKUP_FILE" 2>&1; then
    log_info "Backup created successfully: $BACKUP_FILE"

    # Get file size
    local SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup size: $SIZE"
  else
    log_error "Backup failed"
    exit 1
  fi

  # Compress backup
  log_info "Compressing backup..."
  if gzip -f "$BACKUP_FILE"; then
    log_info "Backup compressed: ${BACKUP_FILE}.gz"
    BACKUP_FILE="${BACKUP_FILE}.gz"
  else
    log_warn "Compression failed (continuing with uncompressed backup)"
  fi

  echo "$BACKUP_FILE"
}

# ============================================================================
# Upload to S3 (optional)
# ============================================================================

upload_to_s3() {
  local BACKUP_FILE=$1

  if [ -z "${AWS_S3_BUCKET:-}" ]; then
    log_warn "AWS_S3_BUCKET not set - skipping S3 upload"
    return
  fi

  if ! command -v aws &> /dev/null; then
    log_warn "AWS CLI not found - skipping S3 upload"
    return
  fi

  log_info "Uploading to S3: s3://$AWS_S3_BUCKET/backups/"

  if aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/" 2>&1; then
    log_info "Backup uploaded to S3 ✓"
  else
    log_warn "S3 upload failed (backup is still saved locally)"
  fi
}

# ============================================================================
# Cleanup old backups
# ============================================================================

cleanup_old_backups() {
  log_info "Cleaning up backups older than $RETAIN_DAYS days..."

  local DELETED_COUNT=0

  # Find and delete old backups
  while IFS= read -r -d '' file; do
    rm -f "$file"
    ((DELETED_COUNT++))
  done < <(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETAIN_DAYS -print0 2>/dev/null)

  if [ $DELETED_COUNT -gt 0 ]; then
    log_info "Deleted $DELETED_COUNT old backup(s)"
  else
    log_info "No old backups to clean up"
  fi
}

# ============================================================================
# Main execution
# ============================================================================

main() {
  log_info "========================================="
  log_info "PipLineProV2 Database Backup"
  log_info "========================================="

  check_requirements
  create_backup_dir

  BACKUP_FILE=$(backup_database)

  # Optional: upload to S3
  upload_to_s3 "$BACKUP_FILE"

  # Cleanup old backups
  cleanup_old_backups

  log_info "========================================="
  log_info "Backup completed successfully!"
  log_info "Backup file: $BACKUP_FILE"
  log_info "========================================="
}

# Run main function
main
