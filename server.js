const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Khởi tạo các biến để lưu trữ giá trị từ client
let Mode = null;
let Set_time = null;
let Delay = null; // Thời gian delay ban đầu tính bằng giây
let Humidity = null;
let Set_point = null;

// Biến cho bộ đếm ngược
let countdownInterval = null; // Sẽ giữ ID của setInterval
let remainingTime = 0; // Thời gian còn lại tính bằng giây

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

// Hàm định dạng thời gian từ giây thành chuỗi HH:MM:SS
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Hàm bắt đầu bộ đếm ngược
function startCountdown() {
  // Dừng bộ đếm ngược cũ nếu đang chạy
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  remainingTime = Delay; // Lấy thời gian từ biến Delay

  countdownInterval = setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      // Gửi thời gian còn lại đến tất cả client
      broadcast(`Countdown ${formatTime(remainingTime)}`);
    } else {
      // Dừng bộ đếm ngược khi hết giờ
      clearInterval(countdownInterval);
      countdownInterval = null;
      broadcast('Countdown 00:00:00'); // Thông báo hết giờ
      console.log('Đã đếm ngược xong!');
    }
  }, 1000); // Cập nhật mỗi giây
}


wss.on('connection', socket => {
  console.log("Web client đã kết nối!");

  // Gửi tất cả dữ liệu hiện tại đến client mới khi kết nối
  if (Mode !== null) socket.send(`Mode ${Mode}`);
  if (Set_time !== null) socket.send(`Set_time ${Set_time}`);
  if (Delay !== null) socket.send(`Delay ${Delay}`);
  if (Humidity !== null) socket.send(`Humidity ${Humidity}`);
  if (Set_point !== null) socket.send(`Set_point ${Set_point}`);
  // Gửi thời gian đếm ngược hiện tại nếu đang chạy
  if (countdownInterval) {
      socket.send(`Countdown ${formatTime(remainingTime)}`);
  }


  socket.on('message', message => {
    const rawData = message.toString().trim();
    const timestamp = new Date().toLocaleString('vi-VN');

    const parts = rawData.split(' ');
    const key = parts[0];
    const value = parts.slice(1).join(' ');

    if (key && value) {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        let updated = false;
        let logMessage = '';

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
            logMessage = `[${timestamp}] Cập nhật Delay: ${Delay} giây. Bắt đầu đếm ngược.`;
            updated = true;
            // Khi Delay được cập nhật, bắt đầu bộ đếm ngược
            startCountdown();
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

        if (updated) {
          console.log(logMessage);
          // Không gửi lại giá trị Delay ngay lập tức, vì bộ đếm ngược sẽ xử lý
          if (key !== 'Delay') {
              broadcast(`${key} ${value}`);
          }
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
