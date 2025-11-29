#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  YourTube Mobile Setup Script${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Get local IP
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    # Windows (Git Bash)
    LOCAL_IP=$(ipconfig | grep "IPv4" | grep -v "127.0.0.1" | head -1 | awk '{print $NF}')
fi

echo -e "${YELLOW}📍 Detected IP Address: ${LOCAL_IP}${NC}\n"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Creating .env file...${NC}"
    cat > .env << EOF
# Backend Configuration
NEXT_PUBLIC_BACKEND_URL=http://${LOCAL_IP}:5000
NEXT_PUBLIC_SOCKET_URL=http://${LOCAL_IP}:5000
NEXT_PUBLIC_FRONTEND_URL=http://${LOCAL_IP}:3000

# Firebase Config (from your firebase.ts)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDTSeUl7yX_oYuMkTLQx8gaM2yeftJMDTU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourtube-2dbfb.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourtube-2dbfb
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourtube-2dbfb.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=544512454124
NEXT_PUBLIC_FIREBASE_APP_ID=1:544512454124:web:a79bf26e771039d2a2a4c9
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-7J7222ZSC7
EOF
    echo -e "${GREEN}✅ Created .env file${NC}\n"
else
    echo -e "${GREEN}✅ .env file already exists${NC}\n"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}🔥 Next Steps:${NC}\n"
echo -e "1. ${GREEN}Add ${LOCAL_IP} to Firebase Authorized Domains:${NC}"
echo -e "   → https://console.firebase.google.com/project/yourtube-2dbfb/authentication/settings"
echo -e "   → Add domain: ${LOCAL_IP}\n"

echo -e "2. ${GREEN}Allow firewall access:${NC}"
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo -e "   ${YELLOW}Windows (Run as Administrator):${NC}"
    echo -e "   netsh advfirewall firewall add rule name=\"Next.js Dev\" dir=in action=allow protocol=TCP localport=3000"
    echo -e "   netsh advfirewall firewall add rule name=\"Node Backend\" dir=in action=allow protocol=TCP localport=5000\n"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "   ${YELLOW}macOS:${NC}"
    echo -e "   System Preferences → Security & Privacy → Firewall → Firewall Options"
    echo -e "   Allow incoming connections for Node\n"
fi

echo -e "3. ${GREEN}Start backend server:${NC}"
echo -e "   cd ../server && npm start\n"

echo -e "4. ${GREEN}Start frontend (in new terminal):${NC}"
echo -e "   npm run dev\n"

echo -e "5. ${GREEN}Access on your phone:${NC}"
echo -e "   ${YELLOW}http://${LOCAL_IP}:3000${NC}\n"

echo -e "${GREEN}========================================${NC}\n"

# Generate QR Code (if qrencode is installed)
if command -v qrencode &> /dev/null; then
    echo -e "${YELLOW}📱 Scan this QR code on your phone:${NC}\n"
    qrencode -t ANSIUTF8 "http://${LOCAL_IP}:3000"
    echo ""
else
    echo -e "${YELLOW}💡 Tip: Install qrencode to generate QR code${NC}"
    echo -e "   npm install -g qrcode-terminal\n"
fi