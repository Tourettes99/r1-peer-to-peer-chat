# R1 Chat - Local Development Guide

This guide explains how to run and test the R1 Chat application locally for development and testing.

## Quick Start

### Option 1: Using the Batch File (Windows)
1. Double-click `start-dev.bat`
2. Open your browser to `http://localhost:8000/test.html`
3. Start testing!

### Option 2: Using Python Server
1. Open a terminal in the project directory
2. Run: `python serve.py`
3. Open your browser to `http://localhost:8000/test.html`

### Option 3: Using Any HTTP Server
1. Start any HTTP server in the project directory
2. Open `test.html` in your browser
3. The app will automatically detect local mode

## Features Available in Local Mode

### ✅ Working Features
- **UI Navigation**: All menu and page navigation
- **Room Management**: Create and join chat rooms
- **Settings**: Nickname and color customization
- **Storage**: localStorage-based persistent storage
- **Device Detection**: Automatic device type detection
- **Simulated Peers**: Mock peer connections for testing

### 🔄 Simulated Features
- **Peer Connections**: Simulated WebRTC connections
- **Message Exchange**: Simulated real-time messaging
- **Room Discovery**: Simulated peer discovery
- **Cross-Platform**: Simulated multi-device communication

## Testing Scenarios

### 1. Basic Functionality Test
1. Open `http://localhost:8000/test.html`
2. Set your nickname in Settings
3. Create a new chat room
4. Send messages (they'll be logged to console)
5. Check that settings are saved

### 2. Multi-Tab Testing
1. Open the app in multiple browser tabs
2. Create the same room in each tab
3. Send messages from different tabs
4. Verify messages appear in all tabs

### 3. Device Type Testing
1. Open the app in different browsers
2. Check the device type detection
3. Test responsive design on different screen sizes

### 4. Storage Testing
1. Change settings and refresh the page
2. Verify settings persist
3. Test data export/import functionality

## Debug Information

### Console Logs
The app provides detailed console logging:
- Device type detection
- Peer connection attempts
- Storage operations
- Simulated peer messages

### Test Functions
In the Settings page, you can use:
- **Test Storage**: Check storage functionality
- **Test Peer Connection**: View connection info
- **Export Data**: Download your data as JSON

## Troubleshooting

### Common Issues

1. **"Failed to load resource: 404"**
   - This is expected in local mode
   - The app will automatically fall back to simulation mode

2. **Simulated peers not appearing**
   - Wait a few seconds after joining a room
   - Check the console for simulation messages

3. **Settings not saving**
   - Check if localStorage is enabled in your browser
   - Try clearing browser data and testing again

4. **Python server not starting**
   - Make sure Python is installed
   - Try using a different port if 8000 is busy

### Debug Mode
Enable additional logging by opening the browser console and running:
```javascript
localStorage.setItem('debug', 'true');
```

## Development Workflow

### 1. Make Changes
- Edit HTML, CSS, or JavaScript files
- Changes are reflected immediately (no build step)

### 2. Test Changes
- Refresh the browser
- Test the specific functionality you changed
- Check console for any errors

### 3. Test Cross-Platform
- Test in different browsers
- Test on mobile devices
- Test responsive design

### 4. Deploy to Netlify
- When ready, deploy to Netlify for real WebRTC testing
- See `DEPLOYMENT.md` for deployment instructions

## File Structure for Local Development

```
app_creation_13/
├── test.html              # Main test page
├── serve.py               # Python development server
├── start-dev.bat          # Windows batch file
├── mock-signaling.html    # Mock signaling server
├── index.html             # Production version
├── css/styles.css         # Styling
├── js/                    # JavaScript modules
└── netlify/               # Netlify deployment files
```

## Next Steps

1. **Local Testing**: Use this setup for development and testing
2. **Netlify Deployment**: Deploy for real WebRTC testing
3. **R1 Integration**: Test on actual R1 device
4. **Production**: Deploy to production environment

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all files are in the correct locations
3. Test with a fresh browser session
4. Check the troubleshooting section above
