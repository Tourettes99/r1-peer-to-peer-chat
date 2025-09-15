// Main application logic for R1 Chat
let currentPage = 'chat';
let currentRoom = null;
let userSettings = {
    nickname: 'User',
    textColor: '#ffff00',
    bubbleColor: '#ffff00'
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeSettings();
    loadUserSettings();
    loadRooms();
    
    // Check if running as R1 plugin
    if (typeof PluginMessageHandler !== 'undefined') {
        console.log('Running as R1 Creation');
        initializeR1Features();
    } else {
        console.log('Running in browser mode');
        initializeDemoMode();
    }
});

// Navigation system
function initializeNavigation() {
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const menuNav = document.getElementById('menuNav');
    const menuLinks = document.querySelectorAll('.menu-nav a');
    
    // Toggle menu
    menuBtn.addEventListener('click', () => {
        menuNav.classList.add('open');
    });
    
    closeMenu.addEventListener('click', () => {
        menuNav.classList.remove('open');
    });
    
    // Handle menu navigation
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            loadPage(page);
            menuNav.classList.remove('open');
            
            // Update active state
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// Load page content
function loadPage(pageName) {
    const pages = document.querySelectorAll('.page');
    const menuLinks = document.querySelectorAll('.menu-nav a');
    
    // Hide all pages
    pages.forEach(page => page.classList.remove('active'));
    
    // Show selected page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageName;
        
        // Page-specific initialization
        switch(pageName) {
            case 'chat':
                initializeChatPage();
                break;
            case 'rooms':
                initializeRoomsPage();
                break;
            case 'settings':
                initializeSettingsPage();
                break;
        }
    }
}

// Initialize chat page
function initializeChatPage() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    if (currentRoom) {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    } else {
        messageInput.disabled = true;
        sendButton.disabled = true;
    }
    
    // Message input handling
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !messageInput.disabled) {
            sendMessage();
        }
    });
    
    sendButton.addEventListener('click', sendMessage);
}

// Initialize rooms page
function initializeRoomsPage() {
    loadRooms();
}

// Initialize settings page
function initializeSettingsPage() {
    // Settings are already initialized in initializeSettings()
}

// Initialize settings
function initializeSettings() {
    const nicknameInput = document.getElementById('nicknameInput');
    const textColorPicker = document.getElementById('textColorPicker');
    const bubbleColorPicker = document.getElementById('bubbleColorPicker');
    const saveNicknameBtn = document.getElementById('saveNicknameBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    
    // Load current settings
    nicknameInput.value = userSettings.nickname;
    textColorPicker.value = userSettings.textColor;
    bubbleColorPicker.value = userSettings.bubbleColor;
    
    // Event listeners
    saveNicknameBtn.addEventListener('click', saveNickname);
    textColorPicker.addEventListener('change', updateTextColor);
    bubbleColorPicker.addEventListener('change', updateBubbleColor);
    clearDataBtn.addEventListener('click', clearAllData);
}

// Initialize R1-specific features
function initializeR1Features() {
    // Hardware button listeners
    window.addEventListener('scrollUp', () => {
        if (currentPage === 'chat') {
            scrollMessages('up');
        }
    });
    
    window.addEventListener('scrollDown', () => {
        if (currentPage === 'chat') {
            scrollMessages('down');
        }
    });
    
    // PTT button for voice messages (future feature)
    window.addEventListener('sideClick', () => {
        if (currentPage === 'chat' && currentRoom) {
            // Could implement voice message recording here
            console.log('PTT pressed - voice message feature not implemented yet');
        }
    });
    
    // Long press for quick actions
    window.addEventListener('longPressStart', () => {
        console.log('Long press started');
    });
    
    window.addEventListener('longPressEnd', () => {
        if (currentPage === 'chat') {
            // Quick room switch or other action
            loadPage('rooms');
        }
    });
}

// Initialize demo mode for browser testing
function initializeDemoMode() {
    console.log('Demo mode: Simulating R1 features');
    // Add demo functionality here if needed
}

// Load user settings from storage
async function loadUserSettings() {
    try {
        if (typeof window.creationStorage !== 'undefined') {
            const stored = await window.creationStorage.plain.getItem('user_settings');
            if (stored) {
                const settings = JSON.parse(atob(stored));
                userSettings = { ...userSettings, ...settings };
                updateUIWithSettings();
            }
        } else {
            // Fallback to localStorage for demo mode
            const stored = localStorage.getItem('r1_chat_settings');
            if (stored) {
                userSettings = { ...userSettings, ...JSON.parse(stored) };
                updateUIWithSettings();
            }
        }
    } catch (error) {
        console.error('Error loading user settings:', error);
    }
}

// Save user settings to storage
async function saveUserSettings() {
    try {
        if (typeof window.creationStorage !== 'undefined') {
            await window.creationStorage.plain.setItem('user_settings', btoa(JSON.stringify(userSettings)));
        } else {
            // Fallback to localStorage for demo mode
            localStorage.setItem('r1_chat_settings', JSON.stringify(userSettings));
        }
    } catch (error) {
        console.error('Error saving user settings:', error);
    }
}

// Update UI with current settings
function updateUIWithSettings() {
    // Update nickname display
    const nicknameInput = document.getElementById('nicknameInput');
    if (nicknameInput) {
        nicknameInput.value = userSettings.nickname;
    }
    
    // Update color pickers
    const textColorPicker = document.getElementById('textColorPicker');
    const bubbleColorPicker = document.getElementById('bubbleColorPicker');
    if (textColorPicker) textColorPicker.value = userSettings.textColor;
    if (bubbleColorPicker) bubbleColorPicker.value = userSettings.bubbleColor;
    
    // Apply colors to UI
    applyColorSettings();
}

// Apply color settings to the UI
function applyColorSettings() {
    // Update message bubble colors
    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        if (message.classList.contains('own')) {
            message.style.background = userSettings.bubbleColor;
            message.style.color = '#000';
        } else {
            message.style.color = userSettings.textColor;
        }
    });
    
    // Update other UI elements with text color
    document.documentElement.style.setProperty('--accent-color', userSettings.textColor);
}

// Save nickname
async function saveNickname() {
    const nicknameInput = document.getElementById('nicknameInput');
    const newNickname = nicknameInput.value.trim();
    
    if (newNickname && newNickname !== userSettings.nickname) {
        userSettings.nickname = newNickname;
        await saveUserSettings();
        
        // Show confirmation
        showNotification('Nickname saved!');
    }
}

// Update text color
async function updateTextColor() {
    const textColorPicker = document.getElementById('textColorPicker');
    userSettings.textColor = textColorPicker.value;
    await saveUserSettings();
    applyColorSettings();
    showNotification('Text color updated!');
}

// Update bubble color
async function updateBubbleColor() {
    const bubbleColorPicker = document.getElementById('bubbleColorPicker');
    userSettings.bubbleColor = bubbleColorPicker.value;
    await saveUserSettings();
    applyColorSettings();
    showNotification('Bubble color updated!');
}

// Clear all data
async function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        try {
            if (typeof window.creationStorage !== 'undefined') {
                await window.creationStorage.plain.clear();
            } else {
                localStorage.clear();
            }
            
            // Reset to defaults
            userSettings = {
                nickname: 'User',
                textColor: '#ffff00',
                bubbleColor: '#ffff00'
            };
            
            // Reload the page
            location.reload();
        } catch (error) {
            console.error('Error clearing data:', error);
            showNotification('Error clearing data');
        }
    }
}

// Show notification
function showNotification(message) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffff00;
        color: #000;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
        z-index: 3000;
        animation: fadeIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Scroll messages (for hardware scroll wheel)
function scrollMessages(direction) {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        const scrollAmount = 20;
        if (direction === 'up') {
            chatMessages.scrollTop -= scrollAmount;
        } else {
            chatMessages.scrollTop += scrollAmount;
        }
    }
}

// Plugin message handler for R1 integration
window.onPluginMessage = function(data) {
    console.log('Received plugin message:', data);
    
    // Handle different types of messages
    if (data.data) {
        try {
            const parsedData = JSON.parse(data.data);
            handlePluginData(parsedData);
        } catch (e) {
            console.log('Plain string data:', data.data);
        }
    }
    
    if (data.message) {
        console.log('Message data:', data.message);
    }
};

// Handle parsed plugin data
function handlePluginData(data) {
    // Handle different types of plugin responses
    if (data.type === 'chat_message') {
        addMessage(data.message, data.sender, false);
    } else if (data.type === 'room_update') {
        loadRooms();
    }
}

// Export functions for other modules
window.ChatApp = {
    loadPage,
    userSettings,
    showNotification,
    applyColorSettings
};
