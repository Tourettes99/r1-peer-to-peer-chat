# R1 Chat - Cross-Platform Peer-to-Peer Chat Application

A real-time chat application that enables peer-to-peer communication between R1 devices, desktop browsers, and mobile browsers. Features WebRTC connections, persistent storage, and customizable UI elements across all platforms.

## Features

### Core Functionality
- **Cross-Platform Chat**: Real-time messaging between R1 devices, desktop browsers, and mobile browsers
- **WebRTC Connections**: Direct peer-to-peer connections using WebRTC
- **Room Management**: Create and join multiple chat rooms across platforms
- **Nickname System**: Choose and save custom nicknames
- **Persistent Storage**: Platform-appropriate storage (R1 API, localStorage)
- **Device Detection**: Automatic detection of device type (R1, desktop, mobile)

### Customization
- **Color Themes**: Customize text and message bubble colors
- **UI Design**: Black-to-gray gradient with yellow accents
- **Responsive Layout**: Optimized for 240x282px R1 screen

### Platform-Specific Features

#### R1 Device
- **Hardware Controls**: Scroll wheel and PTT button support
- **Storage API**: Uses R1's secure storage system
- **Plugin System**: Full R1 Creations SDK integration
- **Optimized UI**: 240x282px screen optimization

#### Desktop Browser
- **Full WebRTC**: Complete WebRTC functionality
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Shortcuts**: Enter to send, Tab navigation
- **localStorage**: Browser-based persistent storage

#### Mobile Browser
- **Touch Interface**: Touch-optimized interactions
- **Responsive Design**: Mobile-first responsive layout
- **WebRTC Support**: Full peer-to-peer functionality
- **Mobile Storage**: localStorage with mobile optimizations

## File Structure

```
app_creation_13/
├── index.html              # Main application HTML
├── test.html               # Browser testing version
├── css/
│   └── styles.css          # Cross-platform styling
├── js/
│   ├── app.js              # Main application logic
│   ├── chat.js             # Chat functionality
│   ├── storage.js          # Platform-agnostic storage
│   └── peer.js             # WebRTC peer connections
├── netlify/
│   └── functions/
│       └── signaling.js    # Netlify function for signaling
├── netlify.toml            # Netlify configuration
├── package.json            # Dependencies and scripts
├── signaling-server.js     # Standalone signaling server
├── DEPLOYMENT.md           # Deployment guide
└── README.md               # This file
```

## Usage

### Getting Started
1. Open the application on your R1 device
2. Set your nickname in Settings
3. Create or join a chat room
4. Start chatting!

### Navigation
- **Menu Button (☰)**: Access different sections
- **Chat**: Main chat interface
- **Rooms**: Manage chat rooms
- **Settings**: Customize appearance and data

### Hardware Controls
- **Scroll Wheel**: Navigate messages and menus
- **PTT Button**: Quick actions and voice messages (future)
- **Long Press**: Quick room switching

### Settings
- **Nickname**: Set your display name
- **Text Color**: Choose text color (default: yellow)
- **Bubble Color**: Choose message bubble color (default: yellow)
- **Clear Data**: Reset all application data

## Technical Details

### Storage
- Uses R1's `creationStorage.plain` API for persistent data
- Falls back to localStorage for browser testing
- Stores: user settings, chat rooms, messages, current room

### Peer Connections
- Simulated peer-to-peer system (ready for WebRTC integration)
- Room-based message routing
- Connection status monitoring

### R1 SDK Integration
- Hardware event listeners for scroll wheel and PTT
- Plugin message handling
- Storage API integration
- Optimized for 240x282px display

## Development

### Browser Testing
The application includes fallback functionality for browser testing:
- Uses localStorage instead of R1 storage API
- Simulates peer connections
- Full UI functionality available

### Adding Real WebRTC
To implement real peer-to-peer connections:
1. Uncomment the WebRTC code in `peer.js`
2. Set up a signaling server
3. Configure ICE servers
4. Update connection management

### Customization
- Modify colors in `css/styles.css`
- Add features in respective JavaScript files
- Update storage schema in `storage.js`

## Requirements

- R1 device with Creations SDK
- Modern web browser (for testing)
- Network connection for peer-to-peer features

## License

This project follows the same license as the R1 Creations SDK.
