#!/bin/bash
npm install
npm start > app.log 2>&1 &
echo "应用已启动，PID: $!"
echo "日志: app.log"