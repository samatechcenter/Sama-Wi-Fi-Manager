// Default credentials
const DEFAULT_CREDENTIALS = {
    username: '/1/1/1',
    password: '//////'
};

// Initialize app variables
let clients = [];
let expenses = [];
let dailyReports = [];
let employeeName = 'Admin';
let currentUser = null;

// Updated Ticket management variables - tracking by type
let ticketInventory = {
    types: {
        '1hour': { available: 0, usedToday: 0, totalUsed: 0 },
        '2hours': { available: 0, usedToday: 0, totalUsed: 0 },
        'daily': { available: 0, usedToday: 0, totalUsed: 0 },
        'weekly': { available: 0, usedToday: 0, totalUsed: 0 },
        'monthly': { available: 0, usedToday: 0, totalUsed: 0 }
    },
    history: [],
    lastRestockDate: null
};

const pricing = {
    '1hour': 1000,
    '2hours': 1500,
    'daily': 2000,
    'weekly': 14000,
    'monthly': 60000
};

const ticketTypeNames = {
    '1hour': '1 Hour',
    '2hours': '2 Hours',
    'daily': 'Day Pass',
    'weekly': 'Weekly Pass',
    'monthly': 'Monthly Pass'
};

// ==================== AUTHENTICATION FUNCTIONS ====================

// Load saved credentials or use defaults
function loadCredentials() {
    const savedCreds = localStorage.getItem('wifiCredentials');
    if (savedCreds) {
        try {
            return JSON.parse(savedCreds);
        } catch (e) {
            return DEFAULT_CREDENTIALS;
        }
    }
    return DEFAULT_CREDENTIALS;
}

// Save new credentials
function saveCredentials(username, password) {
    const credentials = { username, password };
    localStorage.setItem('wifiCredentials', JSON.stringify(credentials));
}

// Check if user is logged in
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const user = sessionStorage.getItem('currentUser');
    
    if (isLoggedIn === 'true' && user) {
        currentUser = user;
        showMainApp();
    } else {
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').classList.add('active');
    loadData();
    loadTicketData();
    displayDate();
    updateDisplay();
    updateTicketDisplay();
}

// Login form submission with saved credentials
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    // Load saved credentials
    const credentials = loadCredentials();
    
    if (username === credentials.username && password === credentials.password) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('currentUser', username);
        currentUser = username;
        showMainApp();
        showNotification('Login successful! Welcome back.');
    } else {
        showNotification('Invalid username or password!', 'error');
    }
});

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        showLoginPage();
        document.getElementById('loginForm').reset();
    }
}

// ==================== PASSWORD MANAGEMENT ====================

// Open password modal
function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('changePasswordForm').reset();
}

// Close password modal
function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

// Change password form submission
document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newUsername = document.getElementById('newUsername').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Load current credentials
    const currentCreds = loadCredentials();
    
    // Verify current password
    if (currentPassword !== currentCreds.password) {
        showNotification('Current password is incorrect!', 'error');
        return;
    }
    
    // Validate new password
    if (newPassword.length < 6) {
        showNotification('New password must be at least 6 characters!', 'error');
        return;
    }
    
    // Check password match
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match!', 'error');
        return;
    }
    
    // Save new credentials
    saveCredentials(newUsername, newPassword);
    
    closePasswordModal();
    showNotification('Login credentials updated successfully! Please login again.');
    
    // Logout after 2 seconds
    setTimeout(() => {
        logout();
    }, 2000);
});

// ==================== DATA MANAGEMENT FUNCTIONS ====================

function loadData() {
    try {
        const savedClients = localStorage.getItem('wifiClients');
        const savedExpenses = localStorage.getItem('wifiExpenses');
        const savedReports = localStorage.getItem('dailyReports');
        const savedEmployee = localStorage.getItem('employeeName');
        
        if (savedClients) {
            clients = JSON.parse(savedClients);
        }
        
        if (savedExpenses) {
            expenses = JSON.parse(savedExpenses);
        }
        
        if (savedReports) {
            dailyReports = JSON.parse(savedReports);
        }
        
        if (savedEmployee) {
            employeeName = savedEmployee;
            document.getElementById('employeeName').textContent = employeeName;
            document.getElementById('employeeNameInput').value = employeeName;
        }
        
        document.getElementById('filterDate').value = new Date().toISOString().split('T')[0];
    } catch (error) {
        console.error('Error loading data:', error);
        clients = [];
        expenses = [];
        dailyReports = [];
    }
}

function saveData() {
    try {
        localStorage.setItem('wifiClients', JSON.stringify(clients));
        localStorage.setItem('wifiExpenses', JSON.stringify(expenses));
        localStorage.setItem('dailyReports', JSON.stringify(dailyReports));
        localStorage.setItem('employeeName', employeeName);
    } catch (error) {
        console.error('Error saving data:', error);
        showNotification('Error saving data!', 'error');
    }
}

// ==================== TICKET MANAGEMENT FUNCTIONS (UPDATED WITH FIXES) ====================

function loadTicketData() {
    try {
        const savedTickets = localStorage.getItem('ticketInventoryByType');
        if (savedTickets) {
            ticketInventory = JSON.parse(savedTickets);
            
            // Reset daily count if it's a new day
            const today = new Date().toISOString().split('T')[0];
            const lastUsedDate = localStorage.getItem('lastTicketUsedDate');
            if (lastUsedDate !== today) {
                Object.keys(ticketInventory.types).forEach(type => {
                    ticketInventory.types[type].usedToday = 0;
                });
                localStorage.setItem('lastTicketUsedDate', today);
                saveTicketData();
            }
        }
    } catch (error) {
        console.error('Error loading ticket data:', error);
    }
}

function saveTicketData() {
    try {
        localStorage.setItem('ticketInventoryByType', JSON.stringify(ticketInventory));
    } catch (error) {
        console.error('Error saving ticket data:', error);
    }
}

function updateTicketDisplay() {
    let totalAvailable = 0;
    let totalUsedToday = 0;
    let totalAllTime = 0;
    
    // Update individual ticket type displays
    Object.keys(ticketInventory.types).forEach(type => {
        const typeData = ticketInventory.types[type];
        
        // Update card displays
        const ticketElement = document.getElementById(`tickets-${type}`);
        const usedElement = document.getElementById(`used-${type}`);
        const statAvailElement = document.getElementById(`stat-available-${type}`);
        const statTodayElement = document.getElementById(`stat-today-${type}`);
        const statTotalElement = document.getElementById(`stat-total-${type}`);
        
        if (ticketElement) ticketElement.textContent = typeData.available;
        if (usedElement) usedElement.textContent = typeData.usedToday;
        if (statAvailElement) statAvailElement.textContent = typeData.available;
        if (statTodayElement) statTodayElement.textContent = typeData.usedToday;
        if (statTotalElement) statTotalElement.textContent = typeData.totalUsed;
        
        // Calculate totals
        totalAvailable += typeData.available;
        totalUsedToday += typeData.usedToday;
        totalAllTime += typeData.totalUsed;
        
        // Add warning classes for low stock
        const card = ticketElement ? ticketElement.closest('.ticket-type-card') : null;
        if (card) {
            card.classList.remove('ticket-low-stock', 'ticket-out-stock');
            if (typeData.available === 0) {
                card.classList.add('ticket-out-stock');
            } else if (typeData.available < 5) {
                card.classList.add('ticket-low-stock');
            }
        }
    });
    
    // Update summary totals
    const totalAvailableElement = document.getElementById('totalAvailableTickets');
    const totalUsedTodayElement = document.getElementById('totalUsedToday');
    const totalAllTimeElement = document.getElementById('totalAllTime');
    
    if (totalAvailableElement) totalAvailableElement.textContent = totalAvailable;
    if (totalUsedTodayElement) totalUsedTodayElement.textContent = totalUsedToday;
    if (totalAllTimeElement) totalAllTimeElement.textContent = totalAllTime;
    
    // Update main dashboard displays
    document.getElementById('availableTickets').textContent = totalAvailable;
    document.getElementById('ticketBannerCount').textContent = totalAvailable;
    document.getElementById('sidebarTicketCount').textContent = totalAvailable;
    document.getElementById('sidebarUsedToday').textContent = totalUsedToday;
    
    // Update ticket alert styling
    const ticketAlert = document.getElementById('ticketAlertBanner');
    const ticketStatCard = document.getElementById('ticketStatCard');
    const ticketMessage = document.getElementById('ticketBannerMessage');
    
    if (totalAvailable === 0) {
        ticketAlert.classList.add('out');
        ticketAlert.classList.remove('low');
        ticketStatCard.classList.add('out');
        ticketStatCard.classList.remove('low');
        ticketMessage.textContent = '⚠️ OUT OF STOCK - Please restock immediately!';
    } else if (totalAvailable < 10) {
        ticketAlert.classList.add('low');
        ticketAlert.classList.remove('out');
        ticketStatCard.classList.add('low');
        ticketStatCard.classList.remove('out');
        ticketMessage.textContent = '⚠️ Low stock - Consider restocking soon';
    } else {
        ticketAlert.classList.remove('low', 'out');
        ticketStatCard.classList.remove('low', 'out');
        ticketMessage.textContent = 'Tickets in stock for clients';
    }
    
    // Update last restock info
    if (ticketInventory.lastRestockDate) {
        const restockDate = new Date(ticketInventory.lastRestockDate);
        const dateStr = restockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const lastRestockedElement = document.getElementById('lastRestocked');
        if (lastRestockedElement) lastRestockedElement.textContent = dateStr;
    }
}

function openTicketModal() {
    openBulkTicketModal();
}

function openTicketModalForType(type) {
    document.getElementById('ticketModal').classList.add('active');
    document.getElementById('ticketTypeInput').value = type;
    document.getElementById('modalTicketType').textContent = ticketTypeNames[type] + ' Tickets';
    
    const typeDisplay = document.getElementById('ticketTypeDisplay');
    const typeColors = {
        '1hour': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        '2hours': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'daily': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'weekly': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'monthly': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    };
    
    if (typeDisplay) {
        typeDisplay.style.background = typeColors[type];
        typeDisplay.style.color = 'white';
        typeDisplay.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 5px;">
                ${type === '1hour' ? '⏰' : type === '2hours' ? '⏱️' : type === 'daily' ? '☀️' : type === 'weekly' ? '📅' : '📆'}
            </div>
            ${ticketTypeNames[type]} - ${pricing[type].toLocaleString()} SSP
        `;
    }
    
    document.getElementById('modalCurrentStock').textContent = ticketInventory.types[type].available;
    document.getElementById('ticketAmount').value = '';
    document.getElementById('ticketNotes').value = '';
    updateModalPreview();
}

function closeTicketModal() {
    document.getElementById('ticketModal').classList.remove('active');
}

function updateModalPreview() {
    const type = document.getElementById('ticketTypeInput').value;
    const amount = parseInt(document.getElementById('ticketAmount').value) || 0;
    
    if (type && ticketInventory.types[type]) {
        const currentStock = ticketInventory.types[type].available;
        document.getElementById('modalAddingAmount').textContent = amount;
        document.getElementById('modalNewTotal').textContent = currentStock + amount;
    }
}

document.getElementById('ticketAmount').addEventListener('input', updateModalPreview);

document.getElementById('addTicketForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const type = document.getElementById('ticketTypeInput').value;
    const amount = parseInt(document.getElementById('ticketAmount').value);
    const notes = document.getElementById('ticketNotes').value.trim();
    
    if (!type || amount <= 0) {
        showNotification('Please enter a valid ticket amount!', 'error');
        return;
    }
    
    ticketInventory.types[type].available += amount;
    ticketInventory.lastRestockDate = new Date().toISOString();
    
    ticketInventory.history.push({
        date: new Date().toISOString(),
        type: 'restock',
        ticketType: type,
        amount: amount,
        balanceAfter: ticketInventory.types[type].available,
        notes: notes || `Manual restock of ${ticketTypeNames[type]} tickets`,
        addedBy: employeeName
    });
    
    saveTicketData();
    updateTicketDisplay();
    closeTicketModal();
    showNotification(`Successfully added ${amount} ${ticketTypeNames[type]} tickets!`);
});

function openBulkTicketModal() {
    document.getElementById('bulkTicketModal').classList.add('active');
    document.getElementById('bulk-1hour').value = '';
    document.getElementById('bulk-2hours').value = '';
    document.getElementById('bulk-daily').value = '';
    document.getElementById('bulk-weekly').value = '';
    document.getElementById('bulk-monthly').value = '';
    document.getElementById('bulkNotes').value = '';
}

function closeBulkTicketModal() {
    document.getElementById('bulkTicketModal').classList.remove('active');
}

document.getElementById('bulkAddTicketForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const tickets = {
        '1hour': parseInt(document.getElementById('bulk-1hour').value) || 0,
        '2hours': parseInt(document.getElementById('bulk-2hours').value) || 0,
        'daily': parseInt(document.getElementById('bulk-daily').value) || 0,
        'weekly': parseInt(document.getElementById('bulk-weekly').value) || 0,
        'monthly': parseInt(document.getElementById('bulk-monthly').value) || 0
    };
    
    const notes = document.getElementById('bulkNotes').value.trim();
    let totalAdded = 0;
    
    Object.keys(tickets).forEach(type => {
        if (tickets[type] > 0) {
            ticketInventory.types[type].available += tickets[type];
            totalAdded += tickets[type];
            
            ticketInventory.history.push({
                date: new Date().toISOString(),
                type: 'restock',
                ticketType: type,
                amount: tickets[type],
                balanceAfter: ticketInventory.types[type].available,
                notes: notes || `Bulk restock of ${ticketTypeNames[type]} tickets`,
                addedBy: employeeName
            });
        }
    });
    
    if (totalAdded > 0) {
        ticketInventory.lastRestockDate = new Date().toISOString();
        saveTicketData();
        updateTicketDisplay();
        closeBulkTicketModal();
        showNotification(`Successfully added ${totalAdded} tickets across multiple types!`);
    } else {
        showNotification('Please enter at least one ticket amount!', 'error');
    }
});

function useTicket(clientName, duration) {
    const ticketType = duration === 'custom' ? null : duration;
    
    if (!ticketType) {
        return true;
    }
    
    if (ticketInventory.types[ticketType].available <= 0) {
        showNotification(`⚠️ No ${ticketTypeNames[ticketType]} tickets available!`, 'error');
        return false;
    }
    
    ticketInventory.types[ticketType].available--;
    ticketInventory.types[ticketType].usedToday++;
    ticketInventory.types[ticketType].totalUsed++;
    
    ticketInventory.history.push({
        date: new Date().toISOString(),
        type: 'used',
        ticketType: ticketType,
        amount: -1,
        balanceAfter: ticketInventory.types[ticketType].available,
        notes: `${ticketTypeNames[ticketType]} ticket used for client: ${clientName}`,
        addedBy: employeeName
    });
    
    saveTicketData();
    updateTicketDisplay();
    
    if (ticketInventory.types[ticketType].available < 3 && ticketInventory.types[ticketType].available > 0) {
        showNotification(`⚠️ Only ${ticketInventory.types[ticketType].available} ${ticketTypeNames[ticketType]} tickets remaining!`, 'warning');
    } else if (ticketInventory.types[ticketType].available === 0) {
        showNotification(`⚠️ OUT OF ${ticketTypeNames[ticketType].toUpperCase()} TICKETS!`, 'error');
    }
    
    return true;
}

function returnTicket(ticketType) {
    if (!ticketType || ticketType === 'custom') return;
    
    ticketInventory.types[ticketType].available++;
    if (ticketInventory.types[ticketType].usedToday > 0) {
        ticketInventory.types[ticketType].usedToday--;
    }
    if (ticketInventory.types[ticketType].totalUsed > 0) {
        ticketInventory.types[ticketType].totalUsed--;
    }
    
    saveTicketData();
    updateTicketDisplay();
}

// FIXED: Delete ticket history entry with proper transaction reversal
function deleteTicketHistoryEntry(index) {
    if (confirm('Are you sure you want to delete this ticket history entry? This will reverse the ticket transaction.')) {
        const entry = ticketInventory.history[index];
        
        if (entry && entry.ticketType && ticketInventory.types[entry.ticketType]) {
            // Reverse the transaction based on the type
            switch(entry.type) {
                case 'restock':
                    // If it was a restock, remove those tickets
                    ticketInventory.types[entry.ticketType].available -= entry.amount;
                    if (ticketInventory.types[entry.ticketType].available < 0) {
                        ticketInventory.types[entry.ticketType].available = 0;
                    }
                    showNotification(`Reversed: ${entry.amount} ${ticketTypeNames[entry.ticketType]} tickets removed from inventory`);
                    break;
                    
                case 'used':
                    // If it was used, add it back
                    ticketInventory.types[entry.ticketType].available++;
                    
                    // Check if it was used today
                    const entryDate = new Date(entry.date).toISOString().split('T')[0];
                    const today = new Date().toISOString().split('T')[0];
                    
                    if (entryDate === today && ticketInventory.types[entry.ticketType].usedToday > 0) {
                        ticketInventory.types[entry.ticketType].usedToday--;
                    }
                    
                    if (ticketInventory.types[entry.ticketType].totalUsed > 0) {
                        ticketInventory.types[entry.ticketType].totalUsed--;
                    }
                    
                    showNotification(`Reversed: 1 ${ticketTypeNames[entry.ticketType]} ticket returned to inventory`);
                    break;
                    
                case 'returned':
                    // If it was returned, use it again
                    if (ticketInventory.types[entry.ticketType].available > 0) {
                        ticketInventory.types[entry.ticketType].available--;
                    }
                    
                    const returnDate = new Date(entry.date).toISOString().split('T')[0];
                    const todayDate = new Date().toISOString().split('T')[0];
                    
                    if (returnDate === todayDate) {
                        ticketInventory.types[entry.ticketType].usedToday++;
                    }
                    
                    ticketInventory.types[entry.ticketType].totalUsed++;
                    
                    showNotification(`Reversed: 1 ${ticketTypeNames[entry.ticketType]} ticket deducted from inventory`);
                    break;
                    
                case 'adjustment':
                    // Reverse the adjustment
                    ticketInventory.types[entry.ticketType].available -= entry.amount;
                    if (ticketInventory.types[entry.ticketType].available < 0) {
                        ticketInventory.types[entry.ticketType].available = 0;
                    }
                    showNotification(`Reversed adjustment: ${Math.abs(entry.amount)} ${ticketTypeNames[entry.ticketType]} tickets`);
                    break;
            }
        }
        
        // Remove the history entry
        ticketInventory.history.splice(index, 1);
        
        // Save and update displays
        saveTicketData();
        updateTicketDisplay();
        
        // Refresh the history view
        const historySection = document.getElementById('detailedTicketHistory');
        if (historySection.style.display !== 'none') {
            historySection.style.display = 'none';
            viewDetailedTicketHistory(); // Reopen to refresh
        }
        
        showNotification('Ticket history entry deleted and transaction reversed!');
    }
}

// Manual ticket adjustment for corrections
function manualTicketAdjustment(type) {
    const currentAmount = ticketInventory.types[type].available;
    const newAmount = prompt(`Current ${ticketTypeNames[type]} tickets: ${currentAmount}\n\nEnter the new correct amount:`, currentAmount);
    
    if (newAmount === null) return;
    
    const amount = parseInt(newAmount);
    if (isNaN(amount) || amount < 0) {
        showNotification('Please enter a valid positive number!', 'error');
        return;
    }
    
    const difference = amount - currentAmount;
    const reason = prompt('Enter reason for this adjustment:', 'Manual correction');
    
    if (!reason) return;
    
    // Update the ticket count
    ticketInventory.types[type].available = amount;
    
    // Add to history
    ticketInventory.history.push({
        date: new Date().toISOString(),
        type: 'adjustment',
        ticketType: type,
        amount: difference,
        balanceAfter: amount,
        notes: `Manual adjustment: ${reason}`,
        addedBy: employeeName
    });
    
    saveTicketData();
    updateTicketDisplay();
    
    showNotification(`${ticketTypeNames[type]} tickets adjusted to ${amount}`);
}

// Reset ticket function for each type
function resetTicketType(type) {
    if (confirm(`Are you sure you want to reset ALL ${ticketTypeNames[type]} ticket data? This cannot be undone!`)) {
        ticketInventory.types[type] = {
            available: 0,
            usedToday: 0,
            totalUsed: 0
        };
        
        // Remove all history entries for this type
        ticketInventory.history = ticketInventory.history.filter(entry => entry.ticketType !== type);
        
        saveTicketData();
        updateTicketDisplay();
        showNotification(`${ticketTypeNames[type]} tickets have been reset!`);
    }
}

// Complete ticket reset function
function resetAllTickets() {
    if (confirm('⚠️ WARNING: This will reset ALL ticket data including history!\n\nAre you absolutely sure?')) {
        if (confirm('This action CANNOT be undone! Click OK to confirm complete ticket reset.')) {
            // Reset all ticket types
            Object.keys(ticketInventory.types).forEach(type => {
                ticketInventory.types[type] = {
                    available: 0,
                    usedToday: 0,
                    totalUsed: 0
                };
            });
            
            // Clear all history
            ticketInventory.history = [];
            ticketInventory.lastRestockDate = null;
            
            saveTicketData();
            updateTicketDisplay();
            showNotification('All ticket data has been reset!', 'warning');
        }
    }
}

function viewDetailedTicketHistory() {
    const historySection = document.getElementById('detailedTicketHistory');
    const historyBody = document.getElementById('detailedTicketHistoryBody');
    
    if (historySection.style.display === 'none') {
        historySection.style.display = 'block';
        
        const sortedHistory = [...ticketInventory.history].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        historyBody.innerHTML = sortedHistory.map((entry, index) => {
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString('en-US');
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            const actualIndex = ticketInventory.history.findIndex(e => e === entry);
            
            const typeLabel = {
                'restock': '➕ Restock',
                'used': '✅ Used',
                'adjustment': '🔧 Adjustment',
                'returned': '↩️ Returned'
            }[entry.type] || entry.type;
            
            const amountColor = entry.amount > 0 ? 'color: #059669;' : 'color: #ef4444;';
            const amountText = entry.amount > 0 ? `+${entry.amount}` : entry.amount;
            const ticketTypeName = ticketTypeNames[entry.ticketType] || 'Unknown';
            
            return `
                <tr>
                    <td>${dateStr} ${timeStr}</td>
                    <td>${typeLabel}</td>
                    <td><strong>${ticketTypeName}</strong></td>
                    <td style="${amountColor}; font-weight: bold;">${amountText}</td>
                    <td>${entry.balanceAfter}</td>
                    <td>${entry.notes}</td>
                    <td>${entry.addedBy}</td>
                    <td>
                        <button onclick="deleteTicketHistoryEntry(${actualIndex})" 
                                class="btn btn-danger" 
                                style="padding: 3px 8px; font-size: 12px;">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="8" style="text-align: center;">No ticket history available</td></tr>';
    } else {
        historySection.style.display = 'none';
    }
}

function exportTicketReport() {
    const today = new Date().toISOString().split('T')[0];
    let csv = 'Ticket Type,Price (SSP),Available,Used Today,Total Used All Time\n';
    
    Object.keys(ticketInventory.types).forEach(type => {
        const data = ticketInventory.types[type];
        csv += `"${ticketTypeNames[type]}","${pricing[type]}","${data.available}","${data.usedToday}","${data.totalUsed}"\n`;
    });
    
    const totalAvailable = Object.values(ticketInventory.types).reduce((sum, t) => sum + t.available, 0);
    const totalToday = Object.values(ticketInventory.types).reduce((sum, t) => sum + t.usedToday, 0);
    const totalAllTime = Object.values(ticketInventory.types).reduce((sum, t) => sum + t.totalUsed, 0);
    
    csv += `\n"TOTAL","","${totalAvailable}","${totalToday}","${totalAllTime}"\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-report-${today}.csv`;
    a.click();
    
    showNotification('Ticket report exported successfully!');
}

// ==================== CLIENT MANAGEMENT FUNCTIONS ====================

function setQuickDuration(duration, amount, el) {
    // Remove selected class from all quick buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Use the passed element if provided, otherwise try to find by data-duration
    const targetBtn = el || document.querySelector(`.quick-btn[data-duration="${duration}"]`);
    if (targetBtn) targetBtn.classList.add('selected');

    const durationEl = document.getElementById('duration');
    const amountDisplayEl = document.getElementById('amountDisplay');
    const customAmountGroup = document.getElementById('customAmountGroup');
    const clientNameEl = document.getElementById('clientName');

    if (durationEl) durationEl.value = duration;
    if (amountDisplayEl) amountDisplayEl.textContent = amount.toLocaleString();
    if (customAmountGroup) customAmountGroup.style.display = 'none';
    if (clientNameEl) clientNameEl.focus();
}

document.getElementById('duration').addEventListener('change', function() {
    const customAmountGroup = document.getElementById('customAmountGroup');
    const amountDisplay = document.getElementById('amountDisplay');
    
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    if (this.value === 'custom') {
        customAmountGroup.style.display = 'block';
        document.getElementById('customAmount').required = true;
        amountDisplay.textContent = '0';
    } else {
        customAmountGroup.style.display = 'none';
        document.getElementById('customAmount').required = false;
        amountDisplay.textContent = (pricing[this.value] || 0).toLocaleString();
    }
});

document.getElementById('customAmount').addEventListener('input', function() {
    const amount = parseFloat(this.value) || 0;
    document.getElementById('amountDisplay').textContent = amount.toLocaleString();
});

// Updated add client form with non-ticket option
document.getElementById('addClientForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const clientName = document.getElementById('clientName').value.trim();
    const clientPhone = document.getElementById('clientPhone').value.trim();
    const duration = document.getElementById('duration').value;
    const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
    const notes = document.getElementById('notes').value.trim();
    const isNonTicketClient = document.getElementById('nonTicketClient').checked;
    
    let amount;
    if (duration === 'custom') {
        amount = parseFloat(document.getElementById('customAmount').value) || 0;
    } else {
        amount = pricing[duration] || 0;
    }
    
    if (!clientName) {
        showNotification('Please enter client name!', 'error');
        return;
    }
    
    // Check if it's a non-ticket client
    if (!isNonTicketClient && duration !== 'custom') {
        // Regular ticket client - check availability
        if (ticketInventory.types[duration].available <= 0) {
            if (!confirm(`⚠️ No ${ticketTypeNames[duration]} tickets available! Do you want to continue anyway?`)) {
                return;
            }
        } else {
            // Use a ticket
            useTicket(clientName, duration);
        }
    }
    
    const client = {
        id: Date.now().toString(),
        name: clientName,
        phone: clientPhone,
        duration: duration,
        amount: amount,
        paymentStatus: paymentStatus,
        notes: notes,
        date: new Date().toISOString(),
        addedBy: employeeName,
        isNonTicket: isNonTicketClient // Track if this is a non-ticket client
    };
    
    clients.push(client);
    saveData();
    updateDisplay();
    
    // Reset form
    this.reset();
    document.getElementById('customAmountGroup').style.display = 'none';
    document.getElementById('amountDisplay').textContent = '1,000';
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const ticketMessage = isNonTicketClient ? ' (Non-ticket)' : '';
    showNotification(`Client "${clientName}"${ticketMessage} added successfully!`);
});

document.getElementById('editClientForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('editClientId').value;
    const clientIndex = clients.findIndex(c => c.id === clientId);
    
    if (clientIndex !== -1) {
        clients[clientIndex].name = document.getElementById('editClientName').value;
        clients[clientIndex].phone = document.getElementById('editClientPhone').value;
        clients[clientIndex].paymentStatus = document.querySelector('input[name="editPaymentStatus"]:checked').value;
        
        saveData();
        updateDisplay();
        closeEditModal();
        showNotification('Client updated successfully!');
    }
});

function editClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (client) {
        document.getElementById('editClientId').value = client.id;
        document.getElementById('editClientName').value = client.name;
        document.getElementById('editClientPhone').value = client.phone || '';
        document.querySelector(`input[name="editPaymentStatus"][value="${client.paymentStatus}"]`).checked = true;
        
        document.getElementById('editModal').classList.add('active');
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Updated delete client to handle non-ticket clients
function deleteClient(clientId) {
    if (confirm('Are you sure you want to delete this client record?')) {
        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            const client = clients[index];
            const clientDate = new Date(client.date).toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            
            // Only return ticket if it's not a non-ticket client
            if (!client.isNonTicket && clientDate === today && client.duration !== 'custom') {
                returnTicket(client.duration);
                
                ticketInventory.history.push({
                    date: new Date().toISOString(),
                    type: 'returned',
                    ticketType: client.duration,
                    amount: 1,
                    balanceAfter: ticketInventory.types[client.duration].available,
                    notes: `Ticket returned - Client "${client.name}" deleted`,
                    addedBy: employeeName
                });
                
                saveTicketData();
            }
            
            clients.splice(index, 1);
            saveData();
            updateDisplay();
            showNotification('Client record deleted successfully!');
        }
    }
}

// ==================== EXPENSE MANAGEMENT FUNCTIONS ====================

document.getElementById('expenseCategory').addEventListener('change', function() {
    const personNameGroup = document.getElementById('personNameGroup');
    if (this.value === 'given') {
        personNameGroup.style.display = 'block';
        document.getElementById('personName').required = true;
    } else {
        personNameGroup.style.display = 'none';
        document.getElementById('personName').required = false;
        document.getElementById('personName').value = '';
    }
});

document.getElementById('addExpenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const reason = document.getElementById('expenseReason').value.trim();
    const personName = document.getElementById('personName').value.trim();
    
    if (!category || amount <= 0 || !reason) {
        showNotification('Please fill all required fields!', 'error');
        return;
    }
    
    if (category === 'given' && !personName) {
        showNotification('Please enter the person name!', 'error');
        return;
    }
    
    const expense = {
        id: Date.now().toString(),
        category: category,
        amount: amount,
        reason: reason,
        personName: personName,
        date: new Date().toISOString(),
        addedBy: employeeName
    };
    
    expenses.push(expense);
    saveData();
    displayExpenses();
    updateDisplay();
    
    this.reset();
    document.getElementById('personNameGroup').style.display = 'none';
    
    showNotification('Expense added successfully!');
});

function deleteExpense(expenseId) {
    if (confirm('Are you sure you want to delete this expense?')) {
        const index = expenses.findIndex(e => e.id === expenseId);
        if (index !== -1) {
            expenses.splice(index, 1);
            saveData();
            displayExpenses();
            updateDisplay();
            showNotification('Expense deleted successfully!');
        }
    }
}

// ==================== DISPLAY FUNCTIONS ====================

function updateDisplay() {
    displayClients();
    updateStats();
    updateFinancialSummary();
}

function displayClients() {
    const clientList = document.getElementById('clientList');
    const searchTerm = document.getElementById('searchClient').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const dateFilter = document.getElementById('filterDate').value;
    
    const today = dateFilter || new Date().toISOString().split('T')[0];
    const todayClients = clients.filter(client => {
        const clientDate = new Date(client.date).toISOString().split('T')[0];
        return clientDate === today;
    });
    
    const todayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === today;
    });
    
    let filteredItems = [];
    
    if (statusFilter === 'all' || statusFilter === 'paid' || statusFilter === 'unpaid' || statusFilter === 'borrowed') {
        filteredItems = filteredItems.concat(todayClients.filter(client => {
            const matchesSearch = client.name.toLowerCase().includes(searchTerm) ||
                                (client.phone && client.phone.includes(searchTerm));
            const matchesStatus = statusFilter === 'all' || client.paymentStatus === statusFilter;
            return matchesSearch && matchesStatus;
        }));
    }
    
    if (statusFilter === 'all' || statusFilter === 'expenses') {
        filteredItems = filteredItems.concat(todayExpenses.filter(expense => {
            const matchesSearch = expense.reason.toLowerCase().includes(searchTerm) ||
                                expense.category.toLowerCase().includes(searchTerm) ||
                                (expense.personName && expense.personName.toLowerCase().includes(searchTerm));
            return matchesSearch;
        }));
    }
    
    filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredItems.length === 0) {
        clientList.innerHTML = `
            <div class="empty-state">
                <p>No transactions found for selected filters</p>
            </div>
        `;
    } else {
        clientList.innerHTML = filteredItems.map(item => {
            if (item.category) {
                return createExpenseItemHTML(item);
            } else {
                return createClientItemHTML(item);
            }
        }).join('');
    }
}

// Updated to show non-ticket clients
function createClientItemHTML(client) {
    const time = new Date(client.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const statusClass = `status-${client.paymentStatus}`;
    const statusText = client.paymentStatus.charAt(0).toUpperCase() + client.paymentStatus.slice(1);
    const durationText = getDurationText(client.duration);
    const nonTicketBadge = client.isNonTicket ? '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 5px;">NO-TICKET</span>' : '';
    
    return `
        <div class="client-item">
            <div class="client-info">
                <div class="client-name">${client.name}${nonTicketBadge}</div>
                <div class="client-details">
                    📱 ${client.phone || 'No phone'} | 
                    ⏱️ ${durationText} | 
                    💰 ${client.amount.toLocaleString()} SSP | 
                    🕐 ${time}
                    ${client.notes ? ` | 📝 ${client.notes}` : ''}
                </div>
            </div>
            <span class="client-status ${statusClass}">${statusText}</span>
            <button onclick="editClient('${client.id}')" class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;">Edit</button>
            <button onclick="deleteClient('${client.id}')" class="btn btn-danger" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;">Delete</button>
        </div>
    `;
}

function createExpenseItemHTML(expense) {
    const time = new Date(expense.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const categoryEmoji = {
        'lunch': '🍽️',
        'tea': '☕',
        'dinner': '🍴',
        'maintenance': '🔧',
        'transport': '🚗',
        'given': '🤝',
        'other': '📝'
    }[expense.category] || '📝';
    
    let categoryText = expense.category.charAt(0).toUpperCase() + expense.category.slice(1);
    if (expense.category === 'given' && expense.personName) {
        categoryText += ` to ${expense.personName}`;
    }
    
    return `
        <div class="expense-item">
            <div class="expense-info">
                <div class="expense-category">${categoryEmoji} ${categoryText}</div>
                <div class="expense-details">
                    ${expense.reason} | 🕐 ${time}
                </div>
            </div>
            <span class="expense-amount">-${expense.amount.toLocaleString()} SSP</span>
            <button onclick="deleteExpense('${expense.id}')" class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;">Delete</button>
        </div>
    `;
}

function getDurationText(duration) {
    const durationMap = {
        '1hour': '1 Hour',
        '2hours': '2 Hours',
        'daily': 'Day Pass',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'custom': 'Custom'
    };
    return durationMap[duration] || duration;
}

function displayExpenses() {
    const expenseList = document.getElementById('expenseList');
    const today = new Date().toISOString().split('T')[0];
    
    const todayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === today;
    });
    
    if (todayExpenses.length === 0) {
        expenseList.innerHTML = `
            <div class="empty-state">
                <p>No expenses recorded today</p>
            </div>
        `;
    } else {
        expenseList.innerHTML = todayExpenses.map(expense => createExpenseItemHTML(expense)).join('');
    }
    
    const totalExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById('expenseSummaryTotal').textContent = totalExpenses.toLocaleString();
}

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const todayClients = clients.filter(client => {
        const clientDate = new Date(client.date).toISOString().split('T')[0];
        return clientDate === today;
    });
    
    const todayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === today;
    });
    
    const totalClients = todayClients.length;
    const paidClients = todayClients.filter(c => c.paymentStatus === 'paid');
    const unpaidClients = todayClients.filter(c => c.paymentStatus === 'unpaid' || c.paymentStatus === 'borrowed');
    
    const totalRevenue = paidClients.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const unpaidAmount = unpaidClients.reduce((sum, c) => sum + c.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    document.getElementById('totalClients').textContent = totalClients;
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();
    document.getElementById('totalExpenses').textContent = totalExpenses.toLocaleString();
    document.getElementById('unpaidClients').textContent = unpaidClients.length;
    document.getElementById('netProfit').textContent = netProfit.toLocaleString();
}

function updateFinancialSummary() {
    const today = new Date().toISOString().split('T')[0];
    
    const todayClients = clients.filter(client => {
        const clientDate = new Date(client.date).toISOString().split('T')[0];
        return clientDate === today;
    });
    
    const todayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === today;
    });
    
    const paidAmount = todayClients
        .filter(c => c.paymentStatus === 'paid')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const unpaidAmount = todayClients
        .filter(c => c.paymentStatus === 'unpaid')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const borrowedAmount = todayClients
        .filter(c => c.paymentStatus === 'borrowed')
        .reduce((sum, c) => sum + c.amount, 0);
    
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = paidAmount - totalExpenses;
    
    document.getElementById('summaryPaid').textContent = paidAmount.toLocaleString();
    document.getElementById('summaryUnpaid').textContent = unpaidAmount.toLocaleString();
    document.getElementById('summaryBorrowed').textContent = borrowedAmount.toLocaleString();
    document.getElementById('summaryExpenses').textContent = totalExpenses.toLocaleString();
    document.getElementById('summaryProfit').textContent = netProfit.toLocaleString();
    
    document.getElementById('settingsRevenue').textContent = paidAmount.toLocaleString();
    document.getElementById('settingsExpenses').textContent = totalExpenses.toLocaleString();
    document.getElementById('settingsUnpaid').textContent = (unpaidAmount + borrowedAmount).toLocaleString();
    document.getElementById('settingsProfit').textContent = netProfit.toLocaleString();
}

// ==================== TAB MANAGEMENT ====================

function switchTab(button, tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    button.classList.add('active');
    document.getElementById(tab + 'Tab').classList.add('active');
    
    if (tab === 'expenses') {
        displayExpenses();
    } else if (tab === 'settings') {
        updateFinancialSummary();
    } else if (tab === 'history') {
        loadHistory();
    } else if (tab === 'tickets') {
        updateTicketDisplay();
    }
}

// ==================== HISTORY & REPORTS FUNCTIONS - FIXED ====================

function saveEndOfDayReport() {
    const today = new Date().toISOString().split('T')[0];
    
    const existingReport = dailyReports.find(r => r.date === today);
    if (existingReport) {
        if (!confirm('A report for today already exists. Do you want to overwrite it?')) {
            return;
        }
        const index = dailyReports.findIndex(r => r.date === today);
        dailyReports.splice(index, 1);
    }
    
    const todayClients = clients.filter(client => {
        const clientDate = new Date(client.date).toISOString().split('T')[0];
        return clientDate === today;
    });
    
    const todayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === today;
    });
    
    const report = {
        date: today,
        savedAt: new Date().toISOString(),
        employee: employeeName,
        clients: [...todayClients],
        expenses: [...todayExpenses],
        ticketData: {
            types: JSON.parse(JSON.stringify(ticketInventory.types))
        },
        summary: {
            totalClients: todayClients.length,
            totalRevenue: todayClients.filter(c => c.paymentStatus === 'paid').reduce((sum, c) => sum + c.amount, 0),
            totalUnpaid: todayClients.filter(c => c.paymentStatus === 'unpaid' || c.paymentStatus === 'borrowed').reduce((sum, c) => sum + c.amount, 0),
            totalExpenses: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
            netProfit: 0
        }
    };
    
    report.summary.netProfit = report.summary.totalRevenue - report.summary.totalExpenses;
    
    dailyReports.push(report);
    saveData();
    
    showNotification('Daily report saved successfully!');
}

function loadHistory() {
    const historyContent = document.getElementById('historyContent');
    if (!historyContent) return; // guard: if the history container is missing, exit gracefully
    
    if (dailyReports.length === 0) {
        historyContent.innerHTML = `
            <div class="empty-state">
                <p>No historical reports available</p>
                <p style="font-size: 12px; margin-top: 10px;">Save daily reports from the Settings tab</p>
            </div>
        `;
        return;
    }
    
    const sortedReports = [...dailyReports].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    historyContent.innerHTML = sortedReports.map(report => {
        const date = new Date(report.date);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        
        return `
            <div class="daily-report-card">
                <div class="daily-report-header">
                    <div class="daily-report-date">
                        📅 ${dateStr}
                    </div>
                    <div class="daily-report-stats">
                        <div class="daily-stat">
                            <div class="daily-stat-value">${report.summary.totalClients}</div>
                            <div class="daily-stat-label">Clients</div>
                        </div>
                        <div class="daily-stat">
                            <div class="daily-stat-value" style="color: #10b981;">${report.summary.totalRevenue.toLocaleString()}</div>
                            <div class="daily-stat-label">Revenue (SSP)</div>
                        </div>
                        <div class="daily-stat">
                            <div class="daily-stat-value" style="color: #ef4444;">${report.summary.totalExpenses.toLocaleString()}</div>
                            <div class="daily-stat-label">Expenses (SSP)</div>
                        </div>
                        <div class="daily-stat">
                            <div class="daily-stat-value" style="color: ${report.summary.netProfit >= 0 ? '#10b981' : '#ef4444'};">
                                ${report.summary.netProfit.toLocaleString()}
                            </div>
                            <div class="daily-stat-label">Net Profit (SSP)</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button onclick="viewDailyReportDetails('${report.date}')" class="btn btn-info" style="flex: 1;">
                        View Details
                    </button>
                    <button onclick="printDailyReport('${report.date}')" class="btn btn-success" style="flex: 1;">
                        🖨️ Print Report
                    </button>
                    <button onclick="deleteDailyReport('${report.date}')" class="btn btn-danger" style="flex: 1;">
                        Delete Report
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Apply filters to history
function filterHistory() {
    const fromDate = document.getElementById('historyDateFrom').value;
    const toDate = document.getElementById('historyDateTo').value;
    const filter = document.getElementById('historyFilter').value;
    
    let filteredReports = [...dailyReports];
    
    // Apply date filters
    if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filteredReports = filteredReports.filter(r => r.date === today);
    } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredReports = filteredReports.filter(r => new Date(r.date) >= weekAgo);
    } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filteredReports = filteredReports.filter(r => new Date(r.date) >= monthAgo);
    }
    
    if (fromDate) {
        filteredReports = filteredReports.filter(r => r.date >= fromDate);
    }
    
    if (toDate) {
        filteredReports = filteredReports.filter(r => r.date <= toDate);
    }
    
    // Display filtered results
    const historyContent = document.getElementById('historyContent');
    
    if (filteredReports.length === 0) {
        historyContent.innerHTML = `
            <div class="empty-state">
                <p>No reports found for selected filters</p>
            </div>
        `;
        return;
    }
    
    const sortedReports = filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    historyContent.innerHTML = sortedReports.map(report => {
        const date = new Date(report.date);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        
        return `
            <div class="daily-report-card">
                <div class="daily-report-header">
                    <div class="daily-report-date">
                        📅 ${dateStr}
                    </div>
                    <div class="daily-report-stats">
                        <div class="daily-stat">
                            <div class="daily-stat-value">${report.summary.totalClients}</div>
                            <div class="daily-stat-label">Clients</div>
                        </div>
                        <div class="daily-stat">
                            <div class="daily-stat-value" style="color: #10b981;">${report.summary.totalRevenue.toLocaleString()}</div>
                            <div class="daily-stat-label">Revenue (SSP)</div>
                        </div>
                        <div class="daily-stat">
                            <div class="daily-stat-value" style="color: #ef4444;">${report.summary.totalExpenses.toLocaleString()}</div>
                            <div class="daily-stat-label">Expenses (SSP)</div>
                        </div>
                        <div class="daily-stat">
                            <div class="daily-stat-value" style="color: ${report.summary.netProfit >= 0 ? '#10b981' : '#ef4444'};">
                                ${report.summary.netProfit.toLocaleString()}
                            </div>
                            <div class="daily-stat-label">Net Profit (SSP)</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button onclick="viewDailyReportDetails('${report.date}')" class="btn btn-info" style="flex: 1;">
                        View Details
                    </button>
                    <button onclick="printDailyReport('${report.date}')" class="btn btn-success" style="flex: 1;">
                        🖨️ Print Report
                    </button>
                    <button onclick="deleteDailyReport('${report.date}')" class="btn btn-danger" style="flex: 1;">
                        Delete Report
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteDailyReport(reportDate) {
    if (confirm(`Are you sure you want to delete the report for ${reportDate}?`)) {
        const index = dailyReports.findIndex(r => r.date === reportDate);
        if (index !== -1) {
            dailyReports.splice(index, 1);
            saveData();
            loadHistory();
            showNotification('Daily report deleted successfully!');
        }
    }
}

// Clear only today's clients and expenses (used by Settings -> Clear Today's Data)
function clearTodayData() {
    if (!confirm("Are you sure you want to clear today's data? This will remove today's clients and expenses but keep historical reports and tickets.")) return;

    const today = new Date().toISOString().split('T')[0];

    // Remove clients and expenses for today
    clients = clients.filter(c => new Date(c.date).toISOString().split('T')[0] !== today);
    expenses = expenses.filter(e => new Date(e.date).toISOString().split('T')[0] !== today);

    saveData();
    updateDisplay();
    updateTicketDisplay();

    showNotification("Today's data cleared successfully!", 'warning');
}

// Backup data alias (calls exportData) - kept for backwards compatibility with index.html
function backupData() {
    try {
        exportData();
    } catch (err) {
        console.error('Backup error:', err);
        showNotification('An error occurred while creating backup. Check console for details.', 'error');
    }
}

function viewDailyReportDetails(reportDate) {
    const report = dailyReports.find(r => r.date === reportDate);
    if (!report) return;
    
    let detailsHTML = `
        <h3>Report Details for ${new Date(reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        <p style="color: #666; margin-bottom: 20px;">Generated by: ${report.employee} on ${new Date(report.savedAt).toLocaleString()}</p>
        
        <h4>Clients (${report.clients.length})</h4>
        <div class="history-table">
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Name</th>
                        <th>Duration</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    report.clients.forEach(client => {
        const time = new Date(client.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const clientType = client.isNonTicket ? 'Non-ticket' : 'Regular';
        detailsHTML += `
            <tr>
                <td>${time}</td>
                <td>${client.name}</td>
                <td>${getDurationText(client.duration)}</td>
                <td>${client.amount.toLocaleString()} SSP</td>
                <td><span class="status-${client.paymentStatus}">${client.paymentStatus}</span></td>
                <td>${clientType}</td>
            </tr>
        `;
    });
    
    detailsHTML += `
                </tbody>
            </table>
        </div>
        
        <h4 style="margin-top: 20px;">Expenses (${report.expenses.length})</h4>
        <div class="history-table">
            <table>
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Category</th>
                        <th>Reason</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    report.expenses.forEach(expense => {
        const time = new Date(expense.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        detailsHTML += `
            <tr>
                <td>${time}</td>
                <td>${expense.category}</td>
                <td>${expense.reason}</td>
                <td>${expense.amount.toLocaleString()} SSP</td>
            </tr>
        `;
    });
    
    detailsHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <span class="close-modal" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            ${detailsHTML}
            <div class="action-buttons" style="margin-top: 20px;">
                <button onclick="printDailyReport('${reportDate}')" class="btn btn-info">🖨️ Print This Report</button>
                <button onclick="this.closest('.modal').remove()" class="btn btn-danger">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Print historical daily report
function printDailyReport(reportDate) {
    const report = dailyReports.find(r => r.date === reportDate);
    if (!report) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Unable to open print preview. Please allow popups for this site and try again.', 'error');
        return;
    }
    const dateStr = new Date(report.date).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    // try to use the same stylesheet as the main page so print rules apply
    const cssHref = document.querySelector('link[rel="stylesheet"]')?.href || 'styles.css';

    let printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="${cssHref}">
            <title>Daily Report - ${dateStr}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f3f4f6; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .summary { background: #f9fafb; padding: 15px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #666; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Sama Wi-Fi Daily Report</h1>
                <p>${dateStr}</p>
                <p>Generated by: ${report.employee} | Saved on: ${new Date(report.savedAt).toLocaleString()}</p>
            </div>
            
            <h2>Clients Summary (${report.clients.length})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Duration</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Type</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    report.clients.forEach((client, index) => {
        const time = new Date(client.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const clientType = client.isNonTicket ? 'Non-ticket' : 'Regular';
        printHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${time}</td>
                <td>${client.name}</td>
                <td>${client.phone || '-'}</td>
                <td>${getDurationText(client.duration)}</td>
                <td>${client.amount.toLocaleString()} SSP</td>
                <td>${client.paymentStatus}</td>
                <td>${clientType}</td>
            </tr>
        `;
    });
    
    printHTML += `
                </tbody>
            </table>
            
            <h2>Expenses Summary (${report.expenses.length})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    report.expenses.forEach((expense, index) => {
        const time = new Date(expense.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        printHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${time}</td>
                <td>${expense.category}</td>
                <td>${expense.reason}</td>
                <td>${expense.amount.toLocaleString()} SSP</td>
            </tr>
        `;
    });
    
    // Add ticket summary if available
    let ticketSummaryHTML = '';
    if (report.ticketData && report.ticketData.types) {
        ticketSummaryHTML = `
            <h2>Ticket Summary</h2>
            <table>
                <thead>
                    <tr>
                        <th>Ticket Type</th>
                        <th>Available</th>
                        <th>Used That Day</th>
                        <th>Total Used</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        Object.keys(report.ticketData.types).forEach(type => {
            const data = report.ticketData.types[type];
            ticketSummaryHTML += `
                <tr>
                    <td>${ticketTypeNames[type]}</td>
                    <td>${data.available}</td>
                    <td>${data.usedToday}</td>
                    <td>${data.totalUsed}</td>
                </tr>
            `;
        });
        
        ticketSummaryHTML += `
                </tbody>
            </table>
        `;
    }
    
    printHTML += `
                </tbody>
            </table>
            
            ${ticketSummaryHTML}
            
            <div class="summary">
                <h2>Financial Summary</h2>
                <table>
                    <tr>
                        <td><strong>Total Clients</strong></td>
                        <td>${report.summary.totalClients}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Revenue (Paid)</strong></td>
                        <td>${report.summary.totalRevenue.toLocaleString()} SSP</td>
                    </tr>
                    <tr>
                        <td><strong>Total Unpaid/Borrowed</strong></td>
                        <td>${report.summary.totalUnpaid.toLocaleString()} SSP</td>
                    </tr>
                    <tr>
                        <td><strong>Total Expenses</strong></td>
                        <td>${report.summary.totalExpenses.toLocaleString()} SSP</td>
                    </tr>
                    <tr style="font-size: 18px; font-weight: bold;">
                        <td><strong>NET PROFIT</strong></td>
                        <td>${report.summary.netProfit.toLocaleString()} SSP</td>
                    </tr>
                </table>
            </div>
            
            <div class="footer">
                <p>© 2024 Sama Wi-Fi Management System</p>
                <p>Printed on: ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
    
    try {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        // Some browsers may block print() until content is loaded
        printWindow.focus();
        printWindow.print();
    } catch (err) {
        console.error('Print error:', err);
        showNotification('An error occurred while trying to print. Check console for details.', 'error');
    }
}

// ==================== FIXED PRINT TODAY'S REPORT FUNCTION ====================

function printReport() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const todayISO = today.toISOString().split('T')[0];
    
    // Get today's data
    const todayClients = clients.filter(client => {
        const clientDate = new Date(client.date).toISOString().split('T')[0];
        return clientDate === todayISO;
    });
    
    const todayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate === todayISO;
    });
    
    // Calculate summary
    const paidClients = todayClients.filter(c => c.paymentStatus === 'paid');
    const unpaidClients = todayClients.filter(c => c.paymentStatus === 'unpaid' || c.paymentStatus === 'borrowed');
    
    const totalRevenue = paidClients.reduce((sum, c) => sum + c.amount, 0);
    const totalUnpaid = unpaidClients.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Unable to open print preview. Please allow popups for this site and try again.', 'error');
        return;
    }

    // include main stylesheet in the print window so print CSS is applied
    const cssHref = document.querySelector('link[rel="stylesheet"]')?.href || 'styles.css';

    let printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="${cssHref}">
            <title>Today's Report - ${dateStr}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    color: #333;
                }
                h1, h2 { 
                    color: #333; 
                    margin-bottom: 10px;
                }
                h1 {
                    font-size: 24px;
                    text-align: center;
                }
                h2 {
                    font-size: 18px;
                    margin-top: 20px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 5px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 15px 0; 
                }
                th, td { 
                    border: 1px solid #ddd; 
                    padding: 8px; 
                    text-align: left; 
                }
                th { 
                    background: #f3f4f6; 
                    font-weight: bold;
                }
                .header { 
                    text-align: center; 
                    border-bottom: 2px solid #333; 
                    padding-bottom: 20px; 
                    margin-bottom: 30px; 
                }
                .summary { 
                    background: #f9fafb; 
                    padding: 15px; 
                    margin: 20px 0; 
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                .summary table {
                    border: none;
                }
                .summary td {
                    border: none;
                    padding: 5px 10px;
                }
                .summary tr:last-child td {
                    font-size: 18px;
                    font-weight: bold;
                    padding-top: 10px;
                    border-top: 2px solid #333;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 50px; 
                    font-size: 12px; 
                    color: #666; 
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                .status-paid { color: #059669; }
                .status-unpaid { color: #f59e0b; }
                .status-borrowed { color: #ef4444; }
                @media print { 
                    body { margin: 0; }
                    .pagebreak { page-break-before: always; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📶 Sama Wi-Fi - Daily Report</h1>
                <p><strong>${dateStr}</strong></p>
                <p>Generated by: <strong>${employeeName}</strong> | Time: ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <h2>📊 Clients Summary (${todayClients.length} Total)</h2>
    `;
    
    if (todayClients.length > 0) {
        printHTML += `
            <table>
                <thead>
                    <tr>
                        <th width="5%">#</th>
                        <th width="10%">Time</th>
                        <th width="20%">Name</th>
                        <th width="15%">Phone</th>
                        <th width="15%">Duration</th>
                        <th width="10%">Amount</th>
                        <th width="10%">Status</th>
                        <th width="8%">Type</th>
                        <th width="7%">Notes</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        todayClients.forEach((client, index) => {
            const time = new Date(client.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const clientType = client.isNonTicket ? 'No-Ticket' : 'Regular';
            const statusClass = `status-${client.paymentStatus}`;
            
            printHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${time}</td>
                    <td>${client.name}</td>
                    <td>${client.phone || '-'}</td>
                    <td>${getDurationText(client.duration)}</td>
                    <td>${client.amount.toLocaleString()} SSP</td>
                    <td class="${statusClass}">${client.paymentStatus}</td>
                    <td>${clientType}</td>
                    <td>${client.notes || '-'}</td>
                </tr>
            `;
        });
        
        printHTML += `
                </tbody>
            </table>
        `;
    } else {
        printHTML += `<p>No clients recorded today.</p>`;
    }
    
    printHTML += `
            <h2>💸 Expenses Summary (${todayExpenses.length} Total)</h2>
    `;
    
    if (todayExpenses.length > 0) {
        printHTML += `
            <table>
                <thead>
                    <tr>
                        <th width="5%">#</th>
                        <th width="15%">Time</th>
                        <th width="20%">Category</th>
                        <th width="40%">Description</th>
                        <th width="20%">Amount</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        todayExpenses.forEach((expense, index) => {
            const time = new Date(expense.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            let categoryText = expense.category.charAt(0).toUpperCase() + expense.category.slice(1);
            if (expense.category === 'given' && expense.personName) {
                categoryText += ` to ${expense.personName}`;
            }
            
            printHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${time}</td>
                    <td>${categoryText}</td>
                    <td>${expense.reason}</td>
                    <td>${expense.amount.toLocaleString()} SSP</td>
                </tr>
            `;
        });
        
        printHTML += `
                </tbody>
            </table>
        `;
    } else {
        printHTML += `<p>No expenses recorded today.</p>`;
    }
    
    // Add ticket summary
    printHTML += `
            <h2>🎫 Ticket Summary</h2>
            <table>
                <thead>
                    <tr>
                        <th>Ticket Type</th>
                        <th>Price</th>
                        <th>Available</th>
                        <th>Used Today</th>
                        <th>Total Used</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    Object.keys(ticketInventory.types).forEach(type => {
        const data = ticketInventory.types[type];
        printHTML += `
            <tr>
                <td>${ticketTypeNames[type]}</td>
                <td>${pricing[type].toLocaleString()} SSP</td>
                <td>${data.available}</td>
                <td>${data.usedToday}</td>
                <td>${data.totalUsed}</td>
            </tr>
        `;
    });
    
    const totalTicketsAvailable = Object.values(ticketInventory.types).reduce((sum, t) => sum + t.available, 0);
    const totalTicketsUsedToday = Object.values(ticketInventory.types).reduce((sum, t) => sum + t.usedToday, 0);
    const totalTicketsAllTime = Object.values(ticketInventory.types).reduce((sum, t) => sum + t.totalUsed, 0);
    
    printHTML += `
                <tr style="font-weight: bold; background: #f3f4f6;">
                    <td>TOTAL</td>
                    <td>-</td>
                    <td>${totalTicketsAvailable}</td>
                    <td>${totalTicketsUsedToday}</td>
                    <td>${totalTicketsAllTime}</td>
                </tr>
                </tbody>
            </table>
            
            <div class="summary">
                <h2>💰 Financial Summary</h2>
                <table>
                    <tr>
                        <td width="70%"><strong>Total Clients:</strong></td>
                        <td width="30%" style="text-align: right;">${todayClients.length}</td>
                    </tr>
                    <tr>
                        <td><strong>Total Revenue (Paid):</strong></td>
                        <td style="text-align: right; color: #059669;">${totalRevenue.toLocaleString()} SSP</td>
                    </tr>
                    <tr>
                        <td><strong>Total Unpaid/Borrowed:</strong></td>
                        <td style="text-align: right; color: #f59e0b;">${totalUnpaid.toLocaleString()} SSP</td>
                    </tr>
                    <tr>
                        <td><strong>Total Expenses:</strong></td>
                        <td style="text-align: right; color: #ef4444;">${totalExpenses.toLocaleString()} SSP</td>
                    </tr>
                    <tr>
                        <td><strong>NET PROFIT:</strong></td>
                        <td style="text-align: right; color: ${netProfit >= 0 ? '#059669' : '#ef4444'};">
                            ${netProfit.toLocaleString()} SSP
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="footer">
                <p>© 2024 Sama Wi-Fi Management System</p>
                <p>This report was generated on: ${new Date().toLocaleString()}</p>
                <p>Employee: ${employeeName}</p>
            </div>
        </body>
        </html>
    `;
    
    try {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    } catch (err) {
        console.error('Print error:', err);
        showNotification('An error occurred while trying to print. Check console for details.', 'error');
    }
}

// ==================== SETTINGS FUNCTIONS ====================

function updateEmployeeName() {
    const newName = document.getElementById('employeeNameInput').value.trim();
    if (newName) {
        employeeName = newName;
        document.getElementById('employeeName').textContent = newName;
        saveData();
        showNotification('Employee name updated successfully!');
    }
}

function clearAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL data including clients, expenses, and reports!\n\nAre you absolutely sure?')) {
        if (confirm('This action CANNOT be undone! Click OK to confirm complete data reset.')) {
            clients = [];
            expenses = [];
            dailyReports = [];
            
            // Keep tickets separate or reset based on preference
            if (confirm('Do you also want to reset ticket inventory?')) {
                Object.keys(ticketInventory.types).forEach(type => {
                    ticketInventory.types[type] = {
                        available: 0,
                        usedToday: 0,
                        totalUsed: 0
                    };
                });
                ticketInventory.history = [];
                ticketInventory.lastRestockDate = null;
                saveTicketData();
            }
            
            saveData();
            updateDisplay();
            updateTicketDisplay();
            showNotification('All data has been cleared!', 'warning');
        }
    }
}

function exportData() {
    const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: employeeName,
        clients: clients,
        expenses: expenses,
        dailyReports: dailyReports,
        ticketInventory: ticketInventory
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sama-wifi-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showNotification('Data exported successfully!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (confirm('This will replace all current data with the imported data. Continue?')) {
                    if (importedData.clients) clients = importedData.clients;
                    if (importedData.expenses) expenses = importedData.expenses;
                    if (importedData.dailyReports) dailyReports = importedData.dailyReports;
                    if (importedData.ticketInventory) {
                        ticketInventory = importedData.ticketInventory;
                        saveTicketData();
                    }
                    
                    saveData();
                    updateDisplay();
                    updateTicketDisplay();
                    showNotification('Data imported successfully!');
                }
            } catch (error) {
                showNotification('Error importing data. Please check the file format.', 'error');
                console.error('Import error:', error);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// ==================== UTILITY FUNCTIONS ====================

function displayDate() {
    const dateElement = document.getElementById('currentDate');
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-US', options);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠'}
            </span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ==================== SEARCH AND FILTER FUNCTIONS ====================

document.getElementById('searchClient').addEventListener('input', function() {
    displayClients();
});

document.getElementById('filterStatus').addEventListener('change', function() {
    displayClients();
});

document.getElementById('filterDate').addEventListener('change', function() {
    displayClients();
});

// Quick filter buttons
function setQuickFilter(filter) {
    const today = new Date();
    let targetDate;
    
    switch(filter) {
        case 'today':
            targetDate = today.toISOString().split('T')[0];
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            targetDate = yesterday.toISOString().split('T')[0];
            break;
        case 'week':
            // This would need more complex logic for week view
            targetDate = today.toISOString().split('T')[0];
            showNotification('Week view coming soon!', 'info');
            break;
    }
    
    document.getElementById('filterDate').value = targetDate;
    displayClients();
}

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', function(e) {
    // Ctrl + N: New Client
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        document.getElementById('clientsTab').scrollIntoView();
        document.getElementById('clientName').focus();
    }
    
    // Ctrl + E: Expenses Tab
    if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        const expenseBtn = document.querySelector('[onclick*="expenses"]');
        if (expenseBtn) expenseBtn.click();
    }
    
    // Ctrl + P: Print Report
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        printReport();
    }
    
    // Ctrl + S: Save Report
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveEndOfDayReport();
    }
    
    // Escape: Close any open modal
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// ==================== AUTO-SAVE FUNCTIONALITY ====================

let autoSaveInterval;

function startAutoSave() {
    autoSaveInterval = setInterval(() => {
        saveData();
        saveTicketData();
        console.log('Auto-saved at', new Date().toLocaleTimeString());
    }, 60000); // Auto-save every minute
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
}

// ==================== SIDEBAR TOGGLE ====================

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    // If sidebar isn't present in this layout, do nothing
    if (!sidebar || !mainContent) return;

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');

    // Save preference
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

// Load sidebar preference
function loadSidebarPreference() {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar || !mainContent) return;

    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
}

// ==================== THEME TOGGLE ====================

function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Load theme preference
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

// ==================== INITIALIZATION ====================

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    checkAuth();
    
    // Load preferences
    loadThemePreference();
    loadSidebarPreference();
    
    // Start auto-save
    startAutoSave();
    
    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('filterDate').value = today;
    
    // Initialize tooltips or any other UI components
    initializeUIComponents();
    
    // Check for daily reset
    checkDailyReset();
});

// Initialize UI components
function initializeUIComponents() {
    // Add click outside to close modals
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // Initialize date inputs with today's date
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
}

// Check if it's a new day and reset daily counters
function checkDailyReset() {
    const lastResetDate = localStorage.getItem('lastResetDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastResetDate !== today) {
        // Reset daily ticket usage
        Object.keys(ticketInventory.types).forEach(type => {
            ticketInventory.types[type].usedToday = 0;
        });
        
        saveTicketData();
        localStorage.setItem('lastResetDate', today);
        
        console.log('Daily counters reset for', today);
    }
}

// Handle page unload
window.addEventListener('beforeunload', function() {
    // Save any pending data
    saveData();
    saveTicketData();
    stopAutoSave();
});

// ==================== ERROR HANDLING ====================

window.addEventListener('error', function(e) {
    console.error('Application error:', e);
    showNotification('An error occurred. Please refresh the page if issues persist.', 'error');
});

// Handle storage quota exceeded
window.addEventListener('storage', function(e) {
    if (e.key === null) {
        showNotification('Storage quota exceeded. Consider exporting and clearing old data.', 'warning');
    }
});

// ==================== END OF SCRIPT ====================


