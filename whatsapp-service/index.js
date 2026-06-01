const express = require('express');
const path = require('path');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { loadSavedSessions } = require('./whatsapp/sessionManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple static front-end page serving
app.use(express.static(path.join(__dirname, 'public')));

// Root status endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Baileys Service',
    description: 'Unofficial WhatsApp Automation Service',
    status: 'running',
    health: '/api/whatsapp/health'
  });
});

// Register routes
app.use('/api/whatsapp', whatsappRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`==================================================`);
  console.log(`WhatsApp Automation Service listening on port ${PORT}`);
  console.log(`==================================================`);
  
  // Restore saved sessions from disk on startup
  try {
    await loadSavedSessions();
  } catch (err) {
    console.error('Error reloading saved sessions:', err.message);
  }
});
