const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// Create a new Conversation (One-to-One or Group)
router.post('/conversations', async (req, res) => {
  try {
    const { participants, isGroup, name } = req.body;
    const conversation = new Conversation({ participants, isGroup, name });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;