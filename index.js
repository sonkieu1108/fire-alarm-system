const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(bodyParser.json());

// Lưu dữ liệu cảm biến mới nhất
let sensorData = {
    smoke: 0,       // ppm
    gas: 0,         // ppm
    infrared: 0,    // %
    temperature: 0, // °C
    humidity: 0,    // %
    alarm: false
};

// Định nghĩa ngưỡng cảnh báo (dựa trên ppm và %)
const thresholds = {
    smoke: 1000,    // ppm
    gas: 2000,      // ppm
    infrared: 20    // % (đọc ngược, < 20% là gần)
};

// Cung cấp file HTML từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Nhận dữ liệu từ ESP32 qua POST (tạm thời giữ cho tương thích, nhưng khuyến nghị dùng WebSocket)
app.post("/data", (req, res) => {
    sensorData = req.body;

    // Kiểm tra cảnh báo (cập nhật ngưỡng)
    const fireDetected = (sensorData.smoke > thresholds.smoke) ||
                         (sensorData.gas > thresholds.gas) ||
                         (sensorData.infrared < thresholds.infrared) ||
                         (sensorData.temperature > 50); // Thêm ngưỡng nhiệt độ
    
    sensorData.alarm = fireDetected || sensorData.alarm;

    // Gửi dữ liệu đến tất cả client WebSocket
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(sensorData));
        }
    });

    console.log("Dữ liệu nhận được từ ESP32:", sensorData);
    res.send({ message: "Dữ liệu đã nhận", status: "OK" });
});

// Gửi dữ liệu khi có yêu cầu GET
app.get("/data", (req, res) => {
    res.json(sensorData);
});

// Lắng nghe trên 0.0.0.0 cho Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server chạy tại cổng: ${PORT}`);
});