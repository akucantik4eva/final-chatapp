import React from 'react';

// NOTE: This data is hardcoded for the UI design.
// In a real app, you would fetch the user's actual chat rooms from your server.
const chatRooms = [
  { name: 'General', lastMsg: 'Sounds good, see you then!', time: '9:41 PM', pfp: '/pfp.png' },
  { name: 'Design Team', lastMsg: 'I love the new mockups.', time: '8:52 PM', pfp: '/pfp.png' },
  { name: 'Gaming', lastMsg: 'Anyone on for a match tonight?', time: 'Yesterday', pfp: '/pfp.png' }
];

const Home = ({ onJoinRoom, onLogout }) => {
  // A simple modal for joining/creating a new room
  const handleNewChat = () => {
    const roomName = prompt("Enter the name of the room to join or create:");
    if (roomName && roomName.trim()) {
      onJoinRoom(roomName.trim());
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Chats</h1>
        <img src="/pfp.png" alt="My Profile" className="profile-link" onClick={onLogout} title="Logout" style={{cursor: 'pointer'}}/>
      </header>

      <main className="chat-list">
        <h2>Recent Conversations</h2>
        {chatRooms.map(room => (
          <div key={room.name} className="chat-list-item" onClick={() => onJoinRoom(room.name)}>
            <img src={room.pfp} alt={room.name} className="pfp" />
            <div className="info">
              <h3>{room.name}</h3>
              <p>{room.lastMsg}</p>
            </div>
            <div className="meta">
              <span className="time">{room.time}</span>
            </div>
          </div>
        ))}
      </main>

      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <button onClick={handleNewChat}>+ Join or Create Room</button>
      </div>
    </div>
  );
};

export default Home;