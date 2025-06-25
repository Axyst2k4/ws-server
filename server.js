const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Khởi tạo các biến để lưu trữ giá trị
let Mode = null;
let Set_time = null;
let Delay = null; // Thời gian delay ban đầu tính bằng giây
let Humidity = null;
let Set_point = null;

// Biến cho bộ đếm ngược
let countdownInterval = null;
let remainingTime = 0;

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

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Hàm dừng bộ đếm ngược
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        remainingTime = 0;
        broadcast(`Countdown 00:00:00`); // Reset trên client
        console.log('Bộ đếm ngược đã dừng.');
    }
}

// Hàm bắt đầu bộ đếm ngược
function startCountdown() {
  stopCountdown(); // Luôn dừng bộ đếm cũ trước khi bắt đầu cái mới

  if (Delay === null || Delay <= 0) {
      console.log('Không có giá trị Delay để bắt đầu đếm ngược.');
      return;
  }
  
  remainingTime = Delay;
  console.log(`Bắt đầu đếm ngược từ ${Delay} giây.`);
  broadcast(`Countdown ${formatTime(remainingTime)}`);

  countdownInterval = setInterval(() => {
    if (remainingTime > 0) {
      remainingTime--;
      broadcast(`Countdown ${formatTime(remainingTime)}`);
    } else {
      console.log('Đã đếm ngược xong!');
      stopCountdown();
    }
  }, 1000);
}


wss.on('connection', socket => {
  console.log("Web client đã kết nối!");

  // Gửi dữ liệu hiện tại khi kết nối
  if (Mode !== null) socket.send(`Mode ${Mode}`);
  if (Set_time !== null) socket.send(`Set_time ${Set_time}`);
  if (Delay !== null) socket.send(`Delay ${Delay}`);
  if (Humidity !== null) socket.send(`Humidity ${Humidity}`); // Đã đổi tên key cho nhất quán
  if (Set_point !== null) socket.send(`Set_point ${Set_point}`);
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
        let logMessage = '';
        let broadcastMessage = `${key} ${value}`;

        switch (key) {
          case 'Mode':
            Mode = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Mode: ${Mode}`;
            // KIỂM TRA LOGIC ĐẾM NGƯỢC KHI THAY ĐỔI MODE
            if (Mode % 2 !== 0) { // Nếu là Mode 1
                startCountdown();
            } else { // Nếu là Mode 0 hoặc các mode chẵn khác
                stopCountdown();
            }
            break;
          case 'Set_time':
            Set_time = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Set_time: ${Set_time}`;
            break;
          case 'Delay':
            Delay = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Delay: ${Delay} giây.`;
            // NẾU ĐANG Ở MODE 1, KHỞI ĐỘNG LẠI ĐẾM NGƯỢC
            if (Mode % 2 !== 0) {
                startCountdown();
            }
            break;
          case 'Humidity': // Sửa lại key cho nhất quán
            Humidity = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Humidity: ${Humidity}`;
            break;
          case 'Set_point':
            Set_point = parsedValue;
            logMessage = `[${timestamp}] Cập nhật Set_point: ${Set_point}`;
            break;
          default:
            console.log(`[${timestamp}] Key không hợp lệ: ${key}`);
            return;
        }

        console.log(logMessage);
        broadcast(broadcastMessage);

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

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
