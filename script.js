// Default credentials
const DEFAULT_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
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

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (username === DEFAULT_CREDENTIALS.username && password === DEFAULT_CREDENTIALS.password) {
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

// ==================== TICKET MANAGEMENT FUNCTIONS (UPDATED) ====================

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

function deleteTicketHistoryEntry(index) {
    if (confirm('Are you sure you want to delete this ticket history entry?')) {
        ticketInventory.history.splice(index, 1);
        saveTicketData();
        viewDetailedTicketHistory();
        viewDetailedTicketHistory();
        showNotification('Ticket history entry deleted successfully!');
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

function setQuickDuration(duration, amount) {
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.closest('.quick-btn').classList.add('selected');
    
    document.getElementById('duration').value = duration;
    document.getElementById('amountDisplay').textContent = amount.toLocaleString();
    document.getElementById('customAmountGroup').style.display = 'none';
    document.getElementById('clientName').focus();
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

document.getElementById('addClientForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const clientName = document.getElementById('clientName').value.trim();
    const clientPhone = document.getElementById('clientPhone').value.trim();
    const duration = document.getElementById('duration').value;
    const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
    const notes = document.getElementById('notes').value.trim();
    
    let amount;
    if (duration === 'custom') {
        amount = parseFloat(document.getElementById('customAmount').value) || 0;
    } else {
        amount = pricing[duration] || 0;
        
        if (ticketInventory.types[duration].available <= 0) {
            if (!confirm(`⚠️ No ${ticketTypeNames[duration]} tickets available! Do you want to continue anyway?`)) {
                return;
            }
        } else {
            useTicket(clientName, duration);
        }
    }
    
    if (!clientName) {
        showNotification('Please enter client name!', 'error');
        return;
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
        addedBy: employeeName
    };
    
    clients.push(client);
    saveData();
    updateDisplay();
    
    this.reset();
    document.getElementById('customAmountGroup').style.display = 'none';
    document.getElementById('amountDisplay').textContent = '1,000';
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    showNotification(`Client "${clientName}" added successfully!`);
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

function deleteClient(clientId) {
    if (confirm('Are you sure you want to delete this client record?')) {
        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            const client = clients[index];
            const clientDate = new Date(client.date).toISOString().split('T')[0];
            const today = new Date().toISOString().split('T')[0];
            
            if (clientDate === today && client.duration !== 'custom') {
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

function createClientItemHTML(client) {
    const time = new Date(client.date).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const statusClass = `status-${client.paymentStatus}`;
    const statusText = client.paymentStatus.charAt(0).toUpperCase() + client.paymentStatus.slice(1);
    const durationText = getDurationText(client.duration);
    
    return `
        <div class="client-item">
            <div class="client-info">
                <div class="client-name">${client.name}</div>
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

// ==================== HISTORY & REPORTS ====================

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
                    </tr>
                </thead>
                <tbody>
    `;
    
    report.clients.forEach(client => {
        const time = new Date(client.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        detailsHTML += `
            <tr>
                <td>${time}</td>
                <td>${client.name}</td>
                <td>${getDurationText(client.duration)}</td>
                <td>${client.amount.toLocaleString()} SSP</td>
                <td><span class="status-${client.paymentStatus}">${client.paymentStatus}</span></td>
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
                <button onclick="this.closest('.modal').remove()" class="btn btn-danger">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ==================== UTILITY FUNCTIONS ====================

function displayDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function updateEmployeeName() {
    const newName = document.getElementById('employeeNameInput').value.trim();
    if (newName) {
        employeeName = newName;
        document.getElementById('employeeName').textContent = employeeName;
        saveData();
        showNotification('Employee name updated successfully!');
    } else {
        showNotification('Please enter a valid name!', 'error');
    }
}

function filterClients() {
    displayClients();
}

function clearTodayData() {
    if (!confirm('Are you sure you want to clear all of today\'s data? This action cannot be undone!')) {
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    clients = clients.filter(client => {
        const clientDate = new Date(client.date).toISOString().split('T')[0];
        return clientDate !== today;
    });
    
    expenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date).toISOString().split('T')[0];
        return expenseDate !== today;
    });
    
    Object.keys(ticketInventory.types).forEach(type => {
        ticketInventory.types[type].usedToday = 0;
    });
    
    saveData();
    saveTicketData();
    updateDisplay();
    updateTicketDisplay();
    
    showNotification('Today\'s data has been cleared!');
}

function printReport() {
    window.print();
}

function exportData() {
    const today = new Date().toISOString().split('T')[0];
    const todayClients = clients.filter(client => {
        const clientDate = new Date(client.date).toISOString().split('T')[0];
        return clientDate === today;
    });
    
    let csv = 'Time,Name,Phone,Duration,Amount,Status,Notes\n';
    
    todayClients.forEach(client => {
        const time = new Date(client.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        csv += `"${time}","${client.name}","${client.phone || ''}","${getDurationText(client.duration)}","${client.amount}","${client.paymentStatus}","${client.notes || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-clients-${today}.csv`;
    a.click();
    
    showNotification('Data exported successfully!');
}

function backupData() {
    const backup = {
        version: '2.0',
        date: new Date().toISOString(),
        employee: employeeName,
        clients: clients,
        expenses: expenses,
        dailyReports: dailyReports,
        ticketInventory: ticketInventory
    };
    
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wifi-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showNotification('Backup created successfully!');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

// Auto-save every 5 minutes
setInterval(() => {
    if (currentUser) {
        saveData();
        saveTicketData();
    }
}, 300000);