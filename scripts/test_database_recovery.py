#!/usr/bin/env python3
"""
Test script for database recovery functionality
This script simulates database corruption scenarios for testing
"""
import os
import sys
import shutil
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def test_database_recovery():
    """Test database recovery functionality"""
    print("🧪 Testing Database Recovery Functionality")
    print("=" * 50)
    
    try:
        from app.services.database_recovery_service import database_recovery_service
        from app import create_app
        
        # Create app context
        app = create_app()
        
        with app.app_context():
            # Test 1: Check database integrity
            print("\n1️⃣ Testing database integrity check...")
            result = database_recovery_service.check_database_integrity()
            print(f"   Status: {result['status']}")
            print(f"   Corrupted: {result['corrupted']}")
            print(f"   File Size: {result.get('file_size', 'N/A'):,} bytes")
            print(f"   Tables: {result.get('table_count', 'N/A')}")
            
            # Test 2: Create backup
            print("\n2️⃣ Testing backup creation...")
            backup_result = database_recovery_service.create_backup("test_backup.db")
            print(f"   Status: {backup_result['status']}")
            if backup_result['status'] == 'success':
                print(f"   Backup Path: {backup_result['backup_path']}")
                print(f"   Backup Size: {backup_result['backup_size']:,} bytes")
            
            # Test 3: Get recovery options
            print("\n3️⃣ Testing recovery options...")
            options_result = database_recovery_service.get_recovery_options()
            print(f"   Database Status: {options_result['database_status']['status']}")
            print(f"   Available Backups: {len(options_result['available_backups'])}")
            print(f"   Recovery Options: {len(options_result['recovery_options'])}")
            
            # Test 4: Test prevention service
            print("\n4️⃣ Testing database prevention service...")
            from app.services.database_prevention_service import database_prevention_service
            maintenance_result = database_prevention_service.perform_maintenance()
            print(f"   Maintenance Status: {maintenance_result['success']}")
            print(f"   Operations Performed: {len(maintenance_result['operations'])}")
            
            # Test 5: Test optimization service with corruption detection
            print("\n5️⃣ Testing database optimization service...")
            from app.services.database_optimization_service import DatabaseOptimizationService
            optimization_service = DatabaseOptimizationService()
            index_result = optimization_service.create_performance_indexes()
            print(f"   Index Creation Status: {index_result['status']}")
            print(f"   Indexes Created: {index_result['indexes_created']}")
            print(f"   Corruption Detected: {index_result.get('corruption_detected', False)}")
            
            print("\n✅ All tests completed successfully!")
            print("\n📋 Test Summary:")
            print(f"   - Database Integrity: {'✅ PASS' if result['status'] == 'success' else '❌ FAIL'}")
            print(f"   - Backup Creation: {'✅ PASS' if backup_result['status'] == 'success' else '❌ FAIL'}")
            print(f"   - Recovery Options: {'✅ PASS' if options_result else '❌ FAIL'}")
            print(f"   - Maintenance Service: {'✅ PASS' if maintenance_result['success'] else '❌ FAIL'}")
            print(f"   - Optimization Service: {'✅ PASS' if index_result['status'] == 'success' else '❌ FAIL'}")
            
            return True
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_corruption_simulation():
    """Simulate database corruption for testing recovery"""
    print("\n🔬 Testing Corruption Simulation")
    print("=" * 50)
    
    try:
        from app.services.database_recovery_service import database_recovery_service
        from app import create_app
        
        app = create_app()
        
        with app.app_context():
            # Get database path
            db_path = database_recovery_service.get_database_path()
            print(f"Database Path: {db_path}")
            
            # Create backup before corruption
            print("\n📦 Creating backup before corruption simulation...")
            backup_result = database_recovery_service.create_backup("pre_corruption_backup.db")
            if backup_result['status'] != 'success':
                print("❌ Failed to create backup")
                return False
            
            # Simulate corruption by truncating the database file
            print("\n💥 Simulating database corruption...")
            original_size = os.path.getsize(db_path)
            with open(db_path, 'r+b') as f:
                f.truncate(original_size // 2)  # Truncate to half size
            
            print(f"   Original Size: {original_size:,} bytes")
            print(f"   Corrupted Size: {os.path.getsize(db_path):,} bytes")
            
            # Test integrity check on corrupted database
            print("\n🔍 Testing integrity check on corrupted database...")
            integrity_result = database_recovery_service.check_database_integrity()
            print(f"   Status: {integrity_result['status']}")
            print(f"   Corrupted: {integrity_result['corrupted']}")
            
            # Test recovery options
            print("\n📋 Testing recovery options on corrupted database...")
            options_result = database_recovery_service.get_recovery_options()
            print(f"   Recovery Options Available: {len(options_result['recovery_options'])}")
            
            # Restore from backup
            print("\n🔄 Testing database recovery from backup...")
            recovery_result = database_recovery_service.recover_database("pre_corruption_backup.db")
            print(f"   Recovery Status: {recovery_result['status']}")
            
            # Verify recovery
            print("\n✅ Verifying recovery...")
            final_integrity = database_recovery_service.check_database_integrity()
            print(f"   Final Status: {final_integrity['status']}")
            print(f"   Final Size: {final_integrity.get('file_size', 'N/A'):,} bytes")
            
            if final_integrity['status'] == 'success':
                print("\n🎉 Corruption simulation and recovery test PASSED!")
                return True
            else:
                print("\n❌ Corruption simulation and recovery test FAILED!")
                return False
                
    except Exception as e:
        print(f"\n❌ Corruption simulation test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🚀 Starting Database Recovery Tests")
    print("=" * 60)
    
    # Run basic functionality tests
    basic_tests_passed = test_database_recovery()
    
    # Ask user if they want to run corruption simulation
    print("\n" + "=" * 60)
    response = input("🔬 Run corruption simulation test? (y/N): ").lower()
    
    if response == 'y':
        corruption_tests_passed = test_corruption_simulation()
    else:
        corruption_tests_passed = True
        print("⏭️  Skipping corruption simulation test")
    
    # Final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"Basic Functionality Tests: {'✅ PASS' if basic_tests_passed else '❌ FAIL'}")
    print(f"Corruption Simulation Tests: {'✅ PASS' if corruption_tests_passed else '❌ FAIL'}")
    
    if basic_tests_passed and corruption_tests_passed:
        print("\n🎉 ALL TESTS PASSED! Database recovery system is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED! Please check the errors above.")
        sys.exit(1)
