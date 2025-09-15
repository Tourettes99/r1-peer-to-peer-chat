#!/usr/bin/env python3
"""
Simple HTTP server for local development of R1 Chat
Serves the application on localhost:8000
"""

import http.server
import socketserver
import os
import json
from urllib.parse import urlparse, parse_qs

class MockSignalingHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/mock-signaling':
            # Mock signaling server response
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                print(f"Mock signaling request: {data['type']}")
                
                # Handle different request types
                if data['type'] == 'register':
                    response = {
                        "type": "registered",
                        "peerId": data.get('peerId', 'mock_peer'),
                        "success": True
                    }
                elif data['type'] == 'join_room':
                    response = {
                        "type": "room_joined",
                        "roomId": data.get('roomId', 'mock_room'),
                        "peers": [],  # No existing peers for simulation
                        "success": True
                    }
                else:
                    response = {
                        "type": "success",
                        "success": True
                    }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                print(f"Error handling mock signaling: {e}")
                self.send_response(500)
                self.end_headers()
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

def serve():
    PORT = 8000
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MockSignalingHandler) as httpd:
        print(f"R1 Chat development server running at http://localhost:{PORT}")
        print("Open http://localhost:8000/test.html for testing")
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()

if __name__ == "__main__":
    serve()
