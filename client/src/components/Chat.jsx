import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

const Chat = ({ onLogout }) => {
  const token = localStorage.getItem('token');
  const decodedToken = jwtDecode(token);
  const username = decodedToken.username;

  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState('');
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState('');
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const newSocket = io(API_URL, {
      auth: { token }
    });
    setSocket(newSocket);
    
    newSocket.on('load old messages', (oldMessages) => setMessages(oldMessages));
    newSocket.on('chat message', (data) => setMessages((prev) => [...prev, data]));
    newSocket.on('update user list', (users) => setOnlineUsers(users));
    newSocket.on('typing', (user) => {
      setTypingUser(user);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(''), 3000);
    });

    return () => newSocket.close();
  }, [token, API_URL]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);
  
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (room.trim() && socket) {
        socket.emit('join room', room);
        setHasJoinedRoom(true);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (socket) {
      socket.emit('typing', { room });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket) {
      socket.emit('chat message', { text: message, room });
      setMessage('');
    }
  };

  if (!hasJoinedRoom) {
      return (
        <div className="join-screen">
          <form onSubmit={handleJoinRoom}>
            <h1>Hello, {username}!</h1>
            <p>Choose a room to join.</p>
            <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Enter room name" required />
            <button type="submit">Join Room</button>
            <button onClick={onLogout} style={{background: '#6c757d', marginTop: '10px'}}>Logout</button>
          </form>
        </div>
      );
  }

  return (
    <div className="app-wrapper">
      <div className="users-panel">
        <h2>Online ({onlineUsers.length})</h2>
        <ul>{onlineUsers.map((user, index) => <li key={index}>{user}</li>)}</ul>
        <button onClick={onLogout} style={{background: '#6c757d', marginTop: 'auto'}}>Logout</button>
      </div>
      <div className="chat-container">
        <div className="chat-header">Room: {room}</div>
        <ul className="messages-list">
          {messages.map((msg) => (
            <li key={msg._id} className={msg.user === username ? 'my-message' : 'other-message'}>
              <strong>{msg.user === username ? 'Me' : msg.user}</strong>
              <p>{msg.text}</p>
              <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </li>
          ))}
          <div ref={messagesEndRef} />
        </ul>
        <div className="typing-indicator">{typingUser && typingUser !== username && `${typingUser} is typing...`}</div>
        <form className="chat-form" onSubmit={handleSendMessage}>
          <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};

export default Chat;