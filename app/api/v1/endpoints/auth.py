"""
API Authentication endpoints for React frontend
"""
from flask import Blueprint, request, jsonify, session, current_app
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from datetime import datetime, timezone, timedelta
import uuid
import logging

from app import db, limiter, csrf
from app.models.user import User
from app.models.audit import LoginAttempt, UserSession
from app.utils.error_handler import handle_errors, AuthenticationError
from app.utils.smart_logger import get_smart_logger

logger = get_smart_logger(__name__)

auth_api = Blueprint('auth_api', __name__)

# Exempt auth API endpoints from CSRF protection
csrf.exempt(auth_api)

def check_account_lockout(user):
    """Check if user account is locked"""
    if user.account_locked_until and user.account_locked_until > datetime.now(timezone.utc):
        return True
    return False

def record_login_attempt(username, ip_address, success, failure_reason=None):
    """Record login attempt for security monitoring"""
    try:
        attempt = LoginAttempt(
            username=username,
            ip_address=ip_address,
            user_agent=request.headers.get('User-Agent', ''),
            success=success,
            failure_reason=failure_reason
        )
        db.session.add(attempt)
        db.session.commit()
    except Exception as e:
        logger.error(f"Failed to record login attempt for {username}: {str(e)}")
        try:
            db.session.rollback()
        except:
            pass

def handle_failed_login(user):
    """Handle failed login attempt"""
    try:
        if user.failed_login_attempts is None:
            user.failed_login_attempts = 0
        
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.account_locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as e:
        logger.error(f"Error in handle_failed_login for user {user.username}: {str(e)}")
        db.session.rollback()
        raise

def reset_failed_attempts(user):
    """Reset failed login attempts on successful login"""
    try:
        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
    except Exception as e:
        logger.error(f"Error in reset_failed_attempts for user {user.username}: {str(e)}")
        db.session.rollback()
        raise

@auth_api.route('/csrf-token', methods=['GET'])
def get_csrf_token():
    """Get CSRF token for API requests with enhanced session handling"""
    try:
        # Ensure user is authenticated
        if not current_user.is_authenticated:
            return jsonify({
                'error': 'Authentication required'
            }), 401
        
        # Clear any existing token to ensure fresh generation
        session.pop('csrf_token', None)
        
        # Generate a secure token using Flask-WTF's built-in token generation
        from flask_wtf.csrf import generate_csrf
        token = generate_csrf()
        
        # Store token in session for validation
        session['csrf_token'] = token
        session.modified = True
        
        # Also store in a more accessible location for API requests
        session['api_csrf_token'] = token
        
        logger.debug(f"CSRF token generated for user {current_user.username}: {token[:20]}...")
        
        return jsonify({
            'csrf_token': token,
            'message': 'CSRF token generated successfully',
            'user_id': current_user.id,
            'token_length': len(token)
        }), 200
    except Exception as e:
        logger.error(f"Error generating CSRF token: {str(e)}")
        return jsonify({
            'error': 'Failed to generate CSRF token',
            'message': str(e)
        }), 500

@auth_api.route('/check', methods=['GET'])
@limiter.limit("30 per minute")
def check_auth():
    """Check if user is authenticated"""
    try:
        # Add debugging information
        logger.debug(f"Auth check - current_user: {current_user}")
        logger.debug(f"Auth check - current_user.is_authenticated: {current_user.is_authenticated}")
        logger.debug(f"Auth check - session: {dict(session)}")
        
        if current_user.is_authenticated:
            # Check session timeout
            try:
                session_timeout = current_app.config.get('PERMANENT_SESSION_LIFETIME')
                if session_timeout and session.get('_session_created'):
                    session_created = session.get('_session_created')
                    if isinstance(session_created, str):
                        # Parse string datetime
                        session_created = datetime.fromisoformat(session_created.replace('Z', '+00:00'))
                    elif not isinstance(session_created, datetime):
                        # If not a datetime object, skip timeout check
                        session_created = None
                    
                    if session_created:
                        session_age = datetime.now(timezone.utc) - session_created
                        if session_age > session_timeout:
                            # Session expired, logout user
                            logout_user()
                            return jsonify({
                                'authenticated': False,
                                'message': 'Session expired'
                            }), 401
            except Exception as e:
                logger.warning(f"Session timeout check failed: {str(e)}")
                # Continue with normal authentication if timeout check fails
            
            return jsonify({
                'authenticated': True,
                'user': current_user.to_dict(),
                'message': 'User is authenticated'
            }), 200
        else:
            return jsonify({
                'authenticated': False,
                'message': 'User is not authenticated'
            }), 401
    except Exception as e:
        logger.error(f"Error checking authentication: {str(e)}")
        return jsonify({
            'error': 'Authentication check failed'
        }), 500

@auth_api.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
@handle_errors
def api_login():
    """Handle API login"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Invalid request data'
            }), 400

        username = data.get('username', '').strip()
        password = data.get('password', '')
        remember_me = data.get('remember_me', False)

        if not username or not password:
            return jsonify({
                'error': 'Username and password are required'
            }), 400

        ip_address = request.remote_addr

        # Find user
        user = User.query.filter_by(username=username).first()

        if user and user.is_active:
            # Check if account is locked
            if check_account_lockout(user):
                lockout_time = user.account_locked_until.strftime('%H:%M:%S')
                record_login_attempt(username, ip_address, success=False, failure_reason='account_locked')
                return jsonify({
                    'error': f'Account is locked until {lockout_time}. Please try again later.'
                }), 423

            # Check password
            if check_password_hash(user.password, password):
                # Successful login
                login_user(user, remember=remember_me)
                reset_failed_attempts(user)
                record_login_attempt(username, ip_address, success=True)

                # Create session token
                session_token = str(uuid.uuid4())
                session['session_token'] = session_token
                session['_session_created'] = datetime.now(timezone.utc).isoformat()
                session.permanent = True

                # Store session in database
                user_session = UserSession(
                    user_id=user.id,
                    session_token=session_token,
                    ip_address=ip_address,
                    user_agent=request.headers.get('User-Agent', '')
                )
                db.session.add(user_session)
                db.session.commit()

                return jsonify({
                    'success': True,
                    'message': f'Welcome back, {user.username}!',
                    'user': user.to_dict()
                }), 200
            else:
                # Failed login - wrong password
                try:
                    handle_failed_login(user)
                    record_login_attempt(username, ip_address, success=False, failure_reason='invalid_credentials')
                except Exception as e:
                    logger.error(f"Error handling failed login for user {username}: {str(e)}")
                    db.session.rollback()
                    record_login_attempt(username, ip_address, success=False, failure_reason='invalid_credentials')

                return jsonify({
                    'error': 'Invalid credentials. Please verify your username and password and try again.'
                }), 401
        else:
            # User not found
            record_login_attempt(username, ip_address, success=False, failure_reason='user_not_found')
            return jsonify({
                'error': 'Invalid credentials. Please verify your username and password and try again.'
            }), 401

    except Exception as e:
        logger.error(f"Error during API login process: {str(e)}")
        return jsonify({
            'error': 'An error occurred during login. Please try again.'
        }), 500

@auth_api.route('/logout', methods=['POST'])
@login_required
def api_logout():
    """Handle API logout"""
    try:
        # Mark current session as inactive
        token = session.get('session_token')
        if token:
            user_session = UserSession.query.filter_by(
                session_token=token, 
                is_active=True
            ).first()
            if user_session:
                user_session.is_active = False
                db.session.commit()

        # Clear session
        session.pop('session_token', None)
        logout_user()

        return jsonify({
            'success': True,
            'message': 'You have been logged out successfully.'
        }), 200

    except Exception as e:
        logger.error(f"Error during API logout: {str(e)}")
        return jsonify({
            'error': 'An error occurred during logout.'
        }), 500

@auth_api.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """Get current user profile"""
    try:
        return jsonify({
            'success': True,
            'user': current_user.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        return jsonify({
            'error': 'Failed to get user profile'
        }), 500

@auth_api.route('/sessions', methods=['GET'])
@login_required
def get_sessions():
    """Get user's active sessions"""
    try:
        active_sessions = UserSession.query.filter_by(
            user_id=current_user.id,
            is_active=True
        ).order_by(UserSession.created_at.desc()).all()

        sessions_data = []
        for session in active_sessions:
            sessions_data.append({
                'id': session.id,
                'session_token': session.session_token,
                'ip_address': session.ip_address,
                'user_agent': session.user_agent,
                'created_at': session.created_at.isoformat() if session.created_at else None,
                'last_activity': session.last_activity.isoformat() if session.last_activity else None
            })

        return jsonify({
            'success': True,
            'sessions': sessions_data
        }), 200
    except Exception as e:
        logger.error(f"Error getting user sessions: {str(e)}")
        return jsonify({
            'error': 'Failed to get user sessions'
        }), 500

@auth_api.route('/sessions/<int:session_id>', methods=['DELETE'])
@login_required
def logout_session(session_id):
    """Logout from a specific session"""
    try:
        session_obj = UserSession.query.filter_by(
            id=session_id,
            user_id=current_user.id,
            is_active=True
        ).first()

        if session_obj:
            session_obj.is_active = False
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Session logged out successfully.'
            }), 200
        else:
            return jsonify({
                'error': 'Session not found or already inactive.'
            }), 404

    except Exception as e:
        logger.error(f"Error logging out session: {str(e)}")
        return jsonify({
            'error': 'Failed to logout session'
        }), 500 