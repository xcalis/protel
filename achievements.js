// achievements.js - Handles achievements functionality for PROTEL Ticket System

// Get achievements for current user from API
async function getCurrentUserAchievements() {
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

// Format date for display (DD/MM/YYYY)
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// Get week label from week number (e.g., "2023-W1" -> "Week 1, 2023")
function formatWeekLabel(weekString) {
    const [year, week] = weekString.split('-W');
    return `Week ${week}, ${year}`;
}

// Initialize achievements page
async function initAchievementsPage() {
    const achievementsContainer = document.getElementById('achievements-container');
    const dailyStatsContainer = document.getElementById('daily-stats');
    const weeklyStatsContainer = document.getElementById('weekly-stats');
    const dailyTab = document.getElementById('daily-tab');
    const weeklyTab = document.getElementById('weekly-tab');
    
    if (!achievementsContainer) return;
    
    // Show loading state
    achievementsContainer.innerHTML = '<div class="text-center"><p>Loading achievements...</p></div>';
    
    try {
        // Get achievements for current user
        const achievements = await getCurrentUserAchievements();
        
        if (!achievements) {
            achievementsContainer.innerHTML = '<div class="card"><p class="text-center">No achievements found.</p></div>';
            return;
        }
        
        // Clear loading state
        achievementsContainer.innerHTML = '';
        
        // Display total completed tickets
        document.getElementById('total-completed').textContent = achievements.totalCompleted || 0;
    
        // Prepare data for daily stats
        const dailyData = Object.entries(achievements.daily || {})
            .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
            .slice(0, 7) // Last 7 days
            .reverse();
        
        // Prepare data for weekly stats
        const weeklyData = Object.entries(achievements.weekly || {})
            .sort(([weekA], [weekB]) => weekB.localeCompare(weekA))
            .slice(0, 4) // Last 4 weeks
            .reverse();
    
        // Display daily stats
        if (dailyData.length === 0) {
            dailyStatsContainer.innerHTML = '<div class="card"><p class="text-center">No daily statistics available.</p></div>';
        } else {
            // Create chart for daily stats
            const dailyLabels = dailyData.map(([date]) => formatDate(date));
            const dailyValues = dailyData.map(([, count]) => count);
            
            // Display daily data in a table
            let dailyTableHTML = `
                <div class="card">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Tickets Completed</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            dailyData.forEach(([date, count]) => {
                dailyTableHTML += `
                    <tr>
                        <td>${formatDate(date)}</td>
                        <td>${count}</td>
                    </tr>
                `;
            });
            
            dailyTableHTML += `
                        </tbody>
                    </table>
                </div>
            `;
            
            dailyStatsContainer.innerHTML = dailyTableHTML;
            
            // Use Chart.js to render a chart (if required)
            if (window.Chart) {
                const dailyChartCanvas = document.createElement('canvas');
                dailyChartCanvas.id = 'daily-chart';
                dailyChartCanvas.height = 200;
                
                // Insert chart before table
                dailyStatsContainer.insertAdjacentElement('afterbegin', dailyChartCanvas);
                
                new Chart(dailyChartCanvas, {
                    type: 'bar',
                    data: {
                        labels: dailyLabels,
                        datasets: [{
                            label: 'Tickets Completed',
                            data: dailyValues,
                            backgroundColor: '#007aff',
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                stepSize: 1
                            }
                        }
                    }
                });
            }
        }
        
        // Display weekly stats
        if (weeklyData.length === 0) {
            weeklyStatsContainer.innerHTML = '<div class="card"><p class="text-center">No weekly statistics available.</p></div>';
        } else {
            // Create chart for weekly stats
            const weeklyLabels = weeklyData.map(([week]) => formatWeekLabel(week));
            const weeklyValues = weeklyData.map(([, count]) => count);
            
            // Display weekly data in a table
            let weeklyTableHTML = `
                <div class="card">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Week</th>
                                <th>Tickets Completed</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            weeklyData.forEach(([week, count]) => {
                weeklyTableHTML += `
                    <tr>
                        <td>${formatWeekLabel(week)}</td>
                        <td>${count}</td>
                    </tr>
                `;
            });
            
            weeklyTableHTML += `
                        </tbody>
                    </table>
                </div>
            `;
            
            weeklyStatsContainer.innerHTML = weeklyTableHTML;
            
            // Use Chart.js to render a chart (if required)
            if (window.Chart) {
                const weeklyChartCanvas = document.createElement('canvas');
                weeklyChartCanvas.id = 'weekly-chart';
                weeklyChartCanvas.height = 200;
                
                // Insert chart before table
                weeklyStatsContainer.insertAdjacentElement('afterbegin', weeklyChartCanvas);
                
                new Chart(weeklyChartCanvas, {
                    type: 'bar',
                    data: {
                        labels: weeklyLabels,
                        datasets: [{
                            label: 'Tickets Completed',
                            data: weeklyValues,
                            backgroundColor: '#007aff',
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                stepSize: 1
                            }
                        }
                    }
                });
            }
        }
        
        // Toggle between daily and weekly views
        if (dailyTab && weeklyTab) {
            // Show daily stats by default
            dailyStatsContainer.style.display = 'block';
            weeklyStatsContainer.style.display = 'none';
            dailyTab.classList.add('active');
            
            dailyTab.addEventListener('click', function() {
                dailyStatsContainer.style.display = 'block';
                weeklyStatsContainer.style.display = 'none';
                dailyTab.classList.add('active');
                weeklyTab.classList.remove('active');
            });
            
            weeklyTab.addEventListener('click', function() {
                dailyStatsContainer.style.display = 'none';
                weeklyStatsContainer.style.display = 'block';
                weeklyTab.classList.add('active');
                dailyTab.classList.remove('active');
            });
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
        achievementsContainer.innerHTML = '<div class="card"><p class="text-center text-error">Error loading achievements. Please try again later.</p></div>';
    }
}

// Initialize achievement functionality on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check which page we're on
    const currentPath = window.location.pathname;
    
    if (currentPath === '/my-achievements') {
        await initAchievementsPage();
    }
});
