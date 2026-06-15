const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { type: String },
  fileUrl: { type: String }, // For file attachments
  deliveredTo: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  readBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);