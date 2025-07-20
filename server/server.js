// 1. IMPORTS & SETUP
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

// 2. CORS CONFIGURATION
const corsOptions = {
  origin: 'https://final-chatapp.netlify.app',
};

// 3. EXPRESS MIDDLEWARE
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/auth', authRoutes);

// 4. SOCKET.IO INITIALIZATION
const io = new Server(server, { cors: corsOptions });

// 5. DATABASE CONNECTION
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Database connected successfully"))
  .catch(err => console.error("Database connection error:", err));

// 6. SOCKET.IO AUTHENTICATION MIDDLEWARE
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: No token provided.'));
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token.'));
    socket.user = decoded;
    next();
  });
});

// 7. MAIN CONNECTION LOGIC
const activeUsers = {};

io.on('connection', async (socket) => {
  const { username } = socket.user;
  console.log(`--- ✅ CONNECTION ESTABLISHED for ${username} ---`);

  socket.on('join room', async (room) => {
    socket.join(room);
    activeUsers[socket.id] = { username, room };
    const messages = await Message.find({ room }).sort({ timestamp: 1 });
    socket.emit('load old messages', messages);
    const usersInRoom = Object.values(activeUsers).filter(user => user.room === room);
    io.to(room).emit('update user list', usersInRoom.map(u => u.username));
  });

  // --- THIS IS THE BLOCK WE ARE DEBUGGING ---
  socket.on('chat message', async (data) => {
    console.log(`--- [1/4] SERVER RECEIVED 'chat message' event from ${username} for room '${data.room}' ---`);
    console.log(`--- [2/4] Data received:`, data);
    
    const newMessage = new Message({
      user: username,
      text: data.text,
      room: data.room
    });

    try {
      console.log(`--- [3/4] Trying to save message to database... ---`);
      const savedMessage = await newMessage.save();
      console.log(`--- [4/4] SUCCESS! Message saved. Broadcasting to room '${data.room}' ---`);
      io.to(data.room).emit('chat message', savedMessage);
    } catch (error) {
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.error("--- ERROR: DATABASE SAVE OR BROADCAST FAILED ---");
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.error('The specific error is:', error);
    }
  });
  
  socket.on('typing', ({ room }) => {
    socket.to(room).broadcast.emit('typing', username);
  });

  socket.on('disconnect', () => {
    const disconnectedUser = activeUsers[socket.id];
    if (disconnectedUser) {
      const { room } = disconnectedUser;
      delete activeUsers[socket.id];
      const usersInRoom = Object.values(activeUsers).filter(user => user.room === room);
      io.to(room).emit('update user list', usersInRoom.map(u => u.username));
    }
    console.log(`--- ❌ ${username} disconnected ---`);
  });
});

// 8. START THE SERVER
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});