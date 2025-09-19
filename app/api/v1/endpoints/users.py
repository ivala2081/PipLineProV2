"""
Users API endpoints for Flask
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.models.user import User
from app.models.config import UserSettings
from app import db

users_api = Blueprint('users_api', __name__)

@users_api.route("/me")
@login_required
def get_current_user_info():
    """Get current user information"""
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    })

@users_api.route("/settings", methods=['GET', 'PUT'])
@login_required
def user_settings():
    """Get or update user settings"""
    if request.method == 'GET':
        # Get user settings
        user_settings = UserSettings.query.filter_by(user_id=current_user.id).first()
        
        if user_settings:
            return jsonify({
                'language': user_settings.language,
                'landing_page': user_settings.landing_page,
                'table_page_size': user_settings.table_page_size,
                'table_density': user_settings.table_density,
                'font_size': user_settings.font_size,
                'color_scheme': user_settings.color_scheme
            })
        else:
            # Return default settings
            return jsonify({
                'language': 'en',
                'landing_page': 'dashboard',
                'table_page_size': 25,
                'table_density': 'comfortable',
                'font_size': 'medium',
                'color_scheme': 'default'
            })
    
    elif request.method == 'PUT':
        # Update user settings
        try:
            data = request.get_json()
            
            # Get or create user settings
            user_settings = UserSettings.query.filter_by(user_id=current_user.id).first()
            if not user_settings:
                user_settings = UserSettings(user_id=current_user.id)
                db.session.add(user_settings)
            
            # Update settings
            if 'language' in data:
                user_settings.language = data['language']
            if 'landing_page' in data:
                user_settings.landing_page = data['landing_page']
            if 'table_page_size' in data:
                user_settings.table_page_size = data['table_page_size']
            if 'table_density' in data:
                user_settings.table_density = data['table_density']
            if 'font_size' in data:
                user_settings.font_size = data['font_size']
            if 'color_scheme' in data:
                user_settings.color_scheme = data['color_scheme']
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Settings updated successfully'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Failed to update settings'
            }), 500

@users_api.route("/")
@login_required
def get_users():
    """Get all users (admin only)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    users = User.query.all()
    return jsonify({
        'users': [user.to_dict() for user in users]
    })
