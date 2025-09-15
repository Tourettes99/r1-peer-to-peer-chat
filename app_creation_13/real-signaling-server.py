#!/usr/bin/env python3
"""
Real signaling server for cross-platform R1 Chat
Handles actual peer discovery and WebRTC signaling between devices
"""

import http.server
import socketserver
import json
import threading
import time
from urllib.parse import urlparse, parse_qs
from collections import defaultdict

class RealSignalingHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Global state for peer management
        if not hasattr(RealSignalingHandler, 'rooms'):
            RealSignalingHandler.rooms = defaultdict(set)  # roomId -> set of peerIds
        if not hasattr(RealSignalingHandler, 'peers'):
            RealSignalingHandler.peers = {}  # peerId -> peer info
        if not hasattr(RealSignalingHandler, 'pending_offers'):
            RealSignalingHandler.pending_offers = {}  # peerId -> offer data
        if not hasattr(RealSignalingHandler, 'pending_answers'):
            RealSignalingHandler.pending_answers = {}  # peerId -> answer data
        if not hasattr(RealSignalingHandler, 'ice_candidates'):
            RealSignalingHandler.ice_candidates = defaultdict(list)  # peerId -> list of candidates
        
        super().__init__(*args, **kwargs)

    def do_POST(self):
        if self.path == '/real-signaling':
            self.handle_signaling_request()
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def handle_signaling_request(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            print(f"Real signaling request: {data['type']} from {data.get('peerId', 'unknown')}")
            
            response = self.process_request(data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            print(f"Error handling signaling request: {e}")
            self.send_response(500)
            self.end_headers()

    def process_request(self, data):
        request_type = data['type']
        peer_id = data.get('peerId')
        room_id = data.get('roomId')
        
        if request_type == 'register':
            return self.handle_register(peer_id, data)
        elif request_type == 'join_room':
            return self.handle_join_room(peer_id, room_id, data)
        elif request_type == 'leave_room':
            return self.handle_leave_room(peer_id, room_id)
        elif request_type == 'discover_peers':
            return self.handle_discover_peers(room_id, peer_id)
        elif request_type == 'offer':
            return self.handle_offer(peer_id, data)
        elif request_type == 'answer':
            return self.handle_answer(peer_id, data)
        elif request_type == 'ice_candidate':
            return self.handle_ice_candidate(peer_id, data)
        elif request_type == 'get_room_info':
            return self.handle_get_room_info(room_id)
        else:
            return {"error": "Unknown request type"}

    def handle_register(self, peer_id, data):
        self.peers[peer_id] = {
            'deviceType': data.get('deviceType', 'unknown'),
            'roomId': None,
            'lastSeen': time.time(),
            'ip': self.client_address[0]
        }
        print(f"Peer registered: {peer_id} ({data.get('deviceType', 'unknown')})")
        return {"type": "registered", "peerId": peer_id, "success": True}

    def handle_join_room(self, peer_id, room_id, data):
        # Update peer info
        if peer_id in self.peers:
            self.peers[peer_id]['roomId'] = room_id
            self.peers[peer_id]['lastSeen'] = time.time()
        
        # Add to room
        self.rooms[room_id].add(peer_id)
        
        # Get other peers in room
        other_peers = [p for p in self.rooms[room_id] if p != peer_id]
        
        print(f"Peer {peer_id} joined room {room_id} (peers: {other_peers})")
        
        return {
            "type": "room_joined",
            "roomId": room_id,
            "peers": other_peers,
            "success": True
        }

    def handle_leave_room(self, peer_id, room_id):
        if room_id in self.rooms:
            self.rooms[room_id].discard(peer_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        
        if peer_id in self.peers:
            self.peers[peer_id]['roomId'] = None
        
        print(f"Peer {peer_id} left room {room_id}")
        return {"type": "room_left", "success": True}

    def handle_discover_peers(self, room_id, peer_id):
        if room_id in self.rooms:
            other_peers = [p for p in self.rooms[room_id] if p != peer_id]
            return {"type": "room_peers", "peers": other_peers, "roomId": room_id}
        return {"type": "room_peers", "peers": [], "roomId": room_id}

    def handle_offer(self, peer_id, data):
        target_peer = data.get('targetPeerId')
        offer = data.get('offer')
        
        if target_peer in self.peers:
            # Store offer for target peer
            self.pending_offers[target_peer] = {
                'from': peer_id,
                'offer': offer,
                'timestamp': time.time()
            }
            print(f"Offer from {peer_id} to {target_peer}")
            return {"type": "offer_relayed", "success": True}
        
        return {"type": "error", "message": "Target peer not found"}

    def handle_answer(self, peer_id, data):
        target_peer = data.get('targetPeerId')
        answer = data.get('answer')
        
        if target_peer in self.peers:
            # Store answer for target peer
            self.pending_answers[target_peer] = {
                'from': peer_id,
                'answer': answer,
                'timestamp': time.time()
            }
            print(f"Answer from {peer_id} to {target_peer}")
            return {"type": "answer_relayed", "success": True}
        
        return {"type": "error", "message": "Target peer not found"}

    def handle_ice_candidate(self, peer_id, data):
        target_peer = data.get('targetPeerId')
        candidate = data.get('candidate')
        
        if target_peer in self.peers:
            self.ice_candidates[target_peer].append({
                'from': peer_id,
                'candidate': candidate,
                'timestamp': time.time()
            })
            print(f"ICE candidate from {peer_id} to {target_peer}")
            return {"type": "ice_candidate_relayed", "success": True}
        
        return {"type": "error", "message": "Target peer not found"}

    def handle_get_room_info(self, room_id):
        if room_id in self.rooms:
            peer_info = []
            for peer_id in self.rooms[room_id]:
                if peer_id in self.peers:
                    peer_info.append({
                        'peerId': peer_id,
                        'deviceType': self.peers[peer_id]['deviceType'],
                        'lastSeen': self.peers[peer_id]['lastSeen']
                    })
            
            return {
                "type": "room_info",
                "roomId": room_id,
                "peerCount": len(peer_info),
                "peers": peer_info
            }
        
        return {"type": "error", "message": "Room not found"}

    def log_message(self, format, *args):
        # Suppress default logging
        pass

def cleanup_stale_peers():
    """Clean up stale peers every 5 minutes"""
    while True:
        time.sleep(300)  # 5 minutes
        current_time = time.time()
        stale_threshold = 300  # 5 minutes
        
        # Clean up stale peers
        stale_peers = []
        for peer_id, peer_info in RealSignalingHandler.peers.items():
            if current_time - peer_info['lastSeen'] > stale_threshold:
                stale_peers.append(peer_id)
        
        for peer_id in stale_peers:
            # Remove from all rooms
            for room_id in list(RealSignalingHandler.rooms.keys()):
                RealSignalingHandler.rooms[room_id].discard(peer_id)
                if not RealSignalingHandler.rooms[room_id]:
                    del RealSignalingHandler.rooms[room_id]
            
            # Remove peer info
            del RealSignalingHandler.peers[peer_id]
            print(f"Cleaned up stale peer: {peer_id}")

def start_server():
    PORT = 8001  # Different port to avoid conflicts
    
    # Start cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_stale_peers, daemon=True)
    cleanup_thread.start()
    
    with socketserver.TCPServer(("", PORT), RealSignalingHandler) as httpd:
        print(f"Real signaling server running at http://localhost:{PORT}")
        print("This server handles actual peer discovery between devices")
        print("Use this for real cross-platform communication")
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()

if __name__ == "__main__":
    start_server()
