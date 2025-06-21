const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

let Humidity_01 = 0;

// Tạo HTTP server phục vụ index.html
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

// Tạo WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', socket => {
  console.log("Web client đã kết nối!");

  // Gửi dữ liệu hiện tại
  socket.send(`Humidity_01 ${Humidity_01}`);

  socket.on('message', message => {
    const rawData = message.toString().trim();
    const timestamp = new Date().toLocaleString();

    if (rawData.startsWith("Humidity_01")) {
      const parts = rawData.split(" ");
      if (parts.length === 2) {
        const value = parseInt(parts[1]);
        if (!isNaN(value)) {
          Humidity_01 = value;
          console.log(`[${timestamp}] Humidity_01: ${Humidity_01}`);

          // Gửi dữ liệu mới cho tất cả client
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(`Humidity_01 ${Humidity_01}`);
            }
          });
        } else {
          console.log(`[${timestamp}] Giá trị độ ẩm không hợp lệ: ${parts[1]}`);
        }
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

// Lấy cổng từ biến môi trường của Render, nếu không có thì mặc định là 8080 (để chạy local)
const PORT = process.env.PORT || 8080;

// Khởi động server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
