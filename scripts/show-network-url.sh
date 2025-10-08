#!/bin/bash

echo "🌐 Family Spyfall Network Access"
echo "================================"
echo ""

# Get the local IP address (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Try en0 first (usually WiFi), then en1 (usually Ethernet)
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$IP" ]; then
    echo "❌ Could not determine local IP address"
    echo "Please check your network connection"
    exit 1
fi

echo "📱 Access from your phone:"
echo ""
echo "   http://$IP:5173"
echo ""
echo "🖥️  Backend server:"
echo "   http://$IP:4000"
echo ""
echo "✅ Make sure your phone is on the same WiFi network!"
echo ""
echo "🔍 To test backend connectivity:"
echo "   curl http://$IP:4000/health"
echo ""

