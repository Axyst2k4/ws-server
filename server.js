// --- PHẦN 1: KHỞI TẠO VÀ CÀI ĐẶT ---
const http = require('http');
const WebSocket = require('ws');

// Khởi tạo các biến để lưu trữ giá trị
let Mode = null;
let Set_time = null;
let Delay_hours = 0; // Thời gian delay ban đầu tính bằng giờ
let Humidity = null;
let Set_point = null;

// Biến cho bộ đếm ngược
let countdownInterval = null;
let remainingTimeInSeconds = 0; // Tổng thời gian còn lại tính bằng giây

// Tạo HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket Server is running.');
});

// Tạo WebSocket server
const wss = new WebSocket.Server({ server });

// --- PHẦN 2: CÁC HÀM HỖ TRỢ ---

/**
 * Gửi dữ liệu tới tất cả các client đang kết nối.
 * @param {string} data - Dữ liệu cần gửi.
 */
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

/**
 * Định dạng thời gian từ tổng số giây sang HH:MM:SS.
 * @param {number} totalSeconds - Tổng số giây.
 * @returns {string} Thời gian đã định dạng.
 */
function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// Hàm dừng bộ đếm ngược
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        remainingTimeInSeconds = 0;
        broadcast(`Countdown 00:00:00`); // Reset trên client
        console.log('Bộ đếm ngược đã dừng.');
    }
}

// Hàm bắt đầu bộ đếm ngược
function startCountdown() {
    stopCountdown(); // Luôn dừng bộ đếm cũ trước khi bắt đầu cái mới

    const totalDelayInSeconds = Delay_hours * 3600;

    if (totalDelayInSeconds <= 0) {
        console.log('Không có giá trị Delay_hours để bắt đầu đếm ngược hoặc giá trị không hợp lệ.');
        return;
    }

    remainingTimeInSeconds = totalDelayInSeconds;
    console.log(`Bắt đầu đếm ngược từ ${formatTime(remainingTimeInSeconds)}.`);
    broadcast(`Countdown ${formatTime(remainingTimeInSeconds)}`);

    countdownInterval = setInterval(() => {
        if (remainingTimeInSeconds > 0) {
            remainingTimeInSeconds--;
            broadcast(`Countdown ${formatTime(remainingTimeInSeconds)}`);
        } else {
            console.log('Đã đếm ngược xong!');
            stopCountdown();
        }
    }, 1000);
}

// --- PHẦN 3: XỬ LÝ KẾT NỐI WEBSOCKET ---

wss.on('connection', socket => {
    console.log("Web client đã kết nối!");

    // Gửi toàn bộ trạng thái hiện tại cho client mới kết nối để đảm bảo đồng bộ
    socket.send(`Mode ${Mode}`);
    socket.send(`Set_time ${Set_time}`);
    socket.send(`Delay ${Delay_hours}`);
    socket.send(`Humidity ${Humidity}`);
    socket.send(`Set_point ${Set_point}`);

    if (countdownInterval) {
        socket.send(`Countdown ${formatTime(remainingTimeInSeconds)}`);
    } else {
        socket.send(`Countdown 00:00:00`);
    }

    // Xử lý khi nhận được tin nhắn từ client
    socket.on('message', rawMessage => {
        const message = rawMessage.toString();
        const timestamp = new Date().toLocaleTimeString();
        const parts = message.trim().split(' ');

        if (parts.length < 2) {
            console.log(`[${timestamp}] Thông điệp không đúng định dạng: ${message}`);
            return;
        }

        const key = parts[0];
        const value = parts.slice(1).join(' ');
        const parsedValue = parseFloat(value);

        if (isNaN(parsedValue)) {
            console.log(`[${timestamp}] Giá trị không phải là số cho key '${key}': ${value}`);
            return;
        }

        let logMessage = '';
        const broadcastMessage = `${key} ${value}`;

        switch (key) {
            case 'Mode':
                Mode = parsedValue;
                logMessage = `[${timestamp}] Cập nhật Mode: ${Mode}`;
                if (Mode % 2 !== 0) { // Nếu là Mode lẻ
                    startCountdown();
                } else { // Nếu là Mode chẵn
                    stopCountdown();
                }
                break;

            case 'Set_time':
                Set_time = parsedValue;
                logMessage = `[${timestamp}] Cập nhật Set_time: ${Set_time}`;
                break;

            case 'Delay':
                Delay_hours = parsedValue;
                logMessage = `[${timestamp}] Cập nhật Delay: ${Delay_hours} giờ.`;
                // Nếu đang ở Mode lẻ, khởi động lại đếm ngược với giá trị Delay mới
                if (Mode % 2 !== 0) {
                    startCountdown();
                }
                break;

            case 'Humidity':
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
    });

    // Xử lý khi client ngắt kết nối
    socket.on('close', () => {
        console.log("Web client ngắt kết nối.");
    });
});

// --- PHẦN 4: KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});
