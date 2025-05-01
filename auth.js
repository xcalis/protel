// auth.js - Handles authentication for PROTEL Ticket System

// Store user data in session storage
let currentUser = null;
let employeeList = [];

// Check if user is logged in
function isLoggedIn() {
    return currentUser !== null;
}

// Get current user details
function getCurrentUser() {
    return currentUser;
}

// Check if current user is admin
function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

// Make API call
async function apiCall(url, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin' // Include cookies for session authentication
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        // Check for errors
        if (!response.ok) {
            console.log('API error for URL:', url, 'Status:', response.status, 'Response:', result);
            throw new Error(result.message || 'An error occurred');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Make apiCall available globally
window.apiCall = apiCall;

// Authenticate user
async function authenticateUser(username, password, rememberMe) {
    try {
        const result = await apiCall('/api/auth/login', 'POST', { username, password });
        
        if (result.success) {
            // Save user info
            currentUser = result.user;
            
            // If admin, fetch employees list
            if (currentUser.role === 'admin') {
                fetchEmployees();
            }
            
            return result;
        }
        
        return { success: false, message: 'Authentication failed' };
    } catch (error) {
        return { success: false, message: error.message || 'Authentication failed' };
    }
}

// Fetch list of employees (for admin use)
async function fetchEmployees() {
    try {
        const result = await apiCall('/api/employees');
        if (result.success) {
            employeeList = result.employees;
            // Make employees available globally for ticket assignment
            window.employeeList = employeeList;
        }
    } catch (error) {
        console.error('Error fetching employees:', error);
    }
}

// Check current user session
async function checkCurrentUser() {
    try {
        const result = await apiCall('/api/auth/current-user');
        if (result.success) {
            currentUser = result.user;
            
            // If admin, fetch employees list
            if (currentUser.role === 'admin') {
                await fetchEmployees();
            }
            
            return currentUser;
        }
        return null;
    } catch (error) {
        console.log('Error in checkCurrentUser:', error);
        return null;
    }
}

// Logout user
async function logoutUser() {
    try {
        await apiCall('/api/auth/logout', 'POST');
        currentUser = null;
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout anyway
        currentUser = null;
        window.location.href = '/';
    }
}

// Protect pages based on authentication
async function protectPage() {
    const user = await checkCurrentUser();
    if (!user) {
        window.location.href = '/';
    }
}

// Protect admin pages
async function protectAdminPage() {
    const user = await checkCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = '/dashboard';
    }
}

// Initialize login page
function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const roleToggles = document.querySelectorAll('.role-toggle button');
    
    // Toggle between admin and employee role selection
    roleToggles.forEach(button => {
        button.addEventListener('click', function() {
            roleToggles.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('role').value = this.dataset.role;
        });
    });
    
    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;
            
            try {
                const result = await authenticateUser(username, password, rememberMe);
                
                if (result.success) {
                    // Redirect based on role
                    if (result.user.role === 'admin') {
                        window.location.href = '/admin-panel';
                    } else {
                        window.location.href = '/dashboard';
                    }
                } else {
                    // Show error message
                    errorMessage.textContent = result.message;
                    errorMessage.style.display = 'block';
                    
                    // Reset button
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
            } catch (error) {
                // Show error message
                errorMessage.textContent = error.message || 'Login failed. Please try again.';
                errorMessage.style.display = 'block';
                
                // Reset button
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }
    
    // Check if user is already logged in
    checkCurrentUser().then(user => {
        if (user) {
            // Redirect based on role
            if (user.role === 'admin') {
                window.location.href = '/admin-panel';
            } else {
                window.location.href = '/dashboard';
            }
        }
    });
}

// Initialize auth functionality on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check user session
    await checkCurrentUser();
    
    // If on login page, initialize login functionality
    if (document.getElementById('login-form')) {
        initLoginPage();
    }
    
    // Protect pages based on URL
    const currentPath = window.location.pathname;
    
    if (currentPath === '/admin-panel') {
        await protectAdminPage();
    } else if (currentPath !== '/' && currentPath !== '/login') {
        await protectPage();
    }
    
    // Update UI with user info if logged in
    if (isLoggedIn()) {
        const user = getCurrentUser();
        const userDisplayElements = document.querySelectorAll('.user-display');
        
        userDisplayElements.forEach(element => {
            element.textContent = user.username;
        });
        
        // Show/hide elements based on role
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = isAdmin() ? 'block' : 'none';
        });
    }
});
