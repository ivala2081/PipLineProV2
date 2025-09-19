from flask import Blueprint, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from app.models.user import User
from app import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
simple_auth = Blueprint('simple_auth', __name__)

@simple_auth.route('/simple-login', methods=['GET', 'POST'])
def simple_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Please enter both username and password', 'error')
            return redirect('http://localhost:3000/login')
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password, password):
            if not user.is_active:
                flash('Account is deactivated', 'error')
                return redirect('http://localhost:3000/login')
            
            if user.account_locked_until and user.account_locked_until > datetime.utcnow():
                flash('Account is temporarily locked', 'error')
                return redirect('http://localhost:3000/login')
            
            # Reset failed attempts on successful login
            user.failed_login_attempts = 0
            user.account_locked_until = None
            db.session.commit()
            
            login_user(user)
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'error')
            return redirect('http://localhost:3000/login')
    
    return redirect('http://localhost:3000/login')

@simple_auth.route('/simple-logout')
@login_required
def simple_logout():
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('simple_auth.simple_login')) 