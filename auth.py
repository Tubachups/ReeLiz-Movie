from flask import render_template, json, request, redirect, url_for, session
from call_php import run_php_script

# Admin credentials
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'admin123'

def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = request.form.get('remember')
        
        # Check for admin login
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['user_id'] = 0
            session['username'] = 'Admin'
            session['email'] = 'admin@reeliz.com'
            session['is_admin'] = True
            return redirect(url_for('admin_dashboard'))
        
        # Call PHP login handler for regular users
        output = run_php_script('php/login_handler.php', [username, password])
        
        try:
            result = json.loads(output)
            if result['status'] == 'success':
                # Store user data in session
                session['user_id'] = result['user']['id']
                session['username'] = result['user']['username']
                session['email'] = result['user']['email']
                session['is_admin'] = False
                return redirect(url_for('landing'))
            else:
                return render_template('pages/login.html', error=result['message'])
        except json.JSONDecodeError:
            return render_template('pages/login.html', error='An error occurred. Please try again.')
    
    return render_template('pages/login.html')
  
  
def signup():
  if request.method == 'POST':
      username = request.form.get('username')
      email = request.form.get('email')
      password = request.form.get('password')
      confirm_password = request.form.get('confirm_password')
      
      # Validate passwords match
      if password != confirm_password:
          return render_template('pages/login.html', error='Passwords do not match!')
      
      # Call PHP signup handler
      output = run_php_script('php/signup_handler.php', [username, email, password])
      
      try:
          result = json.loads(output)
          if result['status'] == 'success':
              return render_template('pages/login.html', success='Account created successfully! Please login.')
          else:
              return render_template('pages/login.html', error=result['message'])
      except json.JSONDecodeError:
          return render_template('pages/login.html', error='An error occurred. Please try again.')
      
  return render_template('pages/login.html')

def logout():
  session.clear()
  return redirect(url_for('login'))