const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

module.exports = (io) => {
  
  // Authenticate sockets using JWT before allowing connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id;
    console.log(`User connected: ${socket.user.username} (Socket ID: ${socket.id})`);

    // 1. Update status to Online
    await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: Date.now() });
    socket.broadcast.emit('user_status_changed', { userId, isOnline: true });

    // 2. Join rooms for conversations the user belongs to
    const conversations = await Conversation.find({ participants: userId });
    conversations.forEach((conv) => {
      socket.join(conv._id.toString());
    });

    socket.on('join_room', (data) => {
      const { conversationId } = data;
      socket.join(conversationId);
      console.log(`User ${socket.user.username} dynamically joined room: ${conversationId}`);
    });

    // 3. Listen for incoming messages
    socket.on('send_message', async (data) => {
      const { conversationId, text, fileUrl } = data;
      try {
        const message = new Message({
          conversationId,
          sender: userId,
          text,
          fileUrl,
          deliveredTo: [userId], // Sender gets it by default
          readBy: [userId]
        });
        await message.save();

        const populatedMessage = await message.populate('sender', 'username isOnline');

        // Broadcast to all participants in the conversation room (synced across scaling servers via Redis)
        io.to(conversationId).emit('new_message', populatedMessage);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // 4. Message Delivery Receipt
    socket.on('message_delivered', async (data) => {
      const { messageId } = data;
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { deliveredTo: userId } },
          { new: true }
        );
        io.to(message.conversationId.toString()).emit('delivery_receipt', { messageId, userId });
      } catch (err) {
        console.error(err);
      }
    });

    // 5. Message Read Receipt
    socket.on('message_read', async (data) => {
      const { messageId } = data;
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { readBy: userId } },
          { new: true }
        );
        io.to(message.conversationId.toString()).emit('read_receipt', { messageId, userId });
      } catch (err) {
        console.error(err);
      }
    });

    // 6. Handle Disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: Date.now() });
      socket.broadcast.emit('user_status_changed', { userId, isOnline: false, lastActive: new Date() });
    });
  });
};