const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./authRoutes');
const { Message } = require('./models');

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET;

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://final-chatapp.netlify.app' // Replace with your deployed frontend URL
    : 'http://localhost:5173',         
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRoutes);

const io = new Server(server, { cors: corsOptions });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Database connected successfully"))
  .catch(err => console.error("Database connection error:", err));

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token provided.'));
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token.'));
    socket.user = decoded;
    next();
  });
});

const activeUsers = {};

io.on('connection', async (socket) => {
  const { username } = socket.user;
  console.log(`✅ ${username} connected: ${socket.id}`);

  socket.on('join room', async (room) => {
    socket.join(room);
    activeUsers[socket.id] = { username, room };

    const messages = await Message.find({ room }).sort({ timestamp: 1 });
    socket.emit('load old messages', messages);

    const usersInRoom = Object.values(activeUsers).filter(user => user.room === room);
    io.to(room).emit('update user list', usersInRoom.map(u => u.username));
  });

  socket.on('chat message', async (data) => {
    const newMessage = new Message({ user: username, text: data.text, room: data.room });
    const savedMessage = await newMessage.save();
    io.to(data.room).emit('chat message', savedMessage);
  });
  
  // --- THIS IS THE CORRECTED LINE ---
  socket.on('typing', ({ room }) => {
    socket.broadcast.to(room).emit('typing', username);
  });

  socket.on('disconnect', () => {
    const disconnectedUser = activeUsers[socket.id];
    if (disconnectedUser) {
      const { room } = disconnectedUser;
      delete activeUsers[socket.id];
      const usersInRoom = Object.values(activeUsers).filter(user => user.room === room);
      io.to(room).emit('update user list', usersInRoom.map(u => u.username));
    }
    console.log(`❌ ${username} disconnected`);
  });
});

server.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));