const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

let Humidity_01 = 0;

// Tạo HTTP server để phục vụ giao diện web
const server = http.createServer((req, res) => {
  const filePath = req.url === '/' ? 'index.html' : req.url.slice(1);
  const fullPath = path.join(__dirname, filePath);
  const ext = path.extname(fullPath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
  };

  if (contentTypes[ext]) {
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Không tìm thấy file");
      }
      res.writeHead(200, { 'Content-Type': contentTypes[ext] });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end("Không tìm thấy!");
  }
});

// Tạo WebSocket server gắn với HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', socket => {
  console.log("Web client đã kết nối!");

  // Gửi giá trị hiện tại ngay khi client kết nối
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

          // Gửi cho tất cả client đang kết nối
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
      // client giữ kết nối
    } else {
      console.log(`[${timestamp}] Dữ liệu không xác định: ${rawData}`);
    }
  });

  socket.on('close', () => {
    console.log("Web client ngắt kết nối.");
  });
});

// Mở server trên tất cả địa chỉ mạng (LAN + ngrok)
const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server đang chạy tại: http://localhost:${PORT}/`);
});

