const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

let Humidity_01 = 0;

// Tạo HTTP server để phục vụ file index.html
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Lỗi khi đọc file HTML');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end("Không tìm thấy!");
  }
});

// Gắn WebSocket vào HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', socket => {
  console.log("Web client đã kết nối!");

  // Gửi giá trị hiện tại ngay khi kết nối
  socket.send(Humidity_01.toString());

  socket.on('message', message => {
    const rawData = message.toString().trim();
    const timestamp = new Date().toLocaleString();

    if (rawData.startsWith("Humidity_01")) {
      const parts = rawData.split(" ");
      if (parts.length === 2) {
        Humidity_01 = parseInt(parts[1]);
        console.log(`[${timestamp}] Humidity_01: ${Humidity_01}`);

        // Gửi giá trị mới cho tất cả client
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(Humidity_01.toString());
          }
        });
      } else {
        console.log(`[${timestamp}] Dữ liệu không hợp lệ: ${rawData}`);
      }
    } else {
      console.log(`[${timestamp}] Dữ liệu không xác định: ${rawData}`);
    }
  });

  socket.on('close', () => {
    console.log("Web client ngắt kết nối.");
  });
});

server.listen(8080, '0.0.0.0', () => {
  console.log("Server đang chạy tại: http://192.168.0.101:8080/");
});
