#!/usr/bin/env python3
"""
Health Check Script for PipLine Treasury System
This script performs comprehensive health checks on the system
"""

import sys
import os
import requests
import time
import psutil
import subprocess
from datetime import datetime
import json

class HealthChecker:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.checks_passed = 0
        self.checks_failed = 0
        self.results = []
    
    def log_result(self, check_name, status, message, details=None):
        """Log the result of a health check"""
        result = {
            "check": check_name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.results.append(result)
        
        if status == "PASS":
            self.checks_passed += 1
            print(f"[PASS] {check_name}: {message}")
        else:
            self.checks_failed += 1
            print(f"[FAIL] {check_name}: {message}")
            if details:
                print(f"   Details: {details}")
    
    def check_system_resources(self):
        """Check system resource usage"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            if cpu_percent > 80:
                self.log_result("CPU Usage", "FAIL", f"High CPU usage: {cpu_percent}%")
            else:
                self.log_result("CPU Usage", "PASS", f"CPU usage: {cpu_percent}%")
            
            # Memory usage
            memory = psutil.virtual_memory()
            if memory.percent > 85:
                self.log_result("Memory Usage", "FAIL", f"High memory usage: {memory.percent}%")
            else:
                self.log_result("Memory Usage", "PASS", f"Memory usage: {memory.percent}%")
            
            # Disk usage
            disk = psutil.disk_usage('/')
            if disk.percent > 90:
                self.log_result("Disk Usage", "FAIL", f"High disk usage: {disk.percent}%")
            else:
                self.log_result("Disk Usage", "PASS", f"Disk usage: {disk.percent}%")
                
        except Exception as e:
            self.log_result("System Resources", "FAIL", f"Error checking system resources: {e}")
    
    def check_application_health(self):
        """Check application health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/health/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_result("Application Health", "PASS", "Application is healthy", data)
            else:
                self.log_result("Application Health", "FAIL", f"Health check returned status {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.log_result("Application Health", "FAIL", f"Health check failed: {e}")
    
    def check_database_connection(self):
        """Check database connection"""
        try:
            response = requests.get(f"{self.base_url}/api/v1/health/database", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_result("Database Connection", "PASS", "Database connection is healthy", data)
            else:
                self.log_result("Database Connection", "FAIL", f"Database check returned status {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.log_result("Database Connection", "FAIL", f"Database check failed: {e}")
    
    def check_api_endpoints(self):
        """Check critical API endpoints"""
        endpoints = [
            "/api/v1/auth/check",
            "/api/v1/transactions/psp_summary_stats",
            "/api/v1/analytics/dashboard/stats"
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code in [200, 401]:  # 401 is expected for unauthenticated requests
                    self.log_result(f"API Endpoint {endpoint}", "PASS", f"Endpoint responding (status: {response.status_code})")
                else:
                    self.log_result(f"API Endpoint {endpoint}", "FAIL", f"Unexpected status: {response.status_code}")
            except requests.exceptions.RequestException as e:
                self.log_result(f"API Endpoint {endpoint}", "FAIL", f"Endpoint failed: {e}")
    
    def check_log_files(self):
        """Check log files for errors"""
        log_files = [
            "logs/pipelinepro_enhanced.log",
            "logs/pipelinepro_errors.log",
            "logs/pipelinepro_performance.log"
        ]
        
        for log_file in log_files:
            if os.path.exists(log_file):
                try:
                    # Check file size
                    file_size = os.path.getsize(log_file)
                    if file_size > 100 * 1024 * 1024:  # 100MB
                        self.log_result(f"Log File {log_file}", "WARN", f"Large log file: {file_size / 1024 / 1024:.1f}MB")
                    else:
                        self.log_result(f"Log File {log_file}", "PASS", f"Log file size: {file_size / 1024:.1f}KB")
                    
                    # Check for recent errors
                    with open(log_file, 'r') as f:
                        lines = f.readlines()
                        recent_lines = lines[-100:] if len(lines) > 100 else lines
                        error_count = sum(1 for line in recent_lines if 'ERROR' in line or 'CRITICAL' in line)
                        
                        if error_count > 10:
                            self.log_result(f"Log Errors {log_file}", "WARN", f"High error count in recent logs: {error_count}")
                        else:
                            self.log_result(f"Log Errors {log_file}", "PASS", f"Error count in recent logs: {error_count}")
                            
                except Exception as e:
                    self.log_result(f"Log File {log_file}", "FAIL", f"Error reading log file: {e}")
            else:
                self.log_result(f"Log File {log_file}", "WARN", "Log file does not exist")
    
    def check_process_status(self):
        """Check if the application process is running"""
        try:
            # Check if the application is running
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'python' in proc.info['name'].lower() and 'app.py' in ' '.join(proc.info['cmdline']):
                        self.log_result("Process Status", "PASS", f"Application process running (PID: {proc.info['pid']})")
                        return
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            self.log_result("Process Status", "FAIL", "Application process not found")
        except Exception as e:
            self.log_result("Process Status", "FAIL", f"Error checking process status: {e}")
    
    def check_dependencies(self):
        """Check if required dependencies are available"""
        try:
            import flask
            import sqlalchemy
            import pandas
            import redis
            self.log_result("Dependencies", "PASS", "All required dependencies are available")
        except ImportError as e:
            self.log_result("Dependencies", "FAIL", f"Missing dependency: {e}")
    
    def run_all_checks(self):
        """Run all health checks"""
        print("Starting comprehensive health check...")
        print("=" * 50)
        
        self.check_dependencies()
        self.check_process_status()
        self.check_system_resources()
        self.check_application_health()
        self.check_database_connection()
        self.check_api_endpoints()
        self.check_log_files()
        
        print("=" * 50)
        print(f"Health Check Summary:")
        print(f"   Passed: {self.checks_passed}")
        print(f"   Failed: {self.checks_failed}")
        print(f"   Success Rate: {(self.checks_passed / (self.checks_passed + self.checks_failed)) * 100:.1f}%")
        
        # Save results to file
        with open('health_check_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"Detailed results saved to: health_check_results.json")
        
        return self.checks_failed == 0

def main():
    """Main function"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5000"
    
    checker = HealthChecker(base_url)
    success = checker.run_all_checks()
    
    if success:
        print("All health checks passed!")
        sys.exit(0)
    else:
        print("Some health checks failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
