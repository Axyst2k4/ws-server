const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Khởi tạo các biến để lưu trữ giá trị
let Mode = "Set Humidity"; // Mặc định là Set Humidity
let Set_point = 50; // Mặc định 50%
let Delay_hours = 1; // Mặc định 1 giờ
let Watering_minutes = 10; // Mặc định 10 phút
let Humidity = 45; // Mặc định 45%

// Tạo HTTP server
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

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', socket => {
  console.log("Web client đã kết nối!");

  // Gửi dữ liệu hiện tại khi kết nối
  socket.send(`Mode ${Mode}`);
  socket.send(`Set_point ${Set_point}`);
  socket.send(`Delay ${Delay_hours}`);
  socket.send(`Watering ${Watering_minutes}`);
  socket.send(`Humidity ${Humidity}`);

  socket.on('message', message => {
    const rawData = message.toString().trim();
    const timestamp = new Date().toLocaleString('vi-VN');

    const parts = rawData.split(' ');
    const key = parts[0];
    const value = parts.slice(1).join(' ');

    if (key && value) {
      let logMessage = '';
      let broadcastMessage = `${key} ${value}`;

      switch (key) {
        case 'Mode':
          if (value === 'Set Humidity' || value === 'Set Time') {
            Mode = value;
            logMessage = `[${timestamp}] Cập nhật Mode: ${Mode}`;
            broadcastMessage = `Mode ${Mode}`;
          } else {
            console.log(`[${timestamp}] Giá trị Mode không hợp lệ: ${value}`);
            return;
          }
          break;
        case 'Set_point':
          const setPointValue = parseFloat(value);
          if (!isNaN(setPointValue) && setPointValue >= 0 && setPointValue <= 100) {
            Set_point = setPointValue;
            logMessage = `[${timestamp}] Cập nhật Set_point: ${Set_point}%`;
          } else {
            console.log(`[${timestamp}] Giá trị Set_point không hợp lệ: ${value}`);
            return;
          }
          break;
        case 'Delay':
          const delayValue = parseInt(value);
          if (!isNaN(delayValue) && delayValue >= 0 && delayValue <= 24) {
            Delay_hours = delayValue;
            logMessage = `[${timestamp}] Cập nhật Delay: ${Delay_hours} giờ`;
          } else {
            console.log(`[${timestamp}] Giá trị Delay không hợp lệ: ${value}`);
            return;
          }
          break;
        case 'Watering':
          const wateringValue = parseInt(value);
          if (!isNaN(wateringValue) && wateringValue >= 0 && wateringValue <= 60) {
            Watering_minutes = wateringValue;
            logMessage = `[${timestamp}] Cập nhật Watering: ${Watering_minutes} phút`;
          } else {
            console.log(`[${timestamp}] Giá trị Watering không hợp lệ: ${value}`);
            return;
          }
          break;
        case 'Humidity':
          const humidityValue = parseFloat(value);
          if (!isNaN(humidityValue) && humidityValue >= 0 && humidityValue <= 100) {
            Humidity = humidityValue;
            logMessage = `[${timestamp}] Cập nhật Humidity: ${Humidity}%`;
          } else {
            console.log(`[${timestamp}] Giá trị Humidity không hợp lệ: ${value}`);
            return;
          }
          break;
        default:
          console.log(`[${timestamp}] Key không hợp lệ: ${key}`);
          return;
      }

      console.log(logMessage);
      broadcast(broadcastMessage);
    } else {
      console.log(`[${timestamp}] Thông điệp không đúng định dạng: ${rawData}`);
    }
  });

  socket.on('close', () => {
    console.log("Web client ngắt kết nối.");
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
