// admin.js - Handles admin functionality for PROTEL Ticket System

// Get all warnings from API
async function getAllWarnings() {
    try {
        const result = await apiCall('/api/warnings');
        if (result.success) {
            return result.warnings;
        }
        return [];
    } catch (error) {
        console.error('Error getting warnings:', error);
        return [];
    }
}

// Create a new warning via API
async function createWarning(warningData) {
    try {
        const result = await apiCall('/api/warnings', 'POST', warningData);
        return result;
    } catch (error) {
        console.error('Error creating warning:', error);
        return { success: false, message: error.message || 'Failed to create warning' };
    }
}

// Delete a warning via API
async function deleteWarning(warningId) {
    try {
        const result = await apiCall(`/api/warnings/${warningId}`, 'DELETE');
        return result;
    } catch (error) {
        console.error('Error deleting warning:', error);
        return { success: false, message: error.message || 'Failed to delete warning' };
    }
}

// Get all employee performance statistics from API
async function getAllEmployeeStats() {
    try {
        const result = await apiCall('/api/admin/employee-stats');
        if (result.success) {
            return result.employeeStats;
        }
        return [];
    } catch (error) {
        console.error('Error getting employee stats:', error);
        return [];
    }
}

// Initialize admin panel page
async function initAdminPanelPage() {
    try {
        // Check if user is admin
        const user = await checkCurrentUser();
        if (!user || user.role !== 'admin') {
            window.location.href = '/dashboard';
            return;
        }
        
        const warningForm = document.getElementById('warning-form');
        const warningsContainer = document.getElementById('warnings-container');
        const employeeStatsContainer = document.getElementById('employee-stats-container');
        
        // Display employee performance stats if container exists
        if (employeeStatsContainer) {
            await displayEmployeeStats();
        }
        
        // Handle warning form submission
        if (warningForm && warningsContainer) {
            warningForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const warningData = {
                    title: document.getElementById('warning-title').value,
                    message: document.getElementById('warning-message').value,
                    priority: document.getElementById('warning-priority').value
                };
                
                const result = await createWarning(warningData);
                
                if (result.success) {
                    // Reset form
                    warningForm.reset();
                    
                    // Refresh warnings list
                    await displayWarnings();
                    
                    // Show success message
                    document.getElementById('success-message').style.display = 'block';
                    setTimeout(() => {
                        document.getElementById('success-message').style.display = 'none';
                    }, 3000);
                }
            });
            
            // Display warnings on page load
            await displayWarnings();
        }
    } catch (error) {
        console.error('Error initializing admin panel:', error);
    }
    
    // Display employee statistics
    async function displayEmployeeStats() {
        try {
            const employeeStats = await getAllEmployeeStats();
            
            if (!employeeStats || employeeStats.length === 0) {
                employeeStatsContainer.innerHTML = '<div class="card"><p class="text-center">No employee statistics available.</p></div>';
                return;
            }
            
            // Group employees by department
            const departments = {};
            employeeStats.forEach(emp => {
                if (!departments[emp.department]) {
                    departments[emp.department] = [];
                }
                departments[emp.department].push(emp);
            });
            
            let statsHTML = '';
            
            // Display stats for each department
            Object.entries(departments).forEach(([department, employees]) => {
                statsHTML += `
                    <div class="card mb-3 fade-in">
                        <h3 class="mb-2">${department}</h3>
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Total Assigned</th>
                                        <th>Open Tickets</th>
                                        <th>Completed</th>
                                        <th>This Week</th>
                                        <th>Last Week</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                employees.forEach(emp => {
                    // Get weekly stats
                    const thisWeek = emp.weeklyStats[0] ? emp.weeklyStats[0][1] : 0;
                    const lastWeek = emp.weeklyStats[1] ? emp.weeklyStats[1][1] : 0;
                    
                    statsHTML += `
                        <tr>
                            <td>${emp.username}</td>
                            <td>${emp.totalAssigned}</td>
                            <td>${emp.totalOpen}</td>
                            <td>${emp.totalCompleted}</td>
                            <td>${thisWeek}</td>
                            <td>${lastWeek}</td>
                        </tr>
                    `;
                });
                
                statsHTML += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            
            employeeStatsContainer.innerHTML = statsHTML;
        } catch (error) {
            console.error('Error displaying employee stats:', error);
            employeeStatsContainer.innerHTML = '<div class="card"><p class="text-center text-error">Error loading employee statistics. Please try again later.</p></div>';
        }
    }
    
    // Display existing warnings
    async function displayWarnings() {
        try {
            const warnings = await getAllWarnings();
            
            if (!warnings || warnings.length === 0) {
                warningsContainer.innerHTML = '<div class="card"><p class="text-center">No warnings or announcements.</p></div>';
                return;
            }
            
            let warningsHTML = '';
            
            warnings.forEach(warning => {
                const createdDate = new Date(warning.created_at || warning.createdAt).toLocaleString();
                const priorityClass = warning.priority === 'high' ? 'btn-danger' : 
                                    warning.priority === 'medium' ? 'btn-warning' : 'btn-outline';
                
                warningsHTML += `
                    <div class="admin-announcement card fade-in">
                        <div class="card-header">
                            <h3>${warning.title}</h3>
                            <span class="${priorityClass} p-1">${warning.priority} priority</span>
                        </div>
                        <p class="mb-2">Posted on: ${createdDate}</p>
                        <p class="mb-3">${warning.message}</p>
                        <div class="text-right">
                            <button class="btn btn-danger delete-warning" data-id="${warning.id}">Delete</button>
                        </div>
                    </div>
                `;
            });
            
            warningsContainer.innerHTML = warningsHTML;
            
            // Add event listeners to delete buttons
            const deleteButtons = document.querySelectorAll('.delete-warning');
            deleteButtons.forEach(button => {
                button.addEventListener('click', async function() {
                    const warningId = this.dataset.id;
                    const result = await deleteWarning(warningId);
                    
                    if (result.success) {
                        // Refresh warnings list
                        await displayWarnings();
                    }
                });
            });
        } catch (error) {
            console.error('Error displaying warnings:', error);
            warningsContainer.innerHTML = '<div class="card"><p class="text-center text-error">Error loading warnings. Please try again later.</p></div>';
        }
    }
}

// Initialize warnings page
async function initWarningsPage() {
    const warningsContainer = document.getElementById('warnings-container');
    if (!warningsContainer) return;
    
    try {
        // Show loading state
        warningsContainer.innerHTML = '<div class="text-center"><p>Loading warnings...</p></div>';
        
        // Get all warnings from API
        const warnings = await getAllWarnings();
        
        // Display warnings
        if (!warnings || warnings.length === 0) {
            warningsContainer.innerHTML = '<div class="card"><p class="text-center">No warnings or announcements.</p></div>';
        } else {
            let warningsHTML = '';
            
            warnings.forEach(warning => {
                const createdDate = new Date(warning.created_at || warning.createdAt).toLocaleString();
                const priorityClass = warning.priority === 'high' ? 'btn-danger' : 
                                    warning.priority === 'medium' ? 'btn-warning' : 'btn-outline';
                
                warningsHTML += `
                    <div class="warning-message fade-in">
                        <div class="warning-header">
                            <h3>${warning.title} <span class="${priorityClass} p-1">${warning.priority} priority</span></h3>
                            <p class="warning-date">Posted on: ${createdDate}</p>
                        </div>
                        <p>${warning.message}</p>
                    </div>
                `;
            });
            
            warningsContainer.innerHTML = warningsHTML;
        }
    } catch (error) {
        console.error('Error initializing warnings page:', error);
        warningsContainer.innerHTML = '<div class="card"><p class="text-center text-error">Error loading warnings. Please try again later.</p></div>';
    }
}

// Initialize admin functionality on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check which page we're on
    const currentPath = window.location.pathname;
    
    if (currentPath === '/admin-panel') {
        await initAdminPanelPage();
    } else if (currentPath === '/warnings') {
        await initWarningsPage();
    }
});
