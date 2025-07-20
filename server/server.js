// 1. IMPORTS & SETUP
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// Import from our other server files
const authRoutes = require('./authRoutes');
const { Message } = require('./models');

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET;

// 2. CORS CONFIGURATION
// This configuration allows both the Express API and Socket.IO to accept
// connections from your deployed frontend and your local development environment.
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://final-chatapp.netlify.app' // Your live frontend URL
    : 'http://localhost:5173',          // Your local frontend URL
};

// 3. EXPRESS MIDDLEWARE
app.use(cors(corsOptions)); // Use CORS for regular HTTP routes
app.use(express.json());   // Allow server to parse JSON in request bodies
app.use('/api/auth', authRoutes); // Use our authentication routes for any /api/auth path

// 4. SOCKET.IO INITIALIZATION
// Initialize Socket.IO and apply the same CORS options
const io = new Server(server, { cors: corsOptions });

// 5. DATABASE CONNECTION
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Database connected successfully"))
  .catch(err => console.error("Database connection error:", err));

// 6. SOCKET.IO AUTHENTICATION MIDDLEWARE
// This is a security check that runs BEFORE a client is allowed to connect.
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided.'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token.'));
    }
    // If token is valid, attach the user payload to the socket object
    socket.user = decoded; 
    next();
  });
});

// 7. MAIN CONNECTION LOGIC
const activeUsers = {};

io.on('connection', async (socket) => {
  const { username } = socket.user; // Get username from the secure token, not from the client
  console.log(`✅ ${username} connected: ${socket.id}`);

  // When a user joins a room
  socket.on('join room', async (room) => {
    socket.join(room);
    activeUsers[socket.id] = { username, room };

    // Load message history for the joined room
    try {
      const messages = await Message.find({ room }).sort({ timestamp: 1 });
      socket.emit('load old messages', messages);
    } catch (error) { 
      console.error('Error fetching messages:', error); 
    }

    // Broadcast the updated user list for that room
    const usersInRoom = Object.values(activeUsers).filter(user => user.room === room);
    io.to(room).emit('update user list', usersInRoom.map(u => u.username));
  });

  // When a new chat message is received
  socket.on('chat message', async (data) => {
    const newMessage = new Message({
      user: username, // Use the authenticated username
      text: data.text,
      room: data.room
    });
    try {
      const savedMessage = await newMessage.save();
      // Broadcast the saved message to everyone in the correct room
      io.to(data.room).emit('chat message', savedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });
  
  // When a user is typing
  socket.on('typing', ({ room }) => {
    // Broadcast to everyone in the room except the sender
    socket.to(room).broadcast.emit('typing', username);
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    const disconnectedUser = activeUsers[socket.id];
    if (disconnectedUser) {
      const { room } = disconnectedUser;
      delete activeUsers[socket.id];
      
      // Update the user list for the room the user was in
      const usersInRoom = Object.values(activeUsers).filter(user => user.room === room);
      io.to(room).emit('update user list', usersInRoom.map(u => u.username));
    }
    console.log(`❌ ${username} disconnected`);
  });
});

// 8. START THE SERVER
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});