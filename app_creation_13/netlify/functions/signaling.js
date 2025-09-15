// Netlify Function for cross-platform signaling server
// This provides real peer discovery and WebRTC signaling between devices

// Use global variables to persist data across function invocations
if (!global.rooms) {
    global.rooms = new Map(); // roomId -> Set of peerIds
}
if (!global.peers) {
    global.peers = new Map(); // peerId -> { deviceType, roomId, lastSeen, ip }
}
if (!global.pendingOffers) {
    global.pendingOffers = new Map(); // targetPeerId -> offer data
}
if (!global.pendingAnswers) {
    global.pendingAnswers = new Map(); // targetPeerId -> answer data
}
if (!global.iceCandidates) {
    global.iceCandidates = new Map(); // targetPeerId -> array of candidates
}

const rooms = global.rooms;
const peers = global.peers;
const pendingOffers = global.pendingOffers;
const pendingAnswers = global.pendingAnswers;
const iceCandidates = global.iceCandidates;

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { type, peerId, roomId, deviceType, targetPeerId, message } = body;

        console.log('Signaling request:', type, peerId);

        switch (type) {
            case 'register':
                return handleRegister(peerId, deviceType, headers, event);
                
            case 'join_room':
                return handleJoinRoom(peerId, roomId, deviceType, headers);
                
            case 'leave_room':
                return handleLeaveRoom(peerId, roomId, headers);
                
            case 'discover_peers':
                return handleDiscoverPeers(peerId, roomId, headers);
                
            case 'offer':
                return handleOffer(peerId, body, headers);
                
            case 'answer':
                return handleAnswer(peerId, body, headers);
                
            case 'ice_candidate':
                return handleIceCandidate(peerId, body, headers);
                
            case 'get_room_info':
                return handleGetRoomInfo(roomId, headers);
                
            case 'heartbeat':
                return handleHeartbeat(peerId, headers);
                
            case 'get_notifications':
                return handleGetNotifications(peerId, headers);
                
            case 'get_pending_signaling':
                return handleGetPendingSignaling(peerId, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Unknown message type' })
                };
        }
    } catch (error) {
        console.error('Signaling error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

function handleRegister(peerId, deviceType, headers, event) {
    const clientIP = event.headers['x-forwarded-for'] || 
                    event.headers['x-real-ip'] || 
                    event.requestContext?.identity?.sourceIp || 
                    'unknown';
    
    peers.set(peerId, {
        deviceType,
        roomId: null,
        lastSeen: Date.now(),
        ip: clientIP
    });
    
    console.log(`Peer registered: ${peerId} (${deviceType}) from ${clientIP}`);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'registered',
            peerId: peerId,
            success: true
        })
    };
}

function handleJoinRoom(peerId, roomId, deviceType, headers) {
    // Update peer info
    if (peers.has(peerId)) {
        peers.get(peerId).roomId = roomId;
        peers.get(peerId).lastSeen = Date.now();
    }
    
    // Add to room
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    
    const roomPeers = rooms.get(roomId);
    roomPeers.add(peerId);
    
    console.log(`Peer ${peerId} joined room ${roomId}`);
    
    // Get other peers in room
    const otherPeers = Array.from(roomPeers).filter(id => id !== peerId);
    
    // Notify existing peers about the new peer joining
    // In a real implementation, you'd use WebSockets or Server-Sent Events
    // For now, we'll store this info and peers can poll for updates
    if (otherPeers.length > 0) {
        console.log(`Notifying ${otherPeers.length} existing peers about new peer ${peerId}`);
        // Store peer join notification for other peers to discover
        otherPeers.forEach(existingPeerId => {
            if (!global.pendingNotifications) {
                global.pendingNotifications = new Map();
            }
            if (!global.pendingNotifications.has(existingPeerId)) {
                global.pendingNotifications.set(existingPeerId, []);
            }
            global.pendingNotifications.get(existingPeerId).push({
                type: 'peer_joined',
                peerId: peerId,
                deviceType: deviceType,
                roomId: roomId,
                timestamp: Date.now()
            });
        });
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'room_joined',
            roomId: roomId,
            peers: otherPeers,
            success: true
        })
    };
}

function handleLeaveRoom(peerId, roomId, headers) {
    if (rooms.has(roomId)) {
        rooms.get(roomId).delete(peerId);
        
        // Clean up empty rooms
        if (rooms.get(roomId).size === 0) {
            rooms.delete(roomId);
        }
    }
    
    // Update peer info
    if (peers.has(peerId)) {
        peers.get(peerId).roomId = null;
        peers.get(peerId).lastSeen = Date.now();
    }
    
    console.log(`Peer ${peerId} left room ${roomId}`);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'room_left',
            roomId: roomId,
            success: true
        })
    };
}

function handleDiscoverPeers(peerId, roomId, headers) {
    let roomPeers = [];
    
    if (rooms.has(roomId)) {
        roomPeers = Array.from(rooms.get(roomId)).filter(id => id !== peerId);
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'room_peers',
            peers: roomPeers,
            roomId: roomId
        })
    };
}

function handleSendMessage(peerId, roomId, message, headers) {
    if (!rooms.has(roomId)) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Room not found' })
        };
    }
    
    const roomPeers = Array.from(rooms.get(roomId));
    
    // In a real implementation, you would store the message and notify other peers
    // For now, we'll just return success
    console.log(`Message from ${peerId} in room ${roomId}:`, message);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'message_sent',
            success: true
        })
    };
}

function handleGetRoomInfo(roomId, headers) {
    if (!rooms.has(roomId)) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Room not found' })
        };
    }
    
    const roomPeers = Array.from(rooms.get(roomId));
    const peerInfo = roomPeers.map(peerId => {
        const peer = peers.get(peerId);
        return {
            peerId,
            deviceType: peer ? peer.deviceType : 'unknown',
            lastSeen: peer ? peer.lastSeen : null
        };
    });
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'room_info',
            roomId: roomId,
            peerCount: roomPeers.length,
            peers: peerInfo
        })
    };
}

function handleHeartbeat(peerId, headers) {
    if (peers.has(peerId)) {
        peers.get(peerId).lastSeen = Date.now();
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'heartbeat_ack',
            success: true
        })
    };
}

// WebRTC signaling functions
function handleOffer(peerId, body, headers) {
    const { targetPeerId, offer, roomId } = body;
    
    if (!peers.has(targetPeerId)) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Target peer not found' })
        };
    }
    
    // Store offer for target peer
    pendingOffers.set(targetPeerId, {
        from: peerId,
        offer: offer,
        roomId: roomId,
        timestamp: Date.now()
    });
    
    console.log(`Offer from ${peerId} to ${targetPeerId} in room ${roomId}`);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'offer_stored',
            success: true
        })
    };
}

function handleAnswer(peerId, body, headers) {
    const { targetPeerId, answer, roomId } = body;
    
    if (!peers.has(targetPeerId)) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Target peer not found' })
        };
    }
    
    // Store answer for target peer
    pendingAnswers.set(targetPeerId, {
        from: peerId,
        answer: answer,
        roomId: roomId,
        timestamp: Date.now()
    });
    
    console.log(`Answer from ${peerId} to ${targetPeerId} in room ${roomId}`);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'answer_stored',
            success: true
        })
    };
}

function handleIceCandidate(peerId, body, headers) {
    const { targetPeerId, candidate, roomId } = body;
    
    if (!peers.has(targetPeerId)) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Target peer not found' })
        };
    }
    
    // Store ICE candidate for target peer
    if (!iceCandidates.has(targetPeerId)) {
        iceCandidates.set(targetPeerId, []);
    }
    
    iceCandidates.get(targetPeerId).push({
        from: peerId,
        candidate: candidate,
        roomId: roomId,
        timestamp: Date.now()
    });
    
    console.log(`ICE candidate from ${peerId} to ${targetPeerId} in room ${roomId}`);
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'ice_candidate_stored',
            success: true
        })
    };
}

// Cleanup function to remove stale peers
function cleanupStalePeers() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [peerId, peer] of peers) {
        if (now - peer.lastSeen > staleThreshold) {
            if (peer.roomId && rooms.has(peer.roomId)) {
                rooms.get(peer.roomId).delete(peerId);
            }
            peers.delete(peerId);
            pendingOffers.delete(peerId);
            pendingAnswers.delete(peerId);
            iceCandidates.delete(peerId);
            console.log(`Removed stale peer: ${peerId}`);
        }
    }
}

// Handle getting notifications for a peer
function handleGetNotifications(peerId, headers) {
    if (!global.pendingNotifications || !global.pendingNotifications.has(peerId)) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                type: 'notifications',
                notifications: []
            })
        };
    }
    
    const notifications = global.pendingNotifications.get(peerId) || [];
    global.pendingNotifications.delete(peerId); // Clear after sending
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'notifications',
            notifications: notifications
        })
    };
}

// Handle getting pending signaling messages for a peer
function handleGetPendingSignaling(peerId, headers) {
    const signalingMessages = [];
    
    // Check for pending offers
    if (pendingOffers.has(peerId)) {
        const offer = pendingOffers.get(peerId);
        signalingMessages.push({
            type: 'offer',
            fromPeerId: offer.from,
            offer: offer.offer,
            roomId: offer.roomId,
            timestamp: offer.timestamp
        });
        pendingOffers.delete(peerId);
    }
    
    // Check for pending answers
    if (pendingAnswers.has(peerId)) {
        const answer = pendingAnswers.get(peerId);
        signalingMessages.push({
            type: 'answer',
            fromPeerId: answer.from,
            answer: answer.answer,
            roomId: answer.roomId,
            timestamp: answer.timestamp
        });
        pendingAnswers.delete(peerId);
    }
    
    // Check for pending ICE candidates
    if (iceCandidates.has(peerId)) {
        const candidates = iceCandidates.get(peerId);
        candidates.forEach(candidate => {
            signalingMessages.push({
                type: 'ice_candidate',
                fromPeerId: candidate.from,
                candidate: candidate.candidate,
                roomId: candidate.roomId,
                timestamp: candidate.timestamp
            });
        });
        iceCandidates.delete(peerId);
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            type: 'pending_signaling',
            messages: signalingMessages
        })
    };
}

// Run cleanup every 5 minutes
setInterval(cleanupStalePeers, 5 * 60 * 1000);
