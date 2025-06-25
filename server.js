const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Khởi tạo các biến để lưu trữ giá trị từ client
let Mode = null;
let Set_time = null;
let Delay = null;
let Humidity = null;
let Set_point = null;

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

// Hàm gửi dữ liệu đến tất cả client đang kết nối
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', socket => {
  console.log("Web client đã kết nối!");

  // Gửi tất cả dữ liệu hiện tại đến client mới khi kết nối
  if (Mode !== null) socket.send(`Mode ${Mode}`);
  if (Set_time !== null) socket.send(`Set_time ${Set_time}`);
  if (Delay !== null) socket.send(`Delay ${Delay}`);
  if (Humidity !== null) socket.send(`Humidity ${Humidity}`);
  if (Set_point !== null) socket.send(`Set_point ${Set_point}`);

  socket.on('message', message => {
    const rawData = message.toString().trim();
    const timestamp = new Date().toLocaleString('vi-VN'); // Định dạng thời gian Việt Nam

    // Tách key và value từ message, ví dụ: "Mode 8" -> key="Mode", value="8"
    const parts = rawData.split(' ');
    const key = parts[0];
    const value = parts.slice(1).join(' '); // Nối lại phần còn lại của giá trị

    if (key && value) {
      const parsedValue = parseFloat(value); // Dùng parseFloat để linh hoạt hơn
      if (!isNaN(parsedValue)) {
        let updated = false;
        let logMessage = '';

        // Cập nhật giá trị dựa trên key
        switch (key) {
          case 'Mode':
            Mode = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Mode: ${Mode}`;
            updated = true;
            break;
          case 'Set_time':
            Set_time = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Set_time: ${Set_time}`;
            updated = true;
            break;
          case 'Delay':
            Delay = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Delay: ${Delay}`;
            updated = true;
            break;
          case 'Humidity':
            Humidity = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Humidity: ${Humidity}`;
            updated = true;
            break;
          case 'Set_point':
            Set_point = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Set_point: ${Set_point}`;
            updated = true;
            break;
          default:
            console.log(`[${timestamp}] Key không hợp lệ: ${key}`);
            break;
        }

        // Nếu có cập nhật, ghi log và gửi cho tất cả client
        if (updated) {
          console.log(logMessage);
          broadcast(`${key} ${value}`); // Gửi lại đúng định dạng đã nhận
        }
      } else {
        console.log(`[${timestamp}] Giá trị không phải là số cho key ${key}: ${value}`);
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
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
