#!/bin/bash

# Build and run the server monitor
# Usage: ./deploy.sh [local|docker|docker-compose]

set -e

MODE=${1:-local}

echo "🚀 Starting Server Monitor deployment..."

case $MODE in
    local)
        echo "📦 Installing dependencies..."
        npm install
        
        echo "🗄️  Initializing database..."
        node scripts/init-db.js
        
        echo "🚀 Starting server..."
        npm start
        ;;
        
    docker)
        echo "🐳 Building Docker image..."
        docker build -t server-monitor .
        
        echo "🚀 Running Docker container..."
        docker run -p 3000:3000 -v $(pwd)/db:/app/db server-monitor
        ;;
        
    docker-compose)
        echo "🐳 Building with Docker Compose..."
        docker-compose up --build
        ;;
        
    *)
        echo "❌ Unknown mode: $MODE"
        echo "Usage: $0 [local|docker|docker-compose]"
        exit 1
        ;;
esac