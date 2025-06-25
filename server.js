const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Khởi tạo các biến để lưu trữ giá trị
let Mode = null;
let Set_time = null;
let Delay = null;

// Tạo HTTP server phục vụ file HTML
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

  // Gửi dữ liệu hiện tại đến client khi kết nối
  socket.send(`Mode ${Mode}`);
  socket.send(`Set_time ${Set_time}`);
  socket.send(`Delay ${Delay}`);

  socket.on('message', message => {
    const rawData = message.toString().trim();
    const timestamp = new Date().toLocaleString();

    // Kiểm tra định dạng thông điệp
    const prefix = 'Dữ liệu không xác định: ';
    if (rawData.includes(prefix)) {
      const dataPart = rawData.split(prefix)[1].trim(); // Lấy phần sau prefix
      const [key, value] = dataPart.split(' '); // Tách key và value

      if (key && value) {
        const parsedValue = parseInt(value); // Chuyển value thành số
        if (!isNaN(parsedValue)) {
          // Cập nhật giá trị dựa trên key
          if (key === 'Mode') {
            Mode = parsedValue;
            console.log(`[${timestamp}] Mode: ${Mode}`);
          } else if (key === 'Set_time') {
            Set_time = parsedValue;
            console.log(`[${timestamp}] Set_time: ${Set_time}`);
          } else if (key === 'Delay') {
            Delay = parsedValue;
            console.log(`[${timestamp}] Delay: ${Delay}`);
          } else {
            console.log(`[${timestamp}] Key không hợp lệ: ${key}`);
            return;
          }

          // Gửi dữ liệu mới cho tất cả client
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              if (key === 'Mode') client.send(`Mode ${Mode}`);
              if (key === 'Set_time') client.send(`Set_time ${Set_time}`);
              if (key === 'Delay') client.send(`Delay ${Delay}`);
            }
          });
        } else {
          console.log(`[${timestamp}] Giá trị không hợp lệ cho key ${key}: ${value}`);
        }
      } else {
        console.log(`[${timestamp}] Dữ liệu không hợp lệ: ${dataPart}`);
      }
    } else {
      console.log(`[${timestamp}] Thông điệp không đúng định dạng: ${rawData}`);
    }
  });

  socket.on('close', () => {
    console.log("Web client ngắt kết nối.");
  });
});

// Khởi động server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
