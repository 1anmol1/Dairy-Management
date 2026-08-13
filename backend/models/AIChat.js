const SupabaseAdapter = require('./SupabaseAdapter');

class AIChatModel extends SupabaseAdapter {
  constructor() {
    super('AIChat');
  }
}

module.exports = new AIChatModel();

