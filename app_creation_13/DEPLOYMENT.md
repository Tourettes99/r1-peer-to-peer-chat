# R1 Chat - Deployment Guide

This guide explains how to deploy the R1 Chat application to Netlify for cross-platform peer-to-peer communication.

## Prerequisites

- Netlify account
- Git repository (GitHub, GitLab, or Bitbucket)
- Node.js 18+ (for local development)

## Deployment Steps

### 1. Prepare the Repository

1. Push your code to a Git repository
2. Ensure all files are committed:
   - `index.html`
   - `css/styles.css`
   - `js/` directory with all JavaScript files
   - `netlify/` directory with functions
   - `netlify.toml`
   - `package.json`

### 2. Deploy to Netlify

#### Option A: Deploy via Netlify Dashboard

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Connect your Git provider and select the repository
4. Configure build settings:
   - Build command: `echo 'No build step required'`
   - Publish directory: `.` (root)
   - Node version: 18
5. Click "Deploy site"

#### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from your project directory
netlify deploy --prod
```

### 3. Configure Environment Variables

In your Netlify dashboard:
1. Go to Site settings > Environment variables
2. Add any required environment variables (none needed for basic setup)

### 4. Test the Deployment

1. Open your deployed site URL
2. Test the application in different browsers:
   - Desktop Chrome
   - Mobile Chrome
   - R1 device (if available)

## Cross-Platform Testing

### Desktop Testing
1. Open the app in Chrome on your computer
2. Create a room and note the room ID
3. Open the same room in another browser tab
4. Send messages between tabs

### Mobile Testing
1. Open the app in Chrome on your mobile device
2. Join the same room as desktop
3. Test touch interactions and responsive design

### R1 Device Testing
1. Deploy the app as an R1 Creation
2. Test hardware controls (scroll wheel, PTT button)
3. Verify persistent storage functionality

## Features by Platform

### R1 Device
- ✅ Full R1 SDK integration
- ✅ Hardware controls (scroll wheel, PTT)
- ✅ Persistent storage via R1 API
- ✅ Optimized 240x282px UI
- ✅ WebRTC peer connections

### Desktop Browser
- ✅ Full WebRTC functionality
- ✅ Responsive design
- ✅ localStorage fallback
- ✅ Touch/mouse interactions

### Mobile Browser
- ✅ Full WebRTC functionality
- ✅ Touch-optimized UI
- ✅ Responsive design
- ✅ Mobile-specific features

## Troubleshooting

### Common Issues

1. **WebRTC connections fail**
   - Check if HTTPS is enabled
   - Verify STUN servers are accessible
   - Check browser console for errors

2. **Signaling server errors**
   - Verify Netlify Functions are deployed
   - Check function logs in Netlify dashboard
   - Ensure CORS headers are set correctly

3. **R1 device issues**
   - Verify R1 SDK is available
   - Check if running as R1 Creation
   - Test hardware event listeners

### Debug Mode

Enable debug logging by adding this to the browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## Performance Optimization

### For R1 Devices
- Minimize DOM operations
- Use CSS transforms for animations
- Limit concurrent connections
- Optimize for 240x282px screen

### For Web Browsers
- Implement connection pooling
- Add message queuing
- Use efficient data structures
- Optimize for mobile performance

## Security Considerations

- All communication is peer-to-peer (no central server stores messages)
- WebRTC connections are encrypted
- Signaling server only facilitates connection establishment
- No user data is stored on the server

## Monitoring

### Netlify Functions
- Monitor function invocations
- Check error rates
- Monitor response times

### Client-Side
- Track connection success rates
- Monitor message delivery
- Log performance metrics

## Scaling

For high-traffic scenarios:
1. Implement connection pooling
2. Add load balancing
3. Use Redis for signaling state
4. Implement rate limiting

## Support

For issues or questions:
1. Check the browser console for errors
2. Review Netlify function logs
3. Test with different browsers/devices
4. Verify network connectivity
