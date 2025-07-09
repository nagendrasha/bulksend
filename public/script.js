// Global variables
let socket;
let contacts = [];
let isConnected = false;
let isSending = false;

// DOM elements
const statusIndicator = document.getElementById('statusIndicator');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const qrSection = document.getElementById('qrSection');
const qrCode = document.getElementById('qrCode');
const dashboard = document.getElementById('dashboard');
const contactFile = document.getElementById('contactFile');
const contactUploadArea = document.getElementById('contactUploadArea');
const contactPreview = document.getElementById('contactPreview');
const contactCount = document.getElementById('contactCount');
const contactList = document.getElementById('contactList');
const messageText = document.getElementById('messageText');
const mediaFile = document.getElementById('mediaFile');
const mediaUploadArea = document.getElementById('mediaUploadArea');
const mediaPreview = document.getElementById('mediaPreview');
const messageDelay = document.getElementById('messageDelay');
const sendButton = document.getElementById('sendButton');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const sentCount = document.getElementById('sentCount');
const failedCount = document.getElementById('failedCount');
const progressLog = document.getElementById('progressLog');
const resultsSection = document.getElementById('resultsSection');
const resultsSummary = document.getElementById('resultsSummary');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// Initialize socket connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        checkStatus();
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateStatus('disconnected', 'Disconnected');
    });
    
    socket.on('qr', (qrData) => {
        showQRCode(qrData);
    });
    
    socket.on('ready', () => {
        updateStatus('connected', 'Connected');
        hideQRCode();
        showDashboard();
    });
    
    socket.on('authenticated', () => {
        showToast('WhatsApp authenticated successfully!', 'success');
    });
    
    socket.on('auth_failure', (msg) => {
        showToast('Authentication failed: ' + msg, 'error');
    });
    
    socket.on('disconnected', (reason) => {
        updateStatus('disconnected', 'Disconnected');
        showToast('WhatsApp disconnected: ' + reason, 'warning');
        showQRSection();
    });
    
    socket.on('messageProgress', (data) => {
        updateProgress(data);
    });
    
    socket.on('bulkComplete', (results) => {
        completeBulkSend(results);
    });
    
    socket.on('bulkError', (error) => {
        showToast('Bulk send error: ' + error, 'error');
        hideLoading();
        isSending = false;
        updateSendButton();
    });
    
    socket.on('messageLog', (logEntry) => {
        addLogEntry(logEntry);
    });
}

// Check server status
async function checkStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        if (status.isReady) {
            updateStatus('connected', 'Connected');
            showDashboard();
        } else if (status.qrCode) {
            showQRCode(status.qrCode);
        } else {
            updateStatus('connecting', 'Connecting...');
        }
    } catch (error) {
        console.error('Error checking status:', error);
        updateStatus('disconnected', 'Connection Error');
    }
}

// Update status indicator
function updateStatus(status, text) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
    isConnected = status === 'connected';
    updateSendButton();
}

// Show QR code
function showQRCode(qrData) {
    qrCode.src = qrData;
    qrSection.style.display = 'block';
    dashboard.style.display = 'none';
    updateStatus('connecting', 'Scan QR Code');
}

// Hide QR code
function hideQRCode() {
    qrSection.style.display = 'none';
}

// Show QR section
function showQRSection() {
    qrSection.style.display = 'block';
    dashboard.style.display = 'none';
}

// Show dashboard
function showDashboard() {
    qrSection.style.display = 'none';
    dashboard.style.display = 'block';
}

// File upload handlers
contactFile.addEventListener('change', handleContactFileUpload);
mediaFile.addEventListener('change', handleMediaFileUpload);

// Drag and drop for contact file
contactUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    contactUploadArea.classList.add('dragover');
});

contactUploadArea.addEventListener('dragleave', () => {
    contactUploadArea.classList.remove('dragover');
});

contactUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    contactUploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        contactFile.files = files;
        handleContactFileUpload();
    }
});

// Drag and drop for media file
mediaUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    mediaUploadArea.classList.add('dragover');
});

mediaUploadArea.addEventListener('dragleave', () => {
    mediaUploadArea.classList.remove('dragover');
});

mediaUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    mediaUploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        mediaFile.files = files;
        handleMediaFileUpload();
    }
});

// Handle contact file upload
async function handleContactFileUpload() {
    const file = contactFile.files[0];
    if (!file) return;
    
    const allowedTypes = ['.csv', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        showToast('Please upload a CSV or Excel file', 'error');
        contactFile.value = '';
        return;
    }
    
    showLoading();
    
    const formData = new FormData();
    formData.append('contactFile', file);
    
    try {
        const response = await fetch('/api/upload-contacts', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            contacts = result.contacts;
            displayContactPreview(contacts);
            showToast(`${result.count} contacts loaded successfully!`, 'success');
            updateSendButton();
        } else {
            showToast(result.error || 'Failed to upload contacts', 'error');
        }
    } catch (error) {
        console.error('Error uploading contacts:', error);
        showToast('Failed to upload contacts', 'error');
    } finally {
        hideLoading();
    }
}

// Display contact preview
function displayContactPreview(contacts) {
    contactCount.textContent = `${contacts.length} contacts loaded`;
    
    contactList.innerHTML = '';
    const displayCount = Math.min(contacts.length, 5);
    
    for (let i = 0; i < displayCount; i++) {
        const contact = contacts[i];
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-item';
        contactItem.innerHTML = `
            <span class="contact-name">${contact.name}</span>
            <span class="contact-number">${contact.number}</span>
        `;
        contactList.appendChild(contactItem);
    }
    
    if (contacts.length > 5) {
        const moreItem = document.createElement('div');
        moreItem.className = 'contact-item';
        moreItem.innerHTML = `<span style="color: #666; font-style: italic;">... and ${contacts.length - 5} more</span>`;
        contactList.appendChild(moreItem);
    }
    
    contactPreview.style.display = 'block';
}

// Handle media file upload
function handleMediaFileUpload() {
    const file = mediaFile.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
        showToast('Please upload a JPG, PNG, or PDF file', 'error');
        mediaFile.value = '';
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
        showToast('File size must be less than 10MB', 'error');
        mediaFile.value = '';
        return;
    }
    
    displayMediaPreview(file);
}

// Display media preview
function displayMediaPreview(file) {
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    
    mediaPreview.innerHTML = `
        <div class="media-info">
            <div class="media-name">${file.name}</div>
            <div class="media-size">${fileSize} MB</div>
        </div>
        <button class="remove-media" onclick="removeMedia()">
            <i class="fas fa-times"></i> Remove
        </button>
    `;
    
    // Add image preview if it's an image
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            mediaPreview.insertBefore(img, mediaPreview.firstChild);
        };
        reader.readAsDataURL(file);
    } else {
        const icon = document.createElement('i');
        icon.className = 'fas fa-file-pdf';
        icon.style.fontSize = '40px';
        icon.style.color = '#dc3545';
        mediaPreview.insertBefore(icon, mediaPreview.firstChild);
    }
    
    mediaPreview.style.display = 'flex';
}

// Remove media
function removeMedia() {
    mediaFile.value = '';
    mediaPreview.style.display = 'none';
    mediaPreview.innerHTML = '';
}

// Update send button state
function updateSendButton() {
    const hasContacts = contacts.length > 0;
    const hasMessage = messageText.value.trim().length > 0;
    const canSend = isConnected && hasContacts && hasMessage && !isSending;
    
    sendButton.disabled = !canSend;
    
    if (!isConnected) {
        sendButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> WhatsApp Not Connected';
    } else if (!hasContacts) {
        sendButton.innerHTML = '<i class="fas fa-upload"></i> Upload Contacts First';
    } else if (!hasMessage) {
        sendButton.innerHTML = '<i class="fas fa-edit"></i> Enter Message';
    } else if (isSending) {
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    } else {
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Start Sending';
    }
}

// Message text change handler
messageText.addEventListener('input', updateSendButton);

// Send button click handler
sendButton.addEventListener('click', startBulkSend);

// Start bulk send
async function startBulkSend() {
    if (!isConnected || contacts.length === 0 || !messageText.value.trim() || isSending) {
        return;
    }
    
    isSending = true;
    updateSendButton();
    
    // Show progress section
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    // Reset progress
    resetProgress();
    
    // Scroll to progress section
    progressSection.scrollIntoView({ behavior: 'smooth' });
    
    const formData = new FormData();
    formData.append('contacts', JSON.stringify(contacts));
    formData.append('message', messageText.value);
    formData.append('delay', messageDelay.value * 1000); // Convert to milliseconds
    
    if (mediaFile.files[0]) {
        formData.append('mediaFile', mediaFile.files[0]);
    }
    
    try {
        const response = await fetch('/api/send-messages', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Bulk sending started!', 'success');
        } else {
            showToast(result.error || 'Failed to start bulk sending', 'error');
            isSending = false;
            updateSendButton();
        }
    } catch (error) {
        console.error('Error starting bulk send:', error);
        showToast('Failed to start bulk sending', 'error');
        isSending = false;
        updateSendButton();
    }
}

// Reset progress
function resetProgress() {
    progressFill.style.width = '0%';
    progressText.textContent = '0 / 0';
    sentCount.textContent = '0';
    failedCount.textContent = '0';
    progressLog.innerHTML = '';
}

// Update progress
function updateProgress(data) {
    const percentage = (data.current / data.total) * 100;
    progressFill.style.width = percentage + '%';
    progressText.textContent = `${data.current} / ${data.total}`;
    
    // Update counters
    const currentSent = parseInt(sentCount.textContent);
    const currentFailed = parseInt(failedCount.textContent);
    
    if (data.status === 'sent') {
        sentCount.textContent = currentSent + 1;
    } else if (data.status === 'failed') {
        failedCount.textContent = currentFailed + 1;
    }
    
    // Add to log
    addProgressLogEntry(data);
}

// Add progress log entry
function addProgressLogEntry(data) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const statusIcon = data.status === 'sent' ? '✓' : '✗';
    const statusClass = data.status === 'sent' ? 'success' : 'failed';
    
    logEntry.innerHTML = `
        <div class="log-status ${statusClass}">${statusIcon}</div>
        <div class="log-contact">${data.contact.name}</div>
        <div class="log-message">${data.contact.number}${data.error ? ' - ' + data.error : ''}</div>
    `;
    
    progressLog.appendChild(logEntry);
    progressLog.scrollTop = progressLog.scrollHeight;
}

// Add log entry (from server)
function addLogEntry(logEntry) {
    // This is handled by updateProgress for real-time updates
}

// Complete bulk send
function completeBulkSend(results) {
    isSending = false;
    updateSendButton();
    
    // Show results
    showResults(results);
    
    showToast(`Bulk sending completed! ${results.sent} sent, ${results.failed} failed`, 'success');
}

// Show results
function showResults(results) {
    const successRate = ((results.sent / results.total) * 100).toFixed(1);
    
    resultsSummary.innerHTML = `
        <div class="result-item">
            <span>Total Contacts:</span>
            <span>${results.total}</span>
        </div>
        <div class="result-item">
            <span>Successfully Sent:</span>
            <span style="color: #28a745;">${results.sent}</span>
        </div>
        <div class="result-item">
            <span>Failed:</span>
            <span style="color: #dc3545;">${results.failed}</span>
        </div>
        <div class="result-item">
            <span>Success Rate:</span>
            <span style="color: ${successRate >= 80 ? '#28a745' : successRate >= 50 ? '#ffc107' : '#dc3545'};">${successRate}%</span>
        </div>
    `;
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Reset dashboard
function resetDashboard() {
    // Reset form
    contactFile.value = '';
    messageText.value = '';
    mediaFile.value = '';
    messageDelay.value = '5';
    
    // Reset data
    contacts = [];
    
    // Hide sections
    contactPreview.style.display = 'none';
    mediaPreview.style.display = 'none';
    progressSection.style.display = 'none';
    resultsSection.style.display = 'none';
    
    // Reset progress
    resetProgress();
    
    // Update button
    updateSendButton();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Remove on click
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    updateSendButton();
});