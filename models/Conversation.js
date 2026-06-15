const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  name: { type: String }, // Used primarily for group chats
  isGroup: { type: Boolean, default: false },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);