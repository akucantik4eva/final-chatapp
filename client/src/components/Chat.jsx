import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { jwtDecode } from 'jwt-decode'; // CORRECTED IMPORT

const Chat = ({ onLogout }) => {
  const token = localStorage.getItem('token');
  const decodedToken = jwtDecode(token); // CORRECTED FUNCTION CALL
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
    const newSocket = io(API_URL, { auth: { token } });
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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView();
  useEffect(scrollToBottom, [messages]);
  
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (room.trim()) {
        socket.emit('join room', room);
        setHasJoinedRoom(true);
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { room });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
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
            <button onClick={onLogout} className="logout-btn" style={{background: 'transparent'}}>Logout</button>
          </form>
        </div>
      );
  }

  return (
    <div className="app-wrapper">
      <div className="users-panel">
        <h2>Online Now ({onlineUsers.length})</h2>
        <ul>{onlineUsers.map((user, index) => <li key={index}>{user}</li>)}</ul>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="chat-container">
        <header className="chat-header">
          <span>Room: <strong>{room}</strong></span>
          <span className="user-display">Logged in as {username}</span>
        </header>

        <main className="messages-list">
          {messages.map((msg) => (
            <div key={msg._id} className={`message-bubble ${msg.user === username ? 'my-message' : 'other-message'}`}>
              <span className="author">{msg.user === username ? 'Me' : msg.user}</span>
              <p>{msg.text}</p>
              <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </main>

        <footer className="input-area">
          <div className="typing-indicator">{typingUser && typingUser !== username && `${typingUser} is typing...`}</div>
          <form className="input-form" onSubmit={handleSendMessage}>
            <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." autoComplete="off" />
            <button type="submit">➤</button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default Chat;