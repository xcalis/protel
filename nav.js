// nav.js - Handles navigation functionality for PROTEL Ticket System

document.addEventListener('DOMContentLoaded', function() {
    // Toggle mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('nav ul');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }
    
    // Highlight active navigation item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
    
    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // If on logout page, confirm logout
            if (currentPath === '/logout') {
                const confirmLogout = document.getElementById('confirm-logout');
                const cancelLogout = document.getElementById('cancel-logout');
                
                if (confirmLogout) {
                    confirmLogout.addEventListener('click', function() {
                        localStorage.removeItem('protel_user');
                        window.location.href = '/';
                    });
                }
                
                if (cancelLogout) {
                    cancelLogout.addEventListener('click', function() {
                        window.location.href = '/dashboard';
                    });
                }
            } else {
                // Otherwise, redirect to logout page
                window.location.href = '/logout';
            }
        });
    }
});
