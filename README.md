# Family Spyfall

A real-time, family-friendly version of the popular Spyfall party game built with React, Node.js, and Socket.IO. Perfect for family game nights and remote gatherings!

## 🎮 Game Overview

Spyfall is a social deduction game where players try to figure out who among them is the spy. One player is secretly assigned the role of "spy" and doesn't know the location, while all other players know the location but must figure out who the spy is through clever questioning.

### How to Play

1. **Setup**: One person creates a game and shares the game code or QR code
2. **Join**: Players join using the game code or by scanning the QR code
3. **Start**: The host starts a round once everyone has joined (minimum 3 players)
4. **Play**: Players take turns asking questions about the location
5. **Accuse**: When someone suspects another player, the host can start an accusation
6. **Vote**: All players vote on whether the accused is the spy
7. **Win/Lose**: 
   - If the spy is caught, civilians win
   - If an innocent player is accused, the spy wins
   - If the spy figures out the location, the spy wins

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd family-spyfall
   pnpm install
   ```

2. **Start development servers:**
   ```bash
   pnpm dev
   ```
   This will start:
   - Server on `http://localhost:4000`
   - Web app on `http://localhost:5173`

3. **Open your browser:**
   Navigate to `http://localhost:5173` to start playing!

### Docker Deployment

1. **Using Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Web app: `http://localhost:5173`
   - Server API: `http://localhost:4000`

3. **Production deployment with SSL:**
   ```bash
   # Place SSL certificates in ./ssl/ directory
   docker-compose --profile production up --build
   ```

## 🛠️ Development

### Project Structure

```
family-spyfall/
├── apps/
│   ├── server/          # Node.js/Express server
│   │   ├── src/
│   │   │   ├── game/    # Game logic
│   │   │   ├── types/   # TypeScript types
│   │   │   └── utils/   # Utility functions
│   │   └── test/        # Server tests
│   └── web/             # React web application
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── pages/       # Page components
│       │   ├── hooks/       # Custom React hooks
│       │   └── utils/       # Utility functions
│       └── tests/e2e/       # End-to-end tests
├── docker-compose.yml   # Docker configuration
└── README.md
```

### Available Scripts

**Root level:**
- `pnpm dev` - Start both server and web app in development mode
- `pnpm build` - Build all applications
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all applications
- `pnpm e2e` - Run end-to-end tests

**Server (`apps/server`):**
- `pnpm dev` - Start server with hot reload
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm test` - Run unit and integration tests
- `pnpm test:int` - Run integration tests only
- `pnpm lint` - Lint server code

**Web (`apps/web`):**
- `pnpm dev` - Start Vite development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test:e2e` - Run Playwright E2E tests
- `pnpm lint` - Lint web code

## 🧪 Testing

### Running Tests

1. **Unit Tests (Server):**
   ```bash
   pnpm -C apps/server test
   ```

2. **Integration Tests (Server):**
   ```bash
   pnpm -C apps/server test:int
   ```

3. **End-to-End Tests (Web):**
   ```bash
   pnpm -C apps/web test:e2e
   ```

### Test Coverage

- **Unit Tests**: Game logic, validation, utilities
- **Property-Based Tests**: Using fast-check for robust testing
- **Integration Tests**: Socket.IO communication, API endpoints
- **E2E Tests**: Complete user workflows with Playwright

## 🎯 Features

### Core Game Features
- ✅ Real-time multiplayer gameplay
- ✅ QR code generation for easy joining
- ✅ Automatic role assignment (spy vs civilians)
- ✅ Turn-based questioning system
- ✅ Voting and accusation mechanics
- ✅ Game state persistence during sessions

### User Experience
- ✅ Responsive design (mobile-friendly)
- ✅ Accessibility features (ARIA labels, keyboard navigation)
- ✅ Touch-friendly interface
- ✅ Real-time updates via WebSocket
- ✅ Connection status indicators
- ✅ Host controls and admin features

### Technical Features
- ✅ TypeScript for type safety
- ✅ Comprehensive test suite
- ✅ Docker containerization
- ✅ Rate limiting and security
- ✅ Input sanitization
- ✅ Error handling and validation

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Server Configuration
SERVER_PORT=4000
NODE_ENV=development

# Web Application Configuration  
WEB_ORIGIN=http://localhost:5173

# Game Configuration
ROOM_TTL_MS=7200000  # 2 hours in milliseconds
```

### Adding New Locations

To add new locations to the game, edit the `SPYFALL_LOCATIONS` array in:
- `apps/server/src/types/index.ts`
- `apps/web/src/types/index.ts`

Example:
```typescript
{ name: 'Your New Location', category: 'Category Name' }
```

### Changing Room TTL

Modify the `ROOM_TTL_MS` environment variable to change how long games stay active:

```bash
ROOM_TTL_MS=3600000  # 1 hour
ROOM_TTL_MS=14400000 # 4 hours
```

### Changing Ports

**Server Port:**
```bash
SERVER_PORT=3000  # Change server port
```

**Web App Port:**
Edit `apps/web/vite.config.ts`:
```typescript
server: {
  port: 3001,  // Change web app port
}
```

## 🔒 Security Features

### Implemented Security Measures
- **Rate Limiting**: Prevents spam and abuse
- **Input Sanitization**: Protects against XSS attacks
- **CORS Configuration**: Controls cross-origin requests
- **Helmet.js**: Security headers
- **Validation**: Strict input validation
- **Non-root Docker**: Containers run as non-root users

### Security Best Practices
- Never echo secrets or sensitive data
- Sanitize all user input
- Use HTTPS in production
- Implement proper CORS policies
- Regular dependency updates

## 🚀 Deployment

### Production Deployment

1. **Environment Setup:**
   ```bash
   cp env.example .env
   # Edit .env with production values
   ```

2. **Build Applications:**
   ```bash
   pnpm build
   ```

3. **Docker Deployment:**
   ```bash
   docker-compose up --build -d
   ```

4. **SSL Setup (Optional):**
   ```bash
   # Place SSL certificates in ./ssl/
   # cert.pem and key.pem
   docker-compose --profile production up --build -d
   ```

### Scaling Considerations

For high-traffic deployments, consider:
- **Load Balancing**: Multiple server instances
- **Redis**: For shared game state across instances
- **Database**: Persistent game storage
- **CDN**: Static asset delivery
- **Monitoring**: Application performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Ensure accessibility compliance
- Update documentation as needed
- Follow the existing code style

## 📝 API Documentation

### REST Endpoints

**POST /api/games**
- Creates a new game
- Returns: `{ gameId: string }`

**GET /api/games/:gameId**
- Gets public game state
- Returns: Game state without secrets

**GET /health**
- Health check endpoint
- Returns: `{ status: "ok" }`

### Socket.IO Events

**Client to Server:**
- `join_game` - Join or rejoin a game
- `start_round` - Start a new round (host only)
- `advance_turn` - Move to next player (host only)
- `accuse_player` - Start accusation voting (host only)
- `vote` - Cast vote during accusation
- `cancel_accusation` - Cancel current accusation (host only)
- `end_round` - End current round (host only)

**Server to Client:**
- `game_update` - Game state changes
- `role_assignment` - Player role and location
- `error` - Error messages

## 🐛 Troubleshooting

### Common Issues

**Connection Issues:**
- Check if server is running on correct port
- Verify CORS settings in environment variables
- Check browser console for WebSocket errors

**Game Not Starting:**
- Ensure minimum 3 players have joined
- Check if all players are connected
- Verify host privileges

**QR Code Not Generating:**
- Check browser console for errors
- Ensure QR code library is properly imported
- Try refreshing the page

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG=spyfall:*
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the original Spyfall party game
- Built with modern web technologies
- Designed for accessibility and inclusivity
- Thanks to all contributors and testers!

---

**Happy Gaming! 🎉**

For questions or support, please open an issue on GitHub.
