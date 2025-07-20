import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

const ChatRoom = ({ room, onLeave }) => {
  const token = localStorage.getItem('token');
  const { username } = jwtDecode(token);

  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  const messagesEndRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const newSocket = io(API_URL, { auth: { token } });
    setSocket(newSocket);

    newSocket.emit('join room', room);
    newSocket.on('load old messages', (oldMessages) => setMessages(oldMessages));
    newSocket.on('chat message', (data) => setMessages((prev) => [...prev, data]));

    return () => newSocket.close();
  }, [room, token, API_URL]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && socket) {
      socket.emit('chat message', { text: message, room });
      setMessage('');
    }
  };

  return (
    <div className="chatroom-container">
      <header className="chatroom-header">
        <button className="back-btn" onClick={onLeave}>←</button>
        <img src="/pfp.png" alt={room} className="pfp" />
        <h2>{room}</h2>
      </header>

      <main className="messages-list">
        {messages.map((msg) => (
          <div key={msg._id} className={`message-bubble ${msg.user === username ? 'my-message' : 'other-message'}`}>
            {/* We don't need to show the author name in this design */}
            <p>{msg.text}</p>
            <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="input-area">
        <form className="input-form" onSubmit={handleSendMessage}>
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." autoComplete="off" />
          <button type="submit">➤</button>
        </form>
      </footer>
    </div>
  );
};

export default ChatRoom;