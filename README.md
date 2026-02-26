# Server Monitor

A modern, real-time server monitoring dashboard with backend API support. Monitor CPU, memory, disk, network, and GPU usage across multiple servers through a clean web interface.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+

### Install and Run
```bash
# Install dependencies
npm install

# Initialize database
npm run init-db

# Start the server
npm start

# Access the dashboard
open http://localhost:3000
```

### Development Mode
```bash
# Install dependencies and init database
npm run build

# Start with auto-reload
npm run dev
```

## 📊 Monitoring Capabilities

- **CPU Usage**: Real-time percentage and load averages (1/5/15 min)
- **Memory**: Usage percentage, used/total in GB
- **Disk**: Usage percentage, used/total in GB
- **Network**: Upload/download speeds in Mbps
- **GPU**: Temperature, load, and memory usage (if available)
- **Uptime**: Server uptime in days and hours

## 🛠️ Architecture

```
Browser → Express Server → SQLite DB
    ↓
Agent Servers (via /api/metrics)
```

## 📁 Project Structure

```
server-monitor/
├── server.js                 # Express server
├── package.json              # Dependencies
├── models/
│   └── database.js           # Database operations
├── routes/
│   ├── servers.js            # Server management API
│   └── metrics.js            # Metrics proxy API
├── views/
│   └── index.ejs             # Server-side template
├── public/
│   └── js/
│       └── dashboard.js      # Frontend JavaScript
├── scripts/
│   └── init-db.js            # Database initialization
├── agents/
│   ├── go/
│   │   ├── agent.go          # Go monitoring agent
│   │   └── go.mod            # Go module definition
│   └── python/
│       └── agent.py          # Python monitoring agent
└── db/
    └── monitor.db            # SQLite database
```

## ▶️ Run Agent Examples

### Go Agent
```bash
cd agents/go
go mod tidy
go run agent.go
```

### Python Agent
```bash
pip install flask flask-cors psutil GPUtil
python agents/python/agent.py
```

## 🎯 Adding Servers

1. Open http://localhost:3000
2. Click "Add Server" button
3. Enter server name and agent URL
4. Click "Add Server" to save

**Agent URL Format**: `http://[server-ip]:[port]/metrics`

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

## 🔧 Database Reset

```bash
# Reset database
rm db/monitor.db
npm run init-db
```

## 📝 License

MIT License
