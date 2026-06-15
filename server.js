require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');

const connectDB = require('./config/db');
const createRedisClient = require('./config/redis');
const registerSocketHandlers = require('./sockets/chatSocket');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static('public'));


app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));

// Initialize Database Connection
connectDB();

const PORT = process.env.PORT || 5000;

// Initialize Socket.io Server
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust based on your clients
    methods: ['GET', 'POST']
  }
});

// Configure Redis Adapters for Horizontal Scaling
const setupScaling = async () => {
  try {
    const pubClient = createRedisClient();
    const subClient = pubClient.duplicate();

    // Connect to Redis Server
    await Promise.all([pubClient.connect(), subClient.connect()]);
    
    // Attach Adapter to Socket.io
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis Adapter successfully attached for horizontal scaling.');
  } catch (err) {
    console.error('Failed to connect to Redis. Running without horizontal scaling capabilities.', err.message);
  }
};

// Setup Socket configurations
setupScaling().then(() => {
  registerSocketHandlers(io);

  // Test Route
  app.get('/', (req, res) => {
    res.json({ message: 'Real-time Chat Backend running.' });
  });

  server.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
  });
});