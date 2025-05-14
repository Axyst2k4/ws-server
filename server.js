const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

let Humidity_01 = 0;

// Serve file tĩnh (index.html, .js, .css)
app.use(express.static(path.join(__dirname)));

// Tạo HTTP server từ Express
const server = app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại: https://localhost:${PORT}`);
});

// WebSocket server gắn vào HTTP server (Render sẽ lo HTTPS)
const wss = new WebSocket.Server({ server });

wss.on('connection', socket => {
  console.log("WebSocket client đã kết nối!");

  socket.send(`Humidity_01 ${Humidity_01}`);

  socket.on('message', message => {
    const rawData = message.toString().trim();
    const timestamp = new Date().toLocaleString();

    if (rawData.startsWith("Humidity_01")) {
      const parts = rawData.split(" ");
      if (parts.length === 2) {
        const newValue = parseInt(parts[1]);
        if (!isNaN(newValue) && newValue !== Humidity_01) {
          Humidity_01 = newValue;
          console.log(`[${timestamp}] Humidity_01: ${Humidity_01}`);

          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(`Humidity_01 ${Humidity_01}`);
            }
          });
        }
      } else {
        console.log(`[${timestamp}] Dữ liệu không hợp lệ: ${rawData}`);
      }
    } else if (rawData === "ping") {
      // giữ kết nối
    } else {
      console.log(`[${timestamp}] Dữ liệu không xác định: ${rawData}`);
    }
  });

  socket.on('close', () => {
    console.log("WebSocket client đã ngắt kết nối.");
  });
});
