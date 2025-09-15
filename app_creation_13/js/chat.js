// Chat functionality for R1 Chat
let messages = [];
let rooms = [];

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
});

function initializeChat() {
    // Load existing rooms and messages
    loadRooms();
    loadMessages();
    
    // Initialize room creation modal
    initializeRoomModal();
}

// Send message
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || !currentRoom) return;
    
    // Create message object
    const messageObj = {
        id: Date.now(),
        text: message,
        sender: userSettings.nickname,
        timestamp: new Date(),
        roomId: currentRoom.id
    };
    
    // Add to messages array
    messages.push(messageObj);
    
    // Save messages
    saveMessages();
    
    // Add to UI
    addMessage(message, userSettings.nickname, true);
    
    // Clear input
    messageInput.value = '';
    
    // Send via peer connection if available
    if (window.PeerConnection) {
        const success = window.PeerConnection.sendMessage(messageObj);
        if (!success) {
            console.warn('Failed to send message via peer connection');
        }
    }
    
    // Send via R1 plugin if available
    if (typeof PluginMessageHandler !== 'undefined') {
        PluginMessageHandler.postMessage(JSON.stringify({
            message: `Send chat message: ${message}`,
            useLLM: false,
            data: JSON.stringify({
                type: 'chat_message',
                message: messageObj
            })
        }));
    }
}

// Add message to UI
function addMessage(text, sender, isOwn) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Remove welcome message if it exists
    const welcomeMessage = chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="sender">${sender}</div>
        <div class="text">${escapeHtml(text)}</div>
        <div class="timestamp">${timestamp}</div>
    `;
    
    // Apply user color settings
    if (isOwn) {
        messageDiv.style.background = userSettings.bubbleColor;
        messageDiv.style.color = '#000';
    } else {
        messageDiv.style.color = userSettings.textColor;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load rooms
async function loadRooms() {
    try {
        let storedRooms = [];
        
        if (typeof window.creationStorage !== 'undefined') {
            const stored = await window.creationStorage.plain.getItem('chat_rooms');
            if (stored) {
                storedRooms = JSON.parse(atob(stored));
            }
        } else {
            // Fallback to localStorage for demo mode
            const stored = localStorage.getItem('r1_chat_rooms');
            if (stored) {
                storedRooms = JSON.parse(stored);
            }
        }
        
        rooms = storedRooms;
        updateRoomsUI();
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Save rooms
async function saveRooms() {
    try {
        if (typeof window.creationStorage !== 'undefined') {
            await window.creationStorage.plain.setItem('chat_rooms', btoa(JSON.stringify(rooms)));
        } else {
            // Fallback to localStorage for demo mode
            localStorage.setItem('r1_chat_rooms', JSON.stringify(rooms));
        }
    } catch (error) {
        console.error('Error saving rooms:', error);
    }
}

// Update rooms UI
function updateRoomsUI() {
    const roomsList = document.getElementById('roomsList');
    if (!roomsList) return;
    
    roomsList.innerHTML = '';
    
    if (rooms.length === 0) {
        roomsList.innerHTML = '<div class="no-rooms">No rooms yet. Create one to get started!</div>';
        return;
    }
    
    rooms.forEach(room => {
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-item';
        if (currentRoom && currentRoom.id === room.id) {
            roomDiv.classList.add('active');
        }
        
        roomDiv.innerHTML = `
            <div class="room-name">${escapeHtml(room.name)}</div>
            <div class="room-info">Created: ${new Date(room.createdAt).toLocaleDateString()}</div>
        `;
        
        roomDiv.addEventListener('click', () => {
            joinRoom(room);
        });
        
        roomsList.appendChild(roomDiv);
    });
}

// Create new room
function createRoom(name) {
    const room = {
        id: Date.now(),
        name: name,
        createdAt: new Date(),
        participants: [userSettings.nickname]
    };
    
    rooms.push(room);
    saveRooms();
    updateRoomsUI();
    
    // Auto-join the new room
    joinRoom(room);
    
    // Switch to chat page
    loadPage('chat');
    
    showNotification(`Room "${name}" created!`);
}

// Join room
async function joinRoom(room) {
    // Prevent multiple rapid joins
    if (window.isJoiningRoom) {
        console.log('Already joining a room, please wait...');
        return;
    }
    
    window.isJoiningRoom = true;
    currentRoom = room;
    
    // Update UI
    const currentRoomName = document.getElementById('currentRoomName');
    if (currentRoomName) {
        currentRoomName.textContent = room.name;
    }
    
    // Enable chat input
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    if (messageInput) messageInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
    
    // Load room messages
    loadRoomMessages(room.id);
    
    // Update rooms UI
    updateRoomsUI();
    
    // Join room via peer connection
    if (window.PeerConnection) {
        try {
            await window.PeerConnection.joinRoom(room.id);
            showNotification(`Joined room "${room.name}" - Connecting to peers...`);
        } catch (error) {
            console.error('Failed to join room via peer connection:', error);
            showNotification(`Joined room "${room.name}" - Peer connection failed`);
        }
    } else {
        showNotification(`Joined room "${room.name}"`);
    }
    
    // Switch to chat page
    loadPage('chat');
    
    // Reset joining flag after a delay
    setTimeout(() => {
        window.isJoiningRoom = false;
    }, 2000);
}

// Load messages for specific room
function loadRoomMessages(roomId) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Clear current messages
    chatMessages.innerHTML = '';
    
    // Filter messages for this room
    const roomMessages = messages.filter(msg => msg.roomId === roomId);
    
    if (roomMessages.length === 0) {
        chatMessages.innerHTML = '<div class="welcome-message"><p>No messages yet. Start the conversation!</p></div>';
        return;
    }
    
    // Display messages
    roomMessages.forEach(msg => {
        const isOwn = msg.sender === userSettings.nickname;
        addMessage(msg.text, msg.sender, isOwn);
    });
}

// Load all messages
async function loadMessages() {
    try {
        let storedMessages = [];
        
        if (typeof window.creationStorage !== 'undefined') {
            const stored = await window.creationStorage.plain.getItem('chat_messages');
            if (stored) {
                storedMessages = JSON.parse(atob(stored));
            }
        } else {
            // Fallback to localStorage for demo mode
            const stored = localStorage.getItem('r1_chat_messages');
            if (stored) {
                storedMessages = JSON.parse(stored);
            }
        }
        
        messages = storedMessages;
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Save messages
async function saveMessages() {
    try {
        if (typeof window.creationStorage !== 'undefined') {
            await window.creationStorage.plain.setItem('chat_messages', btoa(JSON.stringify(messages)));
        } else {
            // Fallback to localStorage for demo mode
            localStorage.setItem('r1_chat_messages', JSON.stringify(messages));
        }
    } catch (error) {
        console.error('Error saving messages:', error);
    }
}

// Initialize room creation modal
function initializeRoomModal() {
    const createRoomBtn = document.getElementById('createRoomBtn');
    const createRoomModal = document.getElementById('createRoomModal');
    const newRoomName = document.getElementById('newRoomName');
    const confirmCreateRoom = document.getElementById('confirmCreateRoom');
    const cancelCreateRoom = document.getElementById('cancelCreateRoom');
    
    if (!createRoomBtn || !createRoomModal) return;
    
    // Open modal
    createRoomBtn.addEventListener('click', () => {
        createRoomModal.classList.add('show');
        newRoomName.focus();
    });
    
    // Close modal
    cancelCreateRoom.addEventListener('click', () => {
        createRoomModal.classList.remove('show');
        newRoomName.value = '';
    });
    
    // Create room
    confirmCreateRoom.addEventListener('click', () => {
        const roomName = newRoomName.value.trim();
        if (roomName) {
            createRoom(roomName);
            createRoomModal.classList.remove('show');
            newRoomName.value = '';
        }
    });
    
    // Enter key to create room
    newRoomName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmCreateRoom.click();
        }
    });
    
    // Close modal when clicking outside
    createRoomModal.addEventListener('click', (e) => {
        if (e.target === createRoomModal) {
            createRoomModal.classList.remove('show');
            newRoomName.value = '';
        }
    });
}

// Initialize rooms page
function initializeRoomsPage() {
    loadRooms();
}

// Export functions for other modules
window.ChatModule = {
    sendMessage,
    addMessage,
    createRoom,
    joinRoom,
    loadRooms,
    loadMessages,
    saveMessages
};
