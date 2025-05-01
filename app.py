import os
import logging
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from models import db, User, Ticket, Achievement, Warning
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
import secrets
import string

# Set up logging for easier debugging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key-for-development")

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)

# Helper functions
def generate_ticket_id():
    """Generate a unique ticket ID"""
    letters = string.ascii_lowercase
    random_string = ''.join(secrets.choice(letters) for i in range(6))
    timestamp = datetime.now().strftime('%Y%m%d%H%M')
    return f"{timestamp}-{random_string}"

def get_week_number(date_obj):
    """Get ISO week number for a date"""
    week = date_obj.isocalendar()[1]
    year = date_obj.year
    return f"{year}-W{week:02d}"

def update_achievement(user_id):
    """Update achievement statistics when a ticket is completed"""
    today = date.today()
    week = get_week_number(today)
    
    # Check if there's already an achievement for today
    achievement = Achievement.query.filter_by(user_id=user_id, date=today).first()
    
    if achievement:
        # Update existing achievement
        achievement.tickets_completed += 1
    else:
        # Create new achievement
        achievement = Achievement(
            user_id=user_id,
            date=today,
            week=week,
            tickets_completed=1
        )
        db.session.add(achievement)
    
    db.session.commit()

# Initialize database with default admin user
def create_tables_and_defaults():
    with app.app_context():
        db.create_all()
        
        # Check if admin user exists, if not create one
        admin = User.query.filter_by(username='admin@ali').first()
        if not admin:
            admin = User(
                username='admin@ali',
                role='admin'
            )
            admin.set_password('@@2005@@2005')
            db.session.add(admin)
            
            # Add default employees
            departments = ['Technical Support', 'Field Service', 'Customer Service', 'Installations']
            for i in range(1, 13):
                dept_index = (i - 1) % 4
                username = f'emp_protel{i}'
                password = f'ptl2025{chr(96+i)}{i}'
                
                emp = User(
                    username=username,
                    role='employee',
                    department=departments[dept_index]
                )
                emp.set_password(password)
                db.session.add(emp)
            
            db.session.commit()

# Create a function to create all tables and setup initial data
@app.route('/api/setup-database', methods=['GET'])
def setup_database():
    create_tables_and_defaults()
    return jsonify({'success': True, 'message': 'Database initialized successfully'})

# Initialize database when app starts
create_tables_and_defaults()

# Web Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/add-ticket')
def add_ticket():
    return render_template('add-ticket.html')

@app.route('/tickets')
def tickets():
    return render_template('tickets.html')

@app.route('/ticket-details')
def ticket_details():
    return render_template('ticket-details.html')

@app.route('/my-achievements')
def my_achievements():
    return render_template('my-achievements.html')

@app.route('/warnings')
def warnings():
    return render_template('warnings.html')

@app.route('/admin-panel')
def admin_panel():
    return render_template('admin-panel.html')

@app.route('/logout')
def logout():
    # Clear session
    session.clear()
    return render_template('logout.html')

# API Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    # Validate request data
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    username = data['username']
    password = data['password']
    
    # Find user
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
    # Create session
    session['user_id'] = user.id
    session['username'] = user.username
    session['role'] = user.role
    
    # Return user data
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/current-user', methods=['GET'])
def current_user():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })

@app.route('/api/employees', methods=['GET'])
def get_employees():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    # Get all employees
    employees = User.query.filter_by(role='employee').all()
    
    return jsonify({
        'success': True,
        'employees': [emp.to_dict() for emp in employees]
    })

@app.route('/api/tickets', methods=['GET', 'POST'])
def api_tickets():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    if request.method == 'GET':
        # Get tickets based on role
        if user.role == 'admin':
            tickets = Ticket.query.all()
        else:
            tickets = Ticket.query.filter_by(assigned_to_id=user_id).all()
        
        return jsonify({
            'success': True,
            'tickets': [ticket.to_dict() for ticket in tickets]
        })
    
    elif request.method == 'POST':
        # Only admins can create tickets
        if user.role != 'admin':
            return jsonify({'success': False, 'message': 'Only managers can create tickets'}), 403
        
        data = request.get_json()
        
        # Validate request data
        required_fields = ['customerName', 'customerPhone', 'customerAddress', 
                          'subject', 'description', 'priority', 'assignedTo']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Get assigned employee
        assigned_emp = User.query.filter_by(username=data['assignedTo']).first()
        if not assigned_emp:
            return jsonify({'success': False, 'message': 'Assigned employee not found'}), 404
        
        # Create new ticket
        ticket = Ticket(
            ticket_id=generate_ticket_id(),
            customer_name=data['customerName'],
            customer_phone=data['customerPhone'],
            customer_address=data['customerAddress'],
            subject=data['subject'],
            description=data['description'],
            priority=data['priority'],
            status='open',
            assigned_to_id=assigned_emp.id,
            created_by_id=user_id,
            created_at=datetime.utcnow()
        )
        
        db.session.add(ticket)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'ticket': ticket.to_dict()
        })

@app.route('/api/tickets/<string:ticket_id>', methods=['GET', 'PUT'])
def api_ticket_detail(ticket_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    
    # Find ticket
    ticket = Ticket.query.filter_by(ticket_id=ticket_id).first()
    if not ticket:
        return jsonify({'success': False, 'message': 'Ticket not found'}), 404
    
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'ticket': ticket.to_dict()
        })
    
    elif request.method == 'PUT':
        data = request.get_json()
        
        # Validate request data
        if 'status' not in data:
            return jsonify({'success': False, 'message': 'Missing status field'}), 400
        
        if data['status'] == 'done' and 'resolution' not in data:
            return jsonify({'success': False, 'message': 'Resolution is required when marking a ticket as done'}), 400
        
        # Update ticket
        ticket.status = data['status']
        ticket.updated_at = datetime.utcnow()
        ticket.updated_by_id = user_id
        
        if 'resolution' in data:
            ticket.resolution = data['resolution']
        
        db.session.commit()
        
        # If marked as done, update achievements
        if data['status'] == 'done':
            update_achievement(ticket.assigned_to_id)
        
        return jsonify({
            'success': True,
            'ticket': ticket.to_dict()
        })

@app.route('/api/achievements', methods=['GET'])
def api_achievements():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    # Get all achievements for the current user
    achievements = Achievement.query.filter_by(user_id=user_id).order_by(Achievement.date.desc()).all()
    
    # Group by date and week
    daily_stats = {}
    weekly_stats = {}
    
    for achievement in achievements:
        # Daily stats
        date_str = achievement.date.isoformat()
        daily_stats[date_str] = achievement.tickets_completed
        
        # Weekly stats
        if achievement.week not in weekly_stats:
            weekly_stats[achievement.week] = 0
        weekly_stats[achievement.week] += achievement.tickets_completed
    
    # Get total completed tickets
    total_completed = sum(ach.tickets_completed for ach in achievements)
    
    return jsonify({
        'success': True,
        'achievements': {
            'totalCompleted': total_completed,
            'daily': daily_stats,
            'weekly': weekly_stats
        }
    })

@app.route('/api/admin/employee-stats', methods=['GET'])
def api_employee_stats():
    if 'user_id' not in session or session.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get all employees grouped by department
    employees = User.query.filter_by(role='employee').all()
    
    # Prepare employee stats
    employee_stats = []
    
    for emp in employees:
        # Get assigned tickets
        assigned_tickets = Ticket.query.filter_by(assigned_to_id=emp.id).all()
        open_tickets = [t for t in assigned_tickets if t.status == 'open']
        completed_tickets = [t for t in assigned_tickets if t.status == 'done']
        
        # Get weekly stats
        today = date.today()
        this_week = get_week_number(today)
        
        # Get last week's date
        last_week_date = today.replace(day=today.day-7)
        last_week = get_week_number(last_week_date)
        
        # Get achievements for these weeks
        this_week_stats = Achievement.query.filter_by(user_id=emp.id, week=this_week).all()
        last_week_stats = Achievement.query.filter_by(user_id=emp.id, week=last_week).all()
        
        this_week_completed = sum(stat.tickets_completed for stat in this_week_stats)
        last_week_completed = sum(stat.tickets_completed for stat in last_week_stats)
        
        # Get total completed tickets
        total_completed = sum(ach.tickets_completed for ach in emp.achievements)
        
        employee_stats.append({
            'username': emp.username,
            'department': emp.department,
            'totalAssigned': len(assigned_tickets),
            'totalOpen': len(open_tickets),
            'totalCompleted': total_completed,
            'thisWeek': this_week_completed,
            'lastWeek': last_week_completed
        })
    
    return jsonify({
        'success': True,
        'employeeStats': employee_stats
    })

@app.route('/api/warnings', methods=['GET', 'POST'])
def api_warnings():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    if request.method == 'GET':
        # Get all warnings
        warnings = Warning.query.order_by(Warning.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'warnings': [warning.to_dict() for warning in warnings]
        })
    
    elif request.method == 'POST':
        # Only admins can create warnings
        if user.role != 'admin':
            return jsonify({'success': False, 'message': 'Only managers can create warnings'}), 403
        
        data = request.get_json()
        
        # Validate request data
        required_fields = ['title', 'message', 'priority']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Create new warning
        warning = Warning(
            title=data['title'],
            message=data['message'],
            priority=data['priority'],
            created_by_id=user_id,
            created_at=datetime.utcnow()
        )
        
        db.session.add(warning)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'warning': warning.to_dict()
        })

@app.route('/api/warnings/<int:warning_id>', methods=['DELETE'])
def api_warning_detail(warning_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    user_id = session['user_id']
    user = User.query.get(user_id)
    
    # Only admins can delete warnings
    if user.role != 'admin':
        return jsonify({'success': False, 'message': 'Only managers can delete warnings'}), 403
    
    # Find warning
    warning = Warning.query.get(warning_id)
    if not warning:
        return jsonify({'success': False, 'message': 'Warning not found'}), 404
    
    # Delete warning
    db.session.delete(warning)
    db.session.commit()
    
    return jsonify({'success': True})

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
