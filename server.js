const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

let Humidity_01 = 0;
let humiditySetpoint = null; // Biến lưu trữ ngưỡng độ ẩm

// **Giả định:** Địa chỉ WebSocket server của ESP32
const ESP32_WS_URL = 'ws://your-esp32-ip:your-esp32-port';
let esp32Socket;

// Hàm để kết nối với ESP32 WebSocket server
function connectToESP32() {
    esp32Socket = new WebSocket(ESP32_WS_URL);

    esp32Socket.on('open', () => {
        console.log('✅ Đã kết nối đến ESP32 WebSocket server!');
        // Gửi ngưỡng hiện tại cho ESP32 khi kết nối (nếu có)
        if (humiditySetpoint !== null) {
            sendDataToESP32({ type: 'set_setpoint', value: humiditySetpoint });
        }
    });

    esp32Socket.on('message', message => {
        console.log(`⬅️ [ESP32]: ${message.toString()}`);
        // Xử lý dữ liệu nhận được từ ESP32 (nếu cần)
    });

    esp32Socket.on('close', () => {
        console.log('❌ Mất kết nối với ESP32 WebSocket server. Thử kết nối lại sau 5 giây...');
        setTimeout(connectToESP32, 5000); // Tự động thử kết nối lại
    });

    esp32Socket.on('error', error => {
        console.error('⚠️ Lỗi kết nối ESP32 WebSocket:', error);
    });
}

// Hàm để gửi dữ liệu đến ESP32
function sendDataToESP32(data) {
    if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
        esp32Socket.send(JSON.stringify(data));
        console.log(`➡️ [Server -> ESP32]: ${JSON.stringify(data)}`);
    } else {
        console.log('⚠️ Chưa kết nối hoặc kết nối ESP32 đang đóng. Không thể gửi dữ liệu.');
    }
}

// Khởi động kết nối đến ESP32
connectToESP32();

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

    socket.send(JSON.stringify({ type: 'humidity', value: Humidity_01 }));
    if (humiditySetpoint !== null) {
        socket.send(JSON.stringify({ type: 'setpoint', value: humiditySetpoint }));
    }

    socket.on('message', message => {
        const rawData = message.toString().trim();
        const timestamp = new Date().toLocaleString();

        try {
            const parsedData = JSON.parse(rawData);

            if (parsedData.type === 'set_setpoint' && parsedData.value !== undefined) {
                const newSetpoint = parseInt(parsedData.value);
                if (!isNaN(newSetpoint) && newSetpoint !== humiditySetpoint) {
                    humiditySetpoint = newSetpoint;
                    console.log(`[${timestamp}] Đã nhận ngưỡng độ ẩm mới: ${humiditySetpoint}%`);

                    // Gửi ngưỡng mới đến ESP32
                    sendDataToESP32({ type: 'set_setpoint', value: humiditySetpoint });

                    // Gửi lại ngưỡng mới cho tất cả các client đang kết nối
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'setpoint', value: humiditySetpoint }));
                        }
                    });
                }
            } else if (parsedData.type === 'humidity_update' && parsedData.value !== undefined) {
                const newValue = parseInt(parsedData.value);
                if (!isNaN(newValue) && newValue !== Humidity_01) {
                    Humidity_01 = newValue;
                    console.log(`[${timestamp}] Độ ẩm: ${Humidity_01}%`);

                    // Gửi thông tin độ ẩm mới cho tất cả các client đang kết nối
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'humidity', value: Humidity_01 }));
                        }
                    });
                }
            } else if (parsedData.type === 'ping') {
                // Giữ kết nối
            } else {
                console.log(`[${timestamp}] Dữ liệu không xác định: ${rawData}`);
            }
        } catch (error) {
            console.log(`[${timestamp}] Lỗi khi phân tích JSON: ${rawData}`, error);
            // Xử lý dữ liệu cũ (dạng "Humidity_01 53") để tương thích ngược (nếu cần)
            if (rawData.startsWith("Humidity_01")) {
                const parts = rawData.split(" ");
                if (parts.length === 2) {
                    const newValue = parseInt(parts[1]);
                    if (!isNaN(newValue) && newValue !== Humidity_01) {
                        Humidity_01 = newValue;
                        console.log(`[${timestamp}] Humidity_01 (legacy): ${Humidity_01}`);
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'humidity', value: Humidity_01 }));
                            }
                        });
                    }
                } else {
                    console.log(`[${timestamp}] Dữ liệu độ ẩm (legacy) không hợp lệ: ${rawData}`);
                }
            }
        }
    });

    socket.on('close', () => {
        console.log("WebSocket client đã ngắt kết nối.");
    });
});
