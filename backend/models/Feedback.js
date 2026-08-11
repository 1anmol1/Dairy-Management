const SupabaseAdapter = require('./SupabaseAdapter');
class FeedbackModel extends SupabaseAdapter {
  constructor() {
    super('Feedback');
  }
}
module.exports = new FeedbackModel();
