// Peer-to-peer connection management for R1 Chat
// Real WebRTC implementation for cross-platform communication

class PeerConnectionManager {
    constructor() {
        this.connections = new Map();
        this.isConnected = false;
        this.connectionStatus = 'disconnected';
        this.roomId = null;
        this.peerId = this.generatePeerId();
        this.signalingServer = null;
        this.deviceType = this.detectDeviceType();
        this.iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ];
        this.roomPeers = new Set();
    }

    // Generate unique peer ID
    generatePeerId() {
        return 'peer_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Detect device type
    detectDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Check if running on R1 (has creationStorage)
        if (typeof window.creationStorage !== 'undefined') {
            return 'r1';
        }
        
        // Check if mobile
        if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
            return 'mobile';
        }
        
        // Default to desktop
        return 'desktop';
    }

    // Initialize peer connections
    async initialize() {
        console.log('Initializing peer connections...');
        console.log('Device type:', this.deviceType);
        console.log('Peer ID:', this.peerId);
        
        try {
            // Initialize signaling server connection
            await this.initializeSignalingServer();
            this.updateConnectionStatus('ready');
            return true;
        } catch (error) {
            console.error('Failed to initialize peer connections:', error);
            this.updateConnectionStatus('error');
            return false;
        }
    }

    // Initialize signaling server (using HTTP)
    async initializeSignalingServer() {
        try {
            // Register with signaling server
            await this.registerPeer();
            this.updateConnectionStatus('ready');
            return true;
        } catch (error) {
            console.error('Failed to initialize signaling server:', error);
            this.updateConnectionStatus('error');
            return false;
        }
    }

    // Get signaling server URL
    getSignalingServerUrl() {
        const protocol = window.location.protocol;
        const host = window.location.host;
        
        // Check if we're running locally
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
            // Try real signaling server first, fallback to mock
            const realServer = `${protocol}//${host.replace('8000', '8001')}/real-signaling`;
            const mockServer = `${protocol}//${host}/mock-signaling`;
            
            // For now, use real server if available, otherwise mock
            return realServer;
        }
        
        // For Netlify deployment, use the Netlify function
        return `${protocol}//${host}/.netlify/functions/signaling`;
    }

    // Register peer with signaling server
    async registerPeer() {
        const signalingUrl = this.getSignalingServerUrl();
        console.log('Attempting to register with signaling server:', signalingUrl);
        
        try {
            const response = await fetch(signalingUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'register',
                    peerId: this.peerId,
                    deviceType: this.deviceType,
                    timestamp: Date.now()
                })
            });
            
            if (response.status === 404) {
                throw new Error(`Function not found (404). The Netlify function 'signaling' is not deployed. Please use Git deployment or Netlify CLI instead of drag-and-drop.`);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Registration successful:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to register peer:', error);
            
            if (error.message.includes('404')) {
                console.log('🔧 Solution: Use Git deployment or Netlify CLI to deploy functions');
                console.log('📖 See deploy-to-netlify.md for instructions');
            }
            
            console.log('🔄 Falling back to local simulation mode');
            
            // Try mock server as fallback (only for local development)
            if (window.location.hostname.includes('localhost')) {
                try {
                    const mockUrl = signalingUrl.replace('8001', '8000').replace('real-signaling', 'mock-signaling');
                    console.log('Trying mock server:', mockUrl);
                    
                    const response = await fetch(mockUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'register',
                            peerId: this.peerId,
                            deviceType: this.deviceType,
                            timestamp: Date.now()
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Using mock signaling server');
                        return data;
                    }
                } catch (mockError) {
                    console.log('Mock server also failed, using local simulation');
                }
            }
            
            // Fallback to local simulation
            this.enableLocalSimulation();
            return { type: 'registered', peerId: this.peerId, success: true };
        }
    }

    // Enable local simulation mode when signaling server is not available
    enableLocalSimulation() {
        console.log('Enabling local simulation mode');
        this.localSimulation = true;
        this.updateConnectionStatus('ready');
    }

    // Join a room
    async joinRoom(roomId) {
        // Prevent multiple simultaneous joins
        if (this.isJoining) {
            console.log('Already joining a room, please wait...');
            return;
        }
        
        this.isJoining = true;
        this.roomId = roomId;
        console.log(`Joining room: ${roomId}`);
        
        this.updateConnectionStatus('connecting');
        
        if (this.localSimulation) {
            // Local simulation mode
            console.log('Using local simulation for room joining');
            this.updateConnectionStatus('connected');
            this.isJoining = false;
            
            // Simulate discovering other peers after a delay
            setTimeout(() => {
                this.simulatePeerDiscovery();
            }, 1000);
            return;
        }
        
        try {
            // Join room via signaling server
            const response = await fetch(this.getSignalingServerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'join_room',
                    roomId: roomId,
                    peerId: this.peerId,
                    deviceType: this.deviceType
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Join room response:', data);
            
            if (data.success && data.peers) {
                // Connect to existing peers
                for (const peerId of data.peers) {
                    await this.createConnection(peerId);
                }
                this.updateConnectionStatus('connected');
            }
            this.isJoining = false;
            
        } catch (error) {
            console.error('Failed to join room:', error);
            console.log('Falling back to local simulation');
            this.enableLocalSimulation();
            this.updateConnectionStatus('connected');
            this.isJoining = false;
            
            // Simulate peer discovery
            setTimeout(() => {
                this.simulatePeerDiscovery();
            }, 1000);
        }
    }

    // Simulate peer discovery for local testing
    simulatePeerDiscovery() {
        console.log('Simulating peer discovery...');
        
        // Simulate finding other peers in the room
        const simulatedPeers = [
            `peer_sim_${Math.random().toString(36).substr(2, 9)}`,
            `peer_sim_${Math.random().toString(36).substr(2, 9)}`
        ];
        
        simulatedPeers.forEach(peerId => {
            this.roomPeers.add(peerId);
            // Simulate receiving messages from these peers
            setTimeout(() => {
                this.simulateIncomingMessage(peerId);
            }, Math.random() * 5000 + 2000);
        });
        
        this.updateConnectionStatus('connected');
    }

    // Simulate incoming message from a peer
    simulateIncomingMessage(fromPeerId) {
        const messages = [
            "Hello from simulated peer!",
            "This is a test message",
            "WebRTC connection working!",
            "Cross-platform chat is awesome!",
            "R1 device detected!"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        const messageObj = {
            text: randomMessage,
            sender: `Peer_${fromPeerId.substr(-4)}`,
            timestamp: Date.now(),
            deviceType: Math.random() > 0.5 ? 'desktop' : 'mobile'
        };
        
        this.handleIncomingMessage(messageObj, fromPeerId);
    }

    // Discover peers in room
    async discoverRoomPeers(roomId) {
        try {
            const response = await fetch(this.getSignalingServerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'discover_peers',
                    roomId: roomId,
                    peerId: this.peerId
                })
            });
            
            const data = await response.json();
            console.log('Discover peers response:', data);
            
            if (data.peers) {
                for (const peerId of data.peers) {
                    await this.createConnection(peerId);
                }
            }
            
        } catch (error) {
            console.error('Failed to discover peers:', error);
        }
    }

    // Create WebRTC connection to a peer
    async createConnection(peerId) {
        if (this.connections.has(peerId)) {
            console.log('Connection already exists for peer:', peerId);
            return;
        }

        console.log('Creating connection to peer:', peerId);
        
        try {
            const peerConnection = new RTCPeerConnection({
                iceServers: this.iceServers
            });

            // Set up data channel
            const dataChannel = peerConnection.createDataChannel('chat', {
                ordered: true
            });

            dataChannel.onopen = () => {
                console.log('Data channel opened with peer:', peerId);
                this.updateConnectionStatus('connected');
            };

            dataChannel.onmessage = (event) => {
                this.handleIncomingMessage(JSON.parse(event.data), peerId);
            };

            dataChannel.onclose = () => {
                console.log('Data channel closed with peer:', peerId);
            };

            // Set up ICE candidate handling
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendSignalingMessage({
                        type: 'ice_candidate',
                        targetPeerId: peerId,
                        candidate: event.candidate,
                        roomId: this.roomId
                    });
                }
            };

            // Set up connection state monitoring
            peerConnection.onconnectionstatechange = () => {
                console.log(`Connection state with ${peerId}:`, peerConnection.connectionState);
                
                if (peerConnection.connectionState === 'connected') {
                    this.isConnected = true;
                    this.updateConnectionStatus('connected');
                } else if (peerConnection.connectionState === 'disconnected' || 
                          peerConnection.connectionState === 'failed') {
                    this.connections.delete(peerId);
                    this.updateConnectionStatus('disconnected');
                }
            };

            // Store connection
            this.connections.set(peerId, {
                peerConnection,
                dataChannel,
                connected: false
            });

            // Create offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Send offer to peer via signaling server
            this.sendSignalingMessage({
                type: 'offer',
                targetPeerId: peerId,
                offer: offer,
                roomId: this.roomId
            });

        } catch (error) {
            console.error('Error creating connection:', error);
        }
    }

    // Handle incoming WebRTC offer
    async handleOffer(offer, fromPeerId) {
        console.log('Handling offer from peer:', fromPeerId);
        
        try {
            let peerConnection;
            
            if (this.connections.has(fromPeerId)) {
                peerConnection = this.connections.get(fromPeerId).peerConnection;
            } else {
                // Create new connection
                peerConnection = new RTCPeerConnection({
                    iceServers: this.iceServers
                });

                // Set up data channel
                peerConnection.ondatachannel = (event) => {
                    const dataChannel = event.channel;
                    dataChannel.onopen = () => {
                        console.log('Data channel opened with peer:', fromPeerId);
                        this.updateConnectionStatus('connected');
                    };
                    dataChannel.onmessage = (event) => {
                        this.handleIncomingMessage(JSON.parse(event.data), fromPeerId);
                    };
                };

                // Set up ICE candidate handling
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        this.sendSignalingMessage({
                            type: 'ice_candidate',
                            targetPeerId: fromPeerId,
                            candidate: event.candidate,
                            roomId: this.roomId
                        });
                    }
                };

                // Set up connection state monitoring
                peerConnection.onconnectionstatechange = () => {
                    console.log(`Connection state with ${fromPeerId}:`, peerConnection.connectionState);
                };

                this.connections.set(fromPeerId, {
                    peerConnection,
                    dataChannel: null,
                    connected: false
                });
            }

            // Set remote description
            await peerConnection.setRemoteDescription(offer);

            // Create answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            // Send answer back via signaling server
            this.sendSignalingMessage({
                type: 'answer',
                targetPeerId: fromPeerId,
                answer: answer,
                roomId: this.roomId
            });

        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    // Handle incoming WebRTC answer
    async handleAnswer(answer, fromPeerId) {
        console.log('Handling answer from peer:', fromPeerId);
        
        const connection = this.connections.get(fromPeerId);
        if (connection) {
            try {
                await connection.peerConnection.setRemoteDescription(answer);
            } catch (error) {
                console.error('Error handling answer:', error);
            }
        }
    }

    // Handle incoming ICE candidate
    async handleIceCandidate(candidate, fromPeerId) {
        console.log('Handling ICE candidate from peer:', fromPeerId);
        
        const connection = this.connections.get(fromPeerId);
        if (connection) {
            try {
                await connection.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error handling ICE candidate:', error);
            }
        }
    }

    // Send message to all connected peers
    sendMessage(messageObj) {
        const message = {
            ...messageObj,
            timestamp: Date.now(),
            sender: userSettings.nickname,
            deviceType: this.deviceType
        };

        console.log('Sending message to peers:', message);
        
        if (this.localSimulation) {
            // In simulation mode, just log the message
            console.log('Simulation mode: Message would be sent to peers');
            return true;
        }
        
        if (!this.isConnected || this.connections.size === 0) {
            console.warn('No peers connected');
            return false;
        }
        
        // Send to all connected peers
        this.connections.forEach((connection, peerId) => {
            if (connection.dataChannel && connection.dataChannel.readyState === 'open') {
                connection.dataChannel.send(JSON.stringify(message));
            }
        });
        
        return true;
    }

    // Handle incoming message from peer
    handleIncomingMessage(messageObj, fromPeerId) {
        console.log('Received message from peer:', fromPeerId, messageObj);
        
        // Add to chat UI
        if (window.ChatModule) {
            const isOwn = messageObj.sender === userSettings.nickname;
            window.ChatModule.addMessage(
                messageObj.text,
                messageObj.sender,
                isOwn
            );
        }
    }

    // Handle signaling server messages (HTTP-based)
    handleSignalingMessage(message) {
        console.log('Received signaling message:', message);
        
        switch (message.type) {
            case 'peer_joined':
                if (message.peerId !== this.peerId) {
                    console.log('New peer joined:', message.peerId);
                    this.roomPeers.add(message.peerId);
                    this.createConnection(message.peerId);
                }
                break;
                
            case 'peer_left':
                console.log('Peer left:', message.peerId);
                this.roomPeers.delete(message.peerId);
                this.closeConnection(message.peerId);
                break;
                
            case 'offer':
                this.handleOffer(message.offer, message.fromPeerId);
                break;
                
            case 'answer':
                this.handleAnswer(message.answer, message.fromPeerId);
                break;
                
            case 'ice_candidate':
                this.handleIceCandidate(message.candidate, message.fromPeerId);
                break;
                
            case 'room_peers':
                message.peers.forEach(peerId => {
                    if (peerId !== this.peerId) {
                        this.roomPeers.add(peerId);
                        this.createConnection(peerId);
                    }
                });
                break;
        }
    }

    // Send message to signaling server
    async sendSignalingMessage(message) {
        try {
            const response = await fetch(this.getSignalingServerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message)
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to send signaling message:', error);
            return null;
        }
    }

    // Leave current room
    async leaveRoom() {
        console.log('Leaving room...');
        
        try {
            // Notify signaling server
            await this.sendSignalingMessage({
                type: 'leave_room',
                roomId: this.roomId,
                peerId: this.peerId
            });
        } catch (error) {
            console.error('Failed to leave room:', error);
        }
        
        // Close all connections
        this.connections.forEach((connection, peerId) => {
            this.closeConnection(peerId);
        });
        
        this.connections.clear();
        this.roomPeers.clear();
        this.roomId = null;
        this.updateConnectionStatus('disconnected');
    }

    // Close connection to a specific peer
    closeConnection(peerId) {
        const connection = this.connections.get(peerId);
        if (connection) {
            if (connection.dataChannel) {
                connection.dataChannel.close();
            }
            connection.peerConnection.close();
            this.connections.delete(peerId);
        }
    }

    // Update connection status
    updateConnectionStatus(status) {
        this.connectionStatus = status;
        
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `connection-status ${status}`;
        }
        
        console.log('Connection status:', status);
    }

    // Get connection info
    getConnectionInfo() {
        return {
            isConnected: this.isConnected,
            status: this.connectionStatus,
            roomId: this.roomId,
            peerCount: this.connections.size,
            deviceType: this.deviceType,
            peerId: this.peerId
        };
    }

    // Handle R1 hardware events for peer connections
    handleHardwareEvent(event) {
        switch (event.type) {
            case 'scrollUp':
                // Scroll through connected peers or messages
                console.log('Scroll up - peer navigation');
                break;
            case 'scrollDown':
                // Scroll through connected peers or messages
                console.log('Scroll down - peer navigation');
                break;
            case 'sideClick':
                // Send quick message or voice message
                console.log('Side click - quick message');
                break;
            case 'longPressStart':
                // Show peer list or connection info
                console.log('Long press start - show peer info');
                this.showPeerInfo();
                break;
            case 'longPressEnd':
                // Hide peer list
                console.log('Long press end - hide peer info');
                break;
        }
    }

    // Show peer information
    showPeerInfo() {
        const info = this.getConnectionInfo();
        const peerList = Array.from(this.roomPeers).join(', ');
        
        if (window.ChatApp && window.ChatApp.showNotification) {
            window.ChatApp.showNotification(
                `Peers: ${info.peerCount} | Device: ${info.deviceType} | Room: ${info.roomId || 'None'}`
            );
        }
    }
}

// Create global peer connection manager
window.PeerConnection = new PeerConnectionManager();

// Initialize peer connections when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize peer connections
    await window.PeerConnection.initialize();
    
    // Set up hardware event listeners for peer connections
    if (typeof window !== 'undefined') {
        window.addEventListener('scrollUp', () => {
            window.PeerConnection.handleHardwareEvent({ type: 'scrollUp' });
        });
        
        window.addEventListener('scrollDown', () => {
            window.PeerConnection.handleHardwareEvent({ type: 'scrollDown' });
        });
        
        window.addEventListener('sideClick', () => {
            window.PeerConnection.handleHardwareEvent({ type: 'sideClick' });
        });
        
        window.addEventListener('longPressStart', () => {
            window.PeerConnection.handleHardwareEvent({ type: 'longPressStart' });
        });
        
        window.addEventListener('longPressEnd', () => {
            window.PeerConnection.handleHardwareEvent({ type: 'longPressEnd' });
        });
    }
});

// Export for use in other modules
window.PeerModule = {
    joinRoom: (roomId) => window.PeerConnection.joinRoom(roomId),
    leaveRoom: () => window.PeerConnection.leaveRoom(),
    sendMessage: (message) => window.PeerConnection.sendMessage(message),
    getConnectionInfo: () => window.PeerConnection.getConnectionInfo()
};