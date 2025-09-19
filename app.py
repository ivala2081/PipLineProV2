"""
PipLinePro - Treasury Management System
Main application entry point
"""
import os
import sys
from pathlib import Path

# Load environment variables from .env files
try:
    from dotenv import load_dotenv
    # Load environment-specific .env file first
    env_file = Path('.env.development') if os.getenv('FLASK_ENV') == 'development' else Path('.env')
    if env_file.exists():
        load_dotenv(env_file)
        print(f"✅ Environment variables loaded from {env_file}")
    elif Path('.env').exists():
        load_dotenv('.env')
        print("✅ Environment variables loaded from .env")

    else:
        print("ℹ️ No .env file found, using system environment variables")
except ImportError:
    print("ℹ️ python-dotenv not available, using system environment variables")

def setup_development_environment():
    """Set up development environment variables"""
    # Set development environment
    os.environ['FLASK_ENV'] = 'development'
    os.environ['DEBUG'] = 'True'
    
    # Set a default secret key for development
    if not os.environ.get('SECRET_KEY'):
        os.environ['SECRET_KEY'] = 'dev-secret-key-change-in-production'
    
    # Disable Redis for development unless explicitly enabled
    if not os.environ.get('REDIS_ENABLED'):
        os.environ['REDIS_ENABLED'] = 'false'
    
    # Database URL is now handled by config.py
    # No need to override here
    
    print("✅ Development environment configured")

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import sqlalchemy
        import flask_login
        import flask_wtf
        print("✅ All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install dependencies with: pip install -r requirements.txt")
        return False

def create_directories():
    """Create necessary directories"""
    directories = ['logs', 'static/uploads', 'backups']
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    print("✅ Directories created")

def main():
    """Main application startup function"""
    print("🚀 Starting PipLinePro...")
    
    # Set up environment
    setup_development_environment()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Import and run the app
    try:
        from app import create_app, db
        from werkzeug.security import generate_password_hash
        
        app = create_app()
        
        print("✅ Application created successfully")
        
        # Database initialization - controlled by environment variable
        # Set INIT_DB=true to enable database initialization (development only)
        if os.environ.get('INIT_DB', 'false').lower() == 'true' and os.environ.get('FLASK_ENV') != 'production':
            app.logger.info("Database initialization enabled for development")
            with app.app_context():
                try:
                    db.create_all()
                    app.logger.info("Database tables created successfully")
                    
                    # Create default category options (WD and DEP)
                    from app.models.config import Option
                    default_categories = ['WD', 'DEP']
                    for category in default_categories:
                        existing_category = Option.query.filter_by(
                            field_name='category', 
                            value=category, 
                            is_active=True
                        ).first()
                        if not existing_category:
                            category_option = Option(
                                field_name='category',
                                value=category
                            )
                            db.session.add(category_option)
                            app.logger.info(f"Default category '{category}' created")
                    
                    db.session.commit()
                    app.logger.info("Default category options created successfully")
                    
                    # Create default admin user if it doesn't exist - SECURE VERSION
                    from app.models.user import User
                    admin_user = User.query.filter_by(username='admin').first()
                    if not admin_user:
                        # Check if admin credentials are provided via environment variables
                        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
                        admin_password = os.environ.get('ADMIN_PASSWORD')
                        
                        if not admin_password:
                            # Generate a secure random password if not provided
                            import secrets
                            import string
                            admin_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
                            app.logger.warning(f"WARNING: No ADMIN_PASSWORD set. Generated temporary password: {admin_password}")
                            app.logger.warning("IMPORTANT: Change this password immediately after first login!")
                        
                        admin_user = User()
                        admin_user.username = admin_username
                        admin_user.password = generate_password_hash(admin_password)
                        admin_user.role = 'admin'
                        admin_user.email = os.environ.get('ADMIN_EMAIL', 'admin@pipeline.com')
                        admin_user.password_changed_at = None  # Force password change on first login
                        db.session.add(admin_user)
                        db.session.commit()
                        app.logger.info(f"Admin user '{admin_username}' created")
                        
                        if not os.environ.get('ADMIN_PASSWORD'):
                            app.logger.warning(f"TEMPORARY PASSWORD: {admin_password}")
                            app.logger.warning("CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN!")
                    else:
                        # Check if admin password needs to be changed (first login)
                        if admin_user.password_changed_at is None:
                            app.logger.warning("Admin user exists but password change required on first login")
                except Exception as e:
                    app.logger.error(f"Database initialization failed: {str(e)}")
        else:
            app.logger.info("Database initialization disabled - use Flask-Migrate for database management")
        
        print("🌐 Starting development server...")
        print("📱 Access the application at: http://127.0.0.1:5000")
        print("🔧 Debug mode is enabled")
        print("⏹️  Press Ctrl+C to stop the server")
        
        app.run(
            host='127.0.0.1',
            port=5000,
            debug=True,
            use_reloader=True
        )
        
    except Exception as e:
        print(f"❌ Error starting application: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()