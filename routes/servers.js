const express = require('express');
const router = express.Router();
const db = require('../models/database');

// 获取所有服务器
router.get('/servers', async (req, res) => {
  try {
    const servers = await db.getAllServers();
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个服务器
router.get('/servers/:id', async (req, res) => {
  try {
    const server = await db.getServerById(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json(server);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 添加服务器
router.post('/servers', async (req, res) => {
  try {
    const { name, url } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const serverId = await db.addServer(name, url);
    const newServer = await db.getServerById(serverId);
    
    res.status(201).json(newServer);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Server name already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// 更新服务器
router.put('/servers/:id', async (req, res) => {
  try {
    const { name, url } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const changes = await db.updateServer(req.params.id, name, url);
    if (changes === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const updatedServer = await db.getServerById(req.params.id);
    res.json(updatedServer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除服务器
router.delete('/servers/:id', async (req, res) => {
  try {
    const changes = await db.removeServer(req.params.id);
    if (changes === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;