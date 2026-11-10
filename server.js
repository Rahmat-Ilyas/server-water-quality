const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const apiRouter = require('./routes/api');
const simulator = require('./services/simulator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRouter);

// Socket.io Connection
io.on('connection', (socket) => {
  // Kirim data langsung saat klien pertama kali connect
  socket.emit('water_reading', simulator.getCurrentState());
});

// Start Simulator
simulator.init(io);

// Port Listener
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Water Quality Monitoring Server berjalan di http://localhost:${PORT}`);
});

