# Database Backup & Restore Scripts

## Overview

These scripts provide automated database backup and restore functionality for PipLineProV2.

## Prerequisites

1. **Supabase CLI** installed globally:
   ```bash
   npm install -g supabase
   ```

2. **Project linked** to Supabase:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Environment variables** set:
   ```bash
   export SUPABASE_PROJECT_REF="your-project-ref"
   export BACKUP_RETAIN_DAYS=30  # Optional, defaults to 30
   export AWS_S3_BUCKET="your-bucket-name"  # Optional, for S3 uploads
   ```

## Backup Script

### Usage

```bash
./scripts/backup-database.sh
```

### What it does

1. Creates timestamped backup of all critical tables
2. Compresses the backup with gzip
3. (Optional) Uploads to AWS S3
4. Cleans up backups older than retention period

### Backed up tables

- profiles
- organizations
- organization_members
- transfers
- psps
- wallets
- wallet_snapshots
- god_audit_log
- login_attempts
- ...and more

### Scheduling automated backups

Add to cron for daily backups at 2 AM:

```bash
crontab -e
```

Add this line:

```
0 2 * * * cd /path/to/PipLineProV2 && ./scripts/backup-database.sh >> logs/backup.log 2>&1
```

## Restore Script

### Usage

```bash
./scripts/restore-database.sh backups/backup_20260215_120000.sql.gz
```

### ⚠️ WARNING

**This will overwrite all existing data!** Only use this for:

- Disaster recovery
- Restoring to a test environment
- Rolling back after a failed migration

### Safety features

- Requires explicit "yes" confirmation
- Shows backup file being restored
- Handles both compressed and uncompressed backups

## Testing Backups

**Always test your backups regularly!**

1. Create a test Supabase project
2. Restore latest backup to test project
3. Verify data integrity
4. Test critical application flows

## Troubleshooting

### "Supabase CLI not found"

Install the CLI:

```bash
npm install -g supabase
```

### "Project not linked"

Link your project:

```bash
supabase link --project-ref your-project-ref
```

Get your project ref from: https://supabase.com/dashboard/project/_/settings/general

### S3 upload fails

Ensure AWS CLI is configured:

```bash
aws configure
```

Or set environment variables:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Security Best Practices

1. **Store backups securely** - Use S3 with encryption at rest
2. **Restrict access** - Limit who can download/restore backups
3. **Test regularly** - Verify backups work before you need them
4. **Monitor** - Set up alerts for failed backups
5. **Rotate credentials** - Change S3 access keys periodically
