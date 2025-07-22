const express = require('express');
const axios = require('axios');
const router = express.Router();
const Database = require('../models/database');

const db = new Database();

// 代理获取metrics数据
router.get('/metrics/:serverId', async (req, res) => {
  try {
    const server = await db.getServerById(req.params.serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // 检查缓存
    const cached = await db.getCachedMetrics(req.params.serverId, 1); // 1分钟缓存
    if (cached) {
      return res.json(cached);
    }

    // 代理请求到agent
    const response = await axios.get(server.url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Server-Monitor-Backend/1.0'
      }
    });

    // 缓存结果
    await db.cacheMetrics(req.params.serverId, response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching metrics for server ${req.params.serverId}:`, error.message);
    
    let errorMessage = 'Failed to fetch metrics';
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout';
    } else if (error.response) {
      errorMessage = `HTTP ${error.response.status}`;
    }

    res.status(500).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
});

// 批量获取metrics（用于轮询）
router.post('/metrics/batch', async (req, res) => {
  try {
    const { serverIds } = req.body;
    
    if (!Array.isArray(serverIds)) {
      return res.status(400).json({ error: 'serverIds must be an array' });
    }

    const results = await Promise.allSettled(
      serverIds.map(async (serverId) => {
        const server = await db.getServerById(serverId);
        if (!server) {
          return { serverId, error: 'Server not found' };
        }

        try {
          const response = await axios.get(server.url, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Server-Monitor-Backend/1.0'
            }
          });

          await db.cacheMetrics(serverId, response.data);
          return { serverId, data: response.data };
        } catch (error) {
          return { 
            serverId, 
            error: error.message,
            url: server.url 
          };
        }
      })
    );

    res.json(results.map(result => 
      result.status === 'fulfilled' ? result.value : { error: result.reason }
    ));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;