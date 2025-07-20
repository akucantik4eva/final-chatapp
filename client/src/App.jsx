import React, { useState } from 'react';
import Auth from './components/Auth';
import Home from './components/Home';
import ChatRoom from './components/ChatRoom';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [currentRoom, setCurrentRoom] = useState(null);

  const handleLoginSuccess = () => setIsAuthenticated(true);
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentRoom(null);
  };
  
  const handleJoinRoom = (room) => setCurrentRoom(room);
  const handleLeaveRoom = () => setCurrentRoom(null);

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged in, decide whether to show the Home screen or a ChatRoom
  return (
    <>
      {currentRoom ? (
        <ChatRoom room={currentRoom} onLeave={handleLeaveRoom} />
      ) : (
        <Home onJoinRoom={handleJoinRoom} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;