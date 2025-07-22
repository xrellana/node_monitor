const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 数据库实例
const db = new Database();

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