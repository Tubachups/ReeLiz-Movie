/**
 * Scanner Page JavaScript
 * Polls the server for scan results from the background scanner thread
 */

// State management
let isDisplaying = false;
const POLL_INTERVAL = 500; // Poll every 500ms for new scans
const RESET_DELAY = 3000; // Reset to welcome screen after 3 seconds (matches servo timing)

// DOM Elements
const welcomeState = document.getElementById('welcomeState');
const processingState = document.getElementById('processingState');
const successState = document.getElementById('successState');
const errorState = document.getElementById('errorState');

// Waiting text element
const waitingText = document.getElementById('waitingText');

// Ticket display elements
const ticketName = document.getElementById('ticketName');
const ticketBarcode = document.getElementById('ticketBarcode');
const ticketRoom = document.getElementById('ticketRoom');
const ticketMovie = document.getElementById('ticketMovie');
const ticketSeats = document.getElementById('ticketSeats');
const ticketDate = document.getElementById('ticketDate');

// Error display elements
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const errorDetails = document.getElementById('errorDetails');

/**
 * Initialize scanner page
 */
function initScanner() {
    console.log('Scanner page initialized - polling mode');
    
    // Start polling for scan results
    setInterval(pollForScans, POLL_INTERVAL);
}

/**
 * Poll the server for new scan results
 */
async function pollForScans() {
    // Don't poll while displaying a result
    if (isDisplaying) return;
    
    try {
        const response = await fetch('/api/scanner/poll');
        const data = await response.json();
        
        if (data.has_scan && data.scan_result) {
            console.log('✓ Received scan result from server:', data.scan_result);
            handleScanResult(data.scan_result);
        }
        
        // Log errors if any
        if (data.status === 'error') {
            console.warn('Poll error:', data.message);
        }
        
    } catch (error) {
        // Silent fail - will retry on next poll
        console.debug('Poll error:', error);
    }
}

/**
 * Handle a scan result from the background thread
 */
function handleScanResult(result) {
    isDisplaying = true;
    console.log('Received scan result:', result);
    
    if (result.status === 'success') {
        showSuccess(result.ticket, result.door_unlocked, result.scan_info);
    } else {
        showError(result.error_type, result.message, result);
    }
    
    // Reset after delay
    setTimeout(() => {
        resetToWelcome();
        isDisplaying = false;
    }, RESET_DELAY);
}

/**
 * Show success state with ticket information
 */
function showSuccess(ticket, doorUnlocked = true, scanInfo = null) {
    hideAllStates();
    
    // Update ticket information
    if (ticketName) ticketName.textContent = ticket.name || '-';
    if (ticketBarcode) ticketBarcode.textContent = ticket.barcode || '-';
    if (ticketRoom) ticketRoom.textContent = `Cinema ${ticket.room}` || '-';
    if (ticketMovie) ticketMovie.textContent = ticket.movie || '-';
    if (ticketSeats) ticketSeats.textContent = ticket.sits || '-';
    if (ticketDate) ticketDate.textContent = formatDate(ticket.date) || '-';
    
    // Update door status with scan count info (now at top, centered)
    const doorStatus = document.querySelector('.door-status');
    if (doorStatus) {
        if (doorUnlocked) {
            // Show scan count info if available
            if (scanInfo) {
                if (scanInfo.all_scanned) {
                    doorStatus.innerHTML = `<i class="fa-solid fa-check-double me-2"></i>All ${scanInfo.total_tickets} ticket(s) scanned - Entry complete!`;
                    doorStatus.style.background = 'linear-gradient(to right, #4caf50, #45a049)';
                    doorStatus.style.color = '#fff';
                } else {
                    doorStatus.innerHTML = `<i class="fa-solid fa-door-open me-2"></i>Ticket ${scanInfo.current_scan} of ${scanInfo.total_tickets} - ${scanInfo.scans_remaining} remaining`;
                    doorStatus.style.background = 'linear-gradient(to right, #ffc107, #ff9800)';
                }
            } else {
                doorStatus.innerHTML = '<i class="fa-solid fa-door-open me-2"></i>Door is now open - Please proceed';
                doorStatus.style.background = 'linear-gradient(to right, #4caf50, #45a049)';
            }
        } else {
            doorStatus.innerHTML = '<i class="fa-solid fa-exclamation-triangle me-2"></i>Door issue - Staff will assist';
            doorStatus.style.background = 'linear-gradient(to right, #ff9800, #f57c00)';
        }
    }
    
    // Show success state
    if (successState) successState.classList.add('active');
    
    console.log('Showing success for:', ticket.name, scanInfo ? `(Scan ${scanInfo.current_scan}/${scanInfo.total_tickets})` : '');
}

/**
 * Show error state with appropriate message
 */
function showError(errorType, message, data = {}) {
    // Hide all states
    hideAllStates();
    
    // Set error content based on type
    let title = 'Access Denied';
    let details = '';
    
    switch (errorType) {
        case 'not_found':
            title = 'Ticket Not Found';
            details = `
                <p><i class="fa-solid fa-exclamation-triangle me-2"></i>The scanned barcode does not match any ticket in our system.</p>
                <p>Please verify you have the correct ticket.</p>
            `;
            break;
            
        case 'already_scanned':
            title = 'All Tickets Used';
            details = `
                <p><i class="fa-solid fa-check-double me-2"></i>All tickets for this barcode have already been scanned.</p>
                <p>Each seat ticket can only be used once for entry.</p>
            `;
            break;
            
        case 'expired':
            title = 'Ticket Expired';
            details = `
                <p><i class="fa-solid fa-clock me-2"></i>This ticket has expired.</p>
                <p>Tickets are only valid up to <span class="error-highlight">2 hours</span> after the scheduled showtime.</p>
                <p>Your showtime was: <span class="error-highlight">${data.showtime || 'Unknown'}</span></p>
            `;
            break;
            
        case 'wrong_date':
            title = 'Invalid Date';
            details = `
                <p><i class="fa-solid fa-calendar-xmark me-2"></i>This ticket is not valid for today.</p>
                <p>Ticket date: <span class="error-highlight">${data.ticket_date || 'Unknown'}</span></p>
                <p>Today's date: <span class="error-highlight">${data.today || new Date().toLocaleDateString()}</span></p>
                <p>Please come back on your selected booking date.</p>
            `;
            break;
            
        case 'future_date':
            title = 'Advance Booking';
            details = `
                <p><i class="fa-solid fa-calendar-day me-2"></i>This ticket is for a future date.</p>
                <p>Ticket date: <span class="error-highlight">${data.ticket_date || 'Unknown'}</span></p>
                <p>This ticket will only be valid on the selected booking date.</p>
            `;
            break;
            
        case 'invalid':
            title = 'Invalid Ticket';
            details = `
                <p><i class="fa-solid fa-ban me-2"></i>This ticket is not valid or has been cancelled.</p>
                <p>Status: <span class="error-highlight">${data.remarks || 'Invalid'}</span></p>
            `;
            break;
            
        case 'door_error':
            title = 'Door System Error';
            details = `
                <p><i class="fa-solid fa-door-closed me-2"></i>Unable to open the door at this time.</p>
                <p>Your ticket is valid but the door mechanism encountered an issue.</p>
            `;
            break;
            
        default:
            title = 'Error';
            details = `
                <p><i class="fa-solid fa-exclamation-circle me-2"></i>${message || 'An unexpected error occurred.'}</p>
            `;
    }
    
    errorTitle.textContent = title;
    errorMessage.textContent = message || 'Please see details below';
    errorDetails.innerHTML = details;
    
    // Show error state
    errorState.classList.add('active');
    
    // Play error sound (optional)
    playSound('error');
}

/**
 * Reset to welcome state
 */
function resetToWelcome() {
    hideAllStates();
    welcomeState.classList.add('active');
}

/**
 * Hide all scanner states
 */
function hideAllStates() {
    if (welcomeState) welcomeState.classList.remove('active');
    if (processingState) processingState.classList.remove('active');
    if (successState) successState.classList.remove('active');
    if (errorState) errorState.classList.remove('active');
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    
    // Expected format: MM/DD:HH
    const parts = dateStr.split(':');
    const datePart = parts[0]; // MM/DD
    const hour = parts[1]; // HH
    
    if (!datePart) return dateStr;
    
    const [month, day] = datePart.split('/');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(month) - 1] || month;
    
    let timeStr = '';
    if (hour) {
        const hourNum = parseInt(hour);
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const hour12 = hourNum % 12 || 12;
        timeStr = ` at ${hour12}:00 ${ampm}`;
    }
    
    return `${monthName} ${day}${timeStr}`;
}

/**
 * Play sound effect (optional)
 */
function playSound(type) {
    // You can add audio files and play them here
    // const audio = new Audio(`/static/sounds/${type}.mp3`);
    // audio.play();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initScanner);
