const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 根路由 - 渲染主页
app.get('/', async (req, res) => {
  try {
    const servers = await db.getAllServers();
    res.render('index', { servers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.render('index', { servers: [] });
  }
});

// API路由
app.use('/api', require('./routes/servers'));
app.use('/api', require('./routes/metrics'));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});