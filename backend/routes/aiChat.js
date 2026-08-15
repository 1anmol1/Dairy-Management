const express = require('express');
const router = express.Router();
const AIChat = require('../models/AIChat');
const { protect } = require('../middleware/auth');

// Get chat history for the logged in user
router.get('/history', protect, async (req, res) => {
  try {
    const chat = await AIChat.findOne({ userId: req.user._id });
    if (!chat) {
      return res.json({ messages: [] });
    }
    res.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error fetching AI chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Append new messages to the chat history
router.post('/history', protect, async (req, res) => {
  try {
    const { messages } = req.body; // Expects an array of new messages to append
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    let chat = await AIChat.findOne({ userId: req.user._id });
    
    if (!chat) {
      chat = new AIChat({ userId: req.user._id, messages: messages });
    } else {
      chat.messages.push(...messages);
    }

    await chat.save();
    res.json({ success: true, messages: chat.messages });
  } catch (error) {
    console.error('Error saving AI chat history:', error);
    res.status(500).json({ error: 'Failed to save chat history' });
  }
});

module.exports = router;
