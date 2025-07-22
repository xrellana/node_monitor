# Server Monitor - 部署指南

## 快速开始

### 1. 本地运行
```bash
# Windows
npm install
node scripts\\init-db.js
npm start

# Linux/Mac
chmod +x deploy.sh
./deploy.sh local
```

### 2. Docker运行
```bash
# Windows
docker build -t server-monitor .
docker run -p 3000:3000 -v %cd%\\db:/app/db server-monitor

# Linux/Mac
./deploy.sh docker
```

### 3. Docker Compose运行（推荐）
```bash
# Windows
docker-compose up --build

# Linux/Mac
./deploy.sh docker-compose
```

## API端点

- `GET /` - 主页面（服务端渲染）
- `GET /api/servers` - 获取所有服务器
- `POST /api/servers` - 添加服务器
- `DELETE /api/servers/:id` - 删除服务器
- `GET /api/metrics/:serverId` - 获取服务器指标
- `POST /api/metrics/batch` - 批量获取指标

## 开发模式

```bash
npm run dev  # 使用nodemon热重载
```

## 数据持久化

- 数据库文件：`db/monitor.db`
- 使用Docker时，数据库会挂载到本地目录

## 端口配置

默认端口：3000
可通过环境变量修改：
```bash
PORT=8080 npm start
```