# Server Monitor

A modern, real-time server monitoring dashboard with backend API support. Monitor CPU, memory, disk, network, and GPU usage across multiple servers through a clean web interface.

## 🚀 Features

- **Real-time Monitoring**: Live updates every 3 seconds
- **Multi-server Support**: Monitor multiple servers from one dashboard
- **Comprehensive Metrics**: CPU, Memory, Disk, Network, and GPU monitoring
- **Secure Backend**: All agent requests proxied through backend API
- **Persistent Storage**: SQLite database for server configurations
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Support**: Easy deployment with Docker and Docker Compose

## 📊 Monitoring Capabilities

- **CPU Usage**: Real-time percentage and load averages (1/5/15 min)
- **Memory**: Usage percentage, used/total in GB
- **Disk**: Usage percentage, used/total in GB
- **Network**: Upload/download speeds in Mbps
- **GPU**: Temperature, load, and memory usage (if available)
- **Uptime**: Server uptime in days and hours

## 🛠️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │────│   Express API   │────│   Agent Nodes   │
│   (Frontend)    │    │   (Backend)     │    │   (Servers)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                        ┌─────────────────┐
                        │   SQLite DB     │
                        │   (Storage)     │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (for local development)
- Docker (optional, for containerized deployment)

### 1. Local Development
```bash
# Clone the repository
git clone [your-repo-url]
cd server-monitor

# Install dependencies
npm install

# Initialize database
node scripts/init-db.js

# Start the server
npm start

# Access the dashboard
open http://localhost:3000
```

### 2. Docker Deployment (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build

# Access the dashboard
open http://localhost:3000
```

### 3. Using Deploy Script
```bash
# Make script executable (Linux/Mac)
chmod +x deploy.sh

# Local development
./deploy.sh local

# Docker deployment
./deploy.sh docker-compose
```

## 📡 API Endpoints

### Server Management
- `GET /api/servers` - List all servers
- `POST /api/servers` - Add a new server
- `DELETE /api/servers/:id` - Remove a server
- `PUT /api/servers/:id` - Update server details

### Metrics
- `GET /api/metrics/:serverId` - Get metrics for specific server
- `POST /api/metrics/batch` - Get metrics for multiple servers

### Web Interface
- `GET /` - Main dashboard (server-side rendered)

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000                # Server port (default: 3000)
NODE_ENV=production      # Environment mode
```

### Database
- **Type**: SQLite
- **Location**: `db/monitor.db`
- **Tables**: `servers`, `metrics_cache`

### Server Configuration
Servers are stored with the following schema:
- `id`: Auto-incrementing primary key
- `name`: Server display name
- `url`: Agent endpoint URL
- `created_at`: Timestamp
- `updated_at`: Last update timestamp

## 🎯 Adding Servers

1. Open the dashboard at `http://localhost:3000`
2. Click "Add Server" button
3. Enter server name and agent URL
4. Click "Add Server" to save

**Agent URL Format**: `http://[server-ip]:[port]/metrics`

## 🐳 Docker Support

### Using Docker Compose
```yaml
version: '3.8'
services:
  server-monitor:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./db:/app/db  # Persistent database
    restart: unless-stopped
```

### Custom Docker Build
```bash
# Build image
docker build -t server-monitor .

# Run container
docker run -p 3000:3000 -v $(pwd)/db:/app/db server-monitor
```

## 📁 Project Structure

```
server-monitor/
├── server.js              # Express server
├── package.json           # Dependencies
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose
├── deploy.sh             # Deployment script
├── models/
│   └── database.js       # Database operations
├── routes/
│   ├── servers.js        # Server management API
│   └── metrics.js        # Metrics proxy API
├── views/
│   └── index.ejs         # Server-side template
├── public/
│   └── js/
│       └── dashboard.js  # Frontend JavaScript
├── scripts/
│   └── init-db.js        # Database initialization
└── db/
    └── monitor.db        # SQLite database
```

## 🔍 Development

### Development Mode
```bash
npm run dev
```

### Database Reset
```bash
rm db/monitor.db
node scripts/init-db.js
```

### Testing APIs
```bash
# Add a server
curl -X POST http://localhost:3000/api/servers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Server","url":"http://localhost:5000/metrics"}'

# Get all servers
curl http://localhost:3000/api/servers

# Get metrics
curl http://localhost:3000/api/metrics/1
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Permission Errors**
   ```bash
   # Ensure database directory exists
   mkdir -p db
   chmod 755 db
   ```

2. **Port Already in Use**
   ```bash
   # Use different port
   PORT=8080 npm start
   ```

3. **Agent Connection Issues**
   - Verify agent is running
   - Check firewall settings
   - Ensure correct URL format

4. **Docker Volume Issues**
   ```bash
   # Reset Docker volumes
   docker-compose down -v
   docker-compose up --build
   ```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🐛 Bug Reports

Please open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Server/agent configuration
- Browser console logs (if applicable)

## 🔗 Related Projects

- [Agent Repository](link-to-agent-repo) - The monitoring agent that provides metrics
- [Docker Images](link-to-docker-hub) - Pre-built Docker images