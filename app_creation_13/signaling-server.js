// Simple WebSocket signaling server for R1 Chat
// This can be deployed to Netlify Functions or run as a separate service

const WebSocket = require('ws');

class SignalingServer {
    constructor(port = 8080) {
        this.port = port;
        this.wss = null;
        this.rooms = new Map(); // roomId -> Set of peerIds
        this.peers = new Map(); // peerId -> { ws, deviceType, roomId }
    }

    start() {
        this.wss = new WebSocket.Server({ port: this.port });
        
        this.wss.on('connection', (ws, req) => {
            console.log('New WebSocket connection');
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });
            
            ws.on('close', () => {
                this.handleDisconnect(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
        
        console.log(`Signaling server running on port ${this.port}`);
    }

    handleMessage(ws, message) {
        console.log('Received message:', message.type);
        
        switch (message.type) {
            case 'register':
                this.registerPeer(ws, message);
                break;
                
            case 'join_room':
                this.joinRoom(ws, message);
                break;
                
            case 'leave_room':
                this.leaveRoom(ws, message);
                break;
                
            case 'discover_peers':
                this.discoverPeers(ws, message);
                break;
                
            case 'offer':
            case 'answer':
            case 'ice_candidate':
                this.relayMessage(ws, message);
                break;
                
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    registerPeer(ws, message) {
        const { peerId, deviceType } = message;
        
        this.peers.set(peerId, {
            ws,
            deviceType,
            roomId: null
        });
        
        console.log(`Peer registered: ${peerId} (${deviceType})`);
        
        // Send confirmation
        this.sendToPeer(peerId, {
            type: 'registered',
            peerId: peerId
        });
    }

    joinRoom(ws, message) {
        const { roomId, peerId, deviceType } = message;
        
        // Update peer info
        if (this.peers.has(peerId)) {
            this.peers.get(peerId).roomId = roomId;
        }
        
        // Add to room
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        
        this.rooms.get(roomId).add(peerId);
        
        console.log(`Peer ${peerId} joined room ${roomId}`);
        
        // Notify other peers in the room
        this.rooms.get(roomId).forEach(roomPeerId => {
            if (roomPeerId !== peerId) {
                this.sendToPeer(roomPeerId, {
                    type: 'peer_joined',
                    peerId: peerId,
                    deviceType: deviceType,
                    roomId: roomId
                });
            }
        });
        
        // Send room peers to the joining peer
        const roomPeers = Array.from(this.rooms.get(roomId)).filter(id => id !== peerId);
        this.sendToPeer(peerId, {
            type: 'room_peers',
            peers: roomPeers,
            roomId: roomId
        });
    }

    leaveRoom(ws, message) {
        const { roomId, peerId } = message;
        
        if (this.rooms.has(roomId)) {
            this.rooms.get(roomId).delete(peerId);
            
            // Notify other peers
            this.rooms.get(roomId).forEach(roomPeerId => {
                this.sendToPeer(roomPeerId, {
                    type: 'peer_left',
                    peerId: peerId,
                    roomId: roomId
                });
            });
            
            // Clean up empty rooms
            if (this.rooms.get(roomId).size === 0) {
                this.rooms.delete(roomId);
            }
        }
        
        // Update peer info
        if (this.peers.has(peerId)) {
            this.peers.get(peerId).roomId = null;
        }
        
        console.log(`Peer ${peerId} left room ${roomId}`);
    }

    discoverPeers(ws, message) {
        const { roomId, peerId } = message;
        
        if (this.rooms.has(roomId)) {
            const roomPeers = Array.from(this.rooms.get(roomId)).filter(id => id !== peerId);
            this.sendToPeer(peerId, {
                type: 'room_peers',
                peers: roomPeers,
                roomId: roomId
            });
        }
    }

    relayMessage(ws, message) {
        const { targetPeerId } = message;
        
        if (this.peers.has(targetPeerId)) {
            const targetPeer = this.peers.get(targetPeerId);
            if (targetPeer.ws.readyState === WebSocket.OPEN) {
                // Add sender info
                const relayMessage = {
                    ...message,
                    fromPeerId: this.getPeerIdByWs(ws)
                };
                
                targetPeer.ws.send(JSON.stringify(relayMessage));
            }
        }
    }

    handleDisconnect(ws) {
        const peerId = this.getPeerIdByWs(ws);
        
        if (peerId) {
            const peer = this.peers.get(peerId);
            if (peer && peer.roomId) {
                this.leaveRoom(ws, { roomId: peer.roomId, peerId: peerId });
            }
            
            this.peers.delete(peerId);
            console.log(`Peer disconnected: ${peerId}`);
        }
    }

    getPeerIdByWs(ws) {
        for (const [peerId, peer] of this.peers) {
            if (peer.ws === ws) {
                return peerId;
            }
        }
        return null;
    }

    sendToPeer(peerId, message) {
        if (this.peers.has(peerId)) {
            const peer = this.peers.get(peerId);
            if (peer.ws.readyState === WebSocket.OPEN) {
                peer.ws.send(JSON.stringify(message));
            }
        }
    }

    getStats() {
        return {
            totalPeers: this.peers.size,
            totalRooms: this.rooms.size,
            rooms: Array.from(this.rooms.entries()).map(([roomId, peers]) => ({
                roomId,
                peerCount: peers.size,
                peers: Array.from(peers)
            }))
        };
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new SignalingServer(process.env.PORT || 8080);
    server.start();
}

module.exports = SignalingServer;
