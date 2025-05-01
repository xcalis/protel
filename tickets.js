// tickets.js - Handles ticket functionality for PROTEL Ticket System using the API

// Use apiCall function from auth.js
// const apiCall = window.apiCall || async function(url, method = 'GET', data = null) { /* ... */ };

// Get all tickets from the server
async function getAllTickets() {
    try {
        const result = await apiCall('/api/tickets');
        if (result.success) {
            return result.tickets;
        }
        return [];
    } catch (error) {
        console.error('Error getting tickets:', error);
        return [];
    }
}

// Get tickets for the current user
async function getUserTickets() {
    try {
        // The API already filters tickets based on user role
        const result = await apiCall('/api/tickets');
        if (result.success) {
            return result.tickets;
        }
        return [];
    } catch (error) {
        console.error('Error getting user tickets:', error);
        return [];
    }
}

// Get ticket by ID
async function getTicketById(ticketId) {
    try {
        const result = await apiCall(`/api/tickets/${ticketId}`);
        if (result.success) {
            return result.ticket;
        }
        return null;
    } catch (error) {
        console.error('Error getting ticket details:', error);
        return null;
    }
}

// Create a new ticket - only admin can create tickets
async function createTicket(ticketData) {
    try {
        const result = await apiCall('/api/tickets', 'POST', ticketData);
        return result;
    } catch (error) {
        console.error('Error creating ticket:', error);
        return { success: false, message: error.message || 'Failed to create ticket' };
    }
}

// Update ticket status
async function updateTicketStatus(ticketId, status, resolution) {
    try {
        const updateData = { status };
        if (resolution) {
            updateData.resolution = resolution;
        }
        
        const result = await apiCall(`/api/tickets/${ticketId}`, 'PUT', updateData);
        return result;
    } catch (error) {
        console.error('Error updating ticket:', error);
        return { success: false, message: error.message || 'Failed to update ticket' };
    }
}

// Get user achievements from the server
async function getUserAchievements() {
    try {
        const result = await apiCall('/api/achievements');
        if (result.success) {
            return result.achievements;
        }
        return { totalCompleted: 0, daily: {}, weekly: {} };
    } catch (error) {
        console.error('Error getting achievements:', error);
        return { totalCompleted: 0, daily: {}, weekly: {} };
    }
}

// Initialize tickets page
async function initTicketsPage() {
    const ticketsContainer = document.getElementById('tickets-container');
    if (!ticketsContainer) return;
    
    // Show loading state
    ticketsContainer.innerHTML = '<div class="text-center"><p>Loading tickets...</p></div>';
    
    try {
        // Get user tickets from API
        const tickets = await getUserTickets();
        
        // Display tickets
        if (!tickets || tickets.length === 0) {
            ticketsContainer.innerHTML = '<div class="card"><p class="text-center">No tickets found.</p></div>';
        } else {
            let ticketsHTML = '';
            
            tickets.forEach(ticket => {
                const createdDate = new Date(ticket.created_at).toLocaleString();
                const statusClass = ticket.status === 'open' ? 'status-open' : 'status-done';
                
                ticketsHTML += `
                    <div class="ticket card fade-in">
                        <div class="ticket-header">
                            <h3 class="ticket-title">${ticket.subject}</h3>
                            <span class="ticket-status ${statusClass}">${ticket.status}</span>
                        </div>
                        <div class="ticket-content">
                            <p><strong>Customer:</strong> ${ticket.customer_name}</p>
                            <p><strong>Created:</strong> ${createdDate}</p>
                            <p><strong>Description:</strong> ${ticket.description.substring(0, 100)}${ticket.description.length > 100 ? '...' : ''}</p>
                        </div>
                        <div class="ticket-actions">
                            <a href="/ticket-details?id=${ticket.ticket_id}" class="btn">View Details</a>
                        </div>
                    </div>
                `;
            });
            
            ticketsContainer.innerHTML = ticketsHTML;
        }
    } catch (error) {
        console.error('Failed to initialize tickets page:', error);
        ticketsContainer.innerHTML = '<div class="card"><p class="text-center text-error">Error loading tickets. Please try again later.</p></div>';
    }
}

// Initialize add ticket page
async function initAddTicketPage() {
    const addTicketForm = document.getElementById('add-ticket-form');
    const ticketFormContainer = document.getElementById('ticket-form-container');
    
    if (!addTicketForm || !ticketFormContainer) return;
    
    try {
        // Check current user from API
        const currentUser = getCurrentUser();
        
        if (!currentUser || currentUser.role !== 'admin') {
            // Redirect non-admin users
            ticketFormContainer.innerHTML = `
                <div class="card">
                    <p class="text-center">Only managers can create and assign tickets.</p>
                    <div class="text-center mt-3">
                        <a href="/dashboard" class="btn">Back to Dashboard</a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Populate employee dropdown for assignment
        const employeeDropdown = document.getElementById('assigned-employee');
        if (employeeDropdown) {
            // Show loading state
            employeeDropdown.innerHTML = '<option value="">Loading employees...</option>';
            
            // Get employees from the API via auth.js
            try {
                // Get from window.employeeList populated by auth.js
                const employees = window.employeeList || [];
                
                // Clear loading option
                employeeDropdown.innerHTML = '';
                
                if (employees.length === 0) {
                    employeeDropdown.innerHTML = '<option value="">No employees available</option>';
                } else {
                    // Add default empty option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.textContent = 'Select an employee';
                    employeeDropdown.appendChild(defaultOption);
                    
                    // Add employee options
                    employees.forEach(emp => {
                        const option = document.createElement('option');
                        option.value = emp.username;
                        option.textContent = `${emp.username} (${emp.department || 'No Department'})`;
                        employeeDropdown.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error loading employees:', error);
                employeeDropdown.innerHTML = '<option value="">Error loading employees</option>';
            }
        }
        
        // Handle form submission
        addTicketForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Creating ticket...';
            submitButton.disabled = true;
            
            // Hide messages
            document.getElementById('success-message').style.display = 'none';
            document.getElementById('error-message').style.display = 'none';
            
            const ticketData = {
                customerName: document.getElementById('customer-name').value,
                customerPhone: document.getElementById('customer-phone').value,
                customerAddress: document.getElementById('customer-address').value,
                subject: document.getElementById('ticket-subject').value,
                description: document.getElementById('ticket-description').value,
                priority: document.getElementById('ticket-priority').value,
                assignedTo: document.getElementById('assigned-employee').value
            };
            
            try {
                const result = await createTicket(ticketData);
                
                if (result.success) {
                    // Show success message
                    document.getElementById('success-message').style.display = 'block';
                    
                    // Reset form
                    addTicketForm.reset();
                    
                    // Redirect after a delay
                    setTimeout(() => {
                        window.location.href = '/tickets';
                    }, 2000);
                } else {
                    // Show error message
                    document.getElementById('error-message').textContent = result.message;
                    document.getElementById('error-message').style.display = 'block';
                    
                    // Reset button
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
            } catch (error) {
                // Show error message
                document.getElementById('error-message').textContent = error.message || 'Failed to create ticket. Please try again.';
                document.getElementById('error-message').style.display = 'block';
                
                // Reset button
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    } catch (error) {
        console.error('Failed to initialize add ticket page:', error);
        ticketFormContainer.innerHTML = '<div class="card"><p class="text-center text-error">Error initializing page. Please try again later.</p></div>';
    }
}

// Initialize ticket details page
async function initTicketDetailsPage() {
    const ticketDetailsContainer = document.getElementById('ticket-details-container');
    const completeTicketForm = document.getElementById('complete-ticket-form');
    
    if (!ticketDetailsContainer) return;
    
    // Show loading state
    ticketDetailsContainer.innerHTML = '<div class="text-center"><p>Loading ticket details...</p></div>';
    
    // Get ticket ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    
    if (!ticketId) {
        ticketDetailsContainer.innerHTML = '<div class="card"><p class="text-center">Invalid ticket ID.</p></div>';
        return;
    }
    
    try {
        // Get ticket details from API
        const ticket = await getTicketById(ticketId);
        
        if (!ticket) {
            ticketDetailsContainer.innerHTML = '<div class="card"><p class="text-center">Ticket not found.</p></div>';
            return;
        }
        
        // Display ticket details
        const createdDate = new Date(ticket.created_at).toLocaleString();
        const updatedDate = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'Not updated';
        const statusClass = ticket.status === 'open' ? 'status-open' : 'status-done';
        
        const ticketHTML = `
            <div class="ticket-detail-header">
                <h1>${ticket.subject}</h1>
                <span class="ticket-status ${statusClass}">${ticket.status}</span>
            </div>
            
            <div class="ticket-details card">
                <div class="ticket-section">
                    <h3 class="ticket-section-title">Customer Information</h3>
                    <p><strong>Name:</strong> ${ticket.customer_name}</p>
                    <p><strong>Phone:</strong> ${ticket.customer_phone}</p>
                    <p><strong>Address:</strong> ${ticket.customer_address}</p>
                </div>
                
                <div class="ticket-section">
                    <h3 class="ticket-section-title">Ticket Information</h3>
                    <p><strong>Created by:</strong> ${ticket.created_by}</p>
                    <p><strong>Created on:</strong> ${createdDate}</p>
                    <p><strong>Assigned to:</strong> ${ticket.assigned_to}</p>
                    <p><strong>Updated on:</strong> ${updatedDate}</p>
                    ${ticket.updated_by ? `<p><strong>Updated by:</strong> ${ticket.updated_by}</p>` : ''}
                    <p><strong>Priority:</strong> ${ticket.priority}</p>
                </div>
                
                <div class="ticket-section">
                    <h3 class="ticket-section-title">Description</h3>
                    <p>${ticket.description}</p>
                </div>
                
                ${ticket.resolution ? `
                    <div class="ticket-section">
                        <h3 class="ticket-section-title">Resolution</h3>
                        <p>${ticket.resolution}</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        ticketDetailsContainer.innerHTML = ticketHTML;
        
        // Handle ticket completion
        if (completeTicketForm && ticket.status === 'open') {
            completeTicketForm.style.display = 'block';
            
            completeTicketForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Show loading state
                const submitButton = this.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Completing ticket...';
                submitButton.disabled = true;
                
                // Hide messages
                document.getElementById('error-message').style.display = 'none';
                
                const resolution = document.getElementById('resolution-note').value;
                
                try {
                    const result = await updateTicketStatus(ticketId, 'done', resolution);
                    
                    if (result.success) {
                        // Reload page to show updated ticket
                        window.location.reload();
                    } else {
                        // Show error message
                        document.getElementById('error-message').textContent = result.message;
                        document.getElementById('error-message').style.display = 'block';
                        
                        // Reset button
                        submitButton.textContent = originalText;
                        submitButton.disabled = false;
                    }
                } catch (error) {
                    // Show error message
                    document.getElementById('error-message').textContent = error.message || 'Failed to update ticket. Please try again.';
                    document.getElementById('error-message').style.display = 'block';
                    
                    // Reset button
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
            });
        } else if (completeTicketForm) {
            completeTicketForm.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load ticket details:', error);
        ticketDetailsContainer.innerHTML = '<div class="card"><p class="text-center text-error">Error loading ticket details. Please try again later.</p></div>';
    }
}

// Initialize tickets functionality on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check which page we're on
    const currentPath = window.location.pathname;
    
    if (currentPath === '/tickets') {
        await initTicketsPage();
    } else if (currentPath === '/add-ticket') {
        await initAddTicketPage();
    } else if (currentPath === '/ticket-details') {
        await initTicketDetailsPage();
    }
});
