const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['bug', 'suggestion', 'feature_request', 'support', 'other'],
    required: true,
    default: 'other'
  },
  message: {
    type: String,
    required: true,
    maxlength: [1000, 'Feedback message cannot exceed 1000 characters']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
