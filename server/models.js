const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schema for chat messages
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  room: String,
  timestamp: { type: Date, default: Date.now }
});

// Schema for user accounts
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Automatically hash password before saving a new user
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Message = mongoose.model('Message', messageSchema);
const User = mongoose.model('User', userSchema);

module.exports = { Message, User };