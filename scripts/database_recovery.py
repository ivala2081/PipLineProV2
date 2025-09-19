#!/usr/bin/env python3
"""
Database Recovery Script for PipLinePro
Run this script to diagnose and recover from database corruption issues
"""
import os
import sys
import argparse
import logging
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main function for database recovery script"""
    parser = argparse.ArgumentParser(description='PipLinePro Database Recovery Tool')
    parser.add_argument('--action', choices=['check', 'backup', 'repair', 'recover', 'recreate', 'options'], 
                       default='check', help='Action to perform')
    parser.add_argument('--backup-path', help='Path to backup file for recovery')
    parser.add_argument('--force', action='store_true', help='Force action without confirmation')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Import after setting up the path
        from app.services.database_recovery_service import database_recovery_service
        from app import create_app
        
        # Create app context
        app = create_app()
        
        with app.app_context():
            if args.action == 'check':
                check_database_integrity(database_recovery_service)
            elif args.action == 'backup':
                create_backup(database_recovery_service)
            elif args.action == 'repair':
                repair_database(database_recovery_service, args.force)
            elif args.action == 'recover':
                recover_database(database_recovery_service, args.backup_path, args.force)
            elif args.action == 'recreate':
                recreate_database(database_recovery_service, args.force)
            elif args.action == 'options':
                show_recovery_options(database_recovery_service)
                
    except Exception as e:
        logger.error(f"Error running database recovery: {str(e)}")
        sys.exit(1)

def check_database_integrity(service):
    """Check database integrity"""
    print("🔍 Checking database integrity...")
    result = service.check_database_integrity()
    
    print(f"\n📊 Database Integrity Report:")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    print(f"Corrupted: {result['corrupted']}")
    print(f"Recoverable: {result.get('recoverable', 'Unknown')}")
    
    if 'file_size' in result:
        print(f"File Size: {result['file_size']:,} bytes")
    
    if 'integrity_check' in result:
        print(f"Integrity Check: {result['integrity_check']}")
    
    if 'quick_check' in result:
        print(f"Quick Check: {result['quick_check']}")
    
    if 'table_count' in result:
        print(f"Table Count: {result['table_count']}")
        if result.get('tables'):
            print(f"Tables: {', '.join(result['tables'])}")
    
    if result['corrupted']:
        print("\n⚠️  Database is corrupted! Run with --action options to see recovery options.")
    else:
        print("\n✅ Database integrity is good!")

def create_backup(service):
    """Create database backup"""
    print("💾 Creating database backup...")
    result = service.create_backup()
    
    if result['status'] == 'success':
        print(f"✅ Backup created successfully!")
        print(f"Backup Path: {result['backup_path']}")
        print(f"Backup Size: {result['backup_size']:,} bytes")
        print(f"Original Size: {result['original_size']:,} bytes")
    else:
        print(f"❌ Backup failed: {result['message']}")

def repair_database(service, force=False):
    """Repair corrupted database"""
    if not force:
        response = input("⚠️  This will attempt to repair the database. Continue? (y/N): ")
        if response.lower() != 'y':
            print("Repair cancelled.")
            return
    
    print("🔧 Attempting to repair database...")
    result = service.repair_database()
    
    print(f"\n🔧 Database Repair Result:")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    
    if 'integrity_check' in result:
        print(f"Post-repair integrity: {result['integrity_check']['status']}")
    
    if result['status'] == 'success':
        print("✅ Database repair successful!")
    elif result['status'] == 'partial':
        print("⚠️  Database repair partially successful. Consider recovery from backup.")
    else:
        print("❌ Database repair failed. Consider recovery from backup.")

def recover_database(service, backup_path=None, force=False):
    """Recover database from backup"""
    if not force:
        response = input("⚠️  This will restore the database from backup. Continue? (y/N): ")
        if response.lower() != 'y':
            print("Recovery cancelled.")
            return
    
    print("🔄 Recovering database from backup...")
    result = service.recover_database(backup_path)
    
    print(f"\n🔄 Database Recovery Result:")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    
    if 'backup_used' in result:
        print(f"Backup Used: {result['backup_used']}")
    
    if 'integrity_check' in result:
        print(f"Post-recovery integrity: {result['integrity_check']['status']}")
    
    if result['status'] == 'success':
        print("✅ Database recovery successful!")
    else:
        print("❌ Database recovery failed.")

def recreate_database(service, force=False):
    """Recreate database from scratch"""
    if not force:
        response = input("⚠️  This will recreate the database and LOSE ALL DATA. Continue? (y/N): ")
        if response.lower() != 'y':
            print("Recreation cancelled.")
            return
    
    print("🏗️  Recreating database from scratch...")
    result = service._recreate_database()
    
    print(f"\n🏗️  Database Recreation Result:")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    
    if 'integrity_check' in result:
        print(f"Post-recreation integrity: {result['integrity_check']['status']}")
    
    if result['status'] == 'success':
        print("✅ Database recreated successfully!")
        print("⚠️  Note: All previous data has been lost.")
    else:
        print("❌ Database recreation failed.")

def show_recovery_options(service):
    """Show available recovery options"""
    print("📋 Getting recovery options...")
    result = service.get_recovery_options()
    
    print(f"\n📋 Recovery Options:")
    
    db_status = result['database_status']
    print(f"Database Status: {db_status['status']}")
    print(f"Corrupted: {db_status['corrupted']}")
    
    if result['available_backups']:
        print(f"\n💾 Available Backups ({len(result['available_backups'])}):")
        for backup in result['available_backups'][:5]:  # Show first 5
            print(f"  - {backup['filename']} ({backup['size']:,} bytes, {backup['modified']})")
        if len(result['available_backups']) > 5:
            print(f"  ... and {len(result['available_backups']) - 5} more")
    else:
        print("\n💾 No backups available")
    
    if result['recovery_options']:
        print(f"\n🔧 Recovery Options:")
        for i, option in enumerate(result['recovery_options'], 1):
            print(f"  {i}. {option['option']}")
            print(f"     Description: {option['description']}")
            print(f"     Recommended: {option['recommended']}")
            print(f"     Data Loss Risk: {option['data_loss_risk']}")
            print()
    else:
        print("\n✅ No recovery options needed - database is healthy")

if __name__ == '__main__':
    main()
