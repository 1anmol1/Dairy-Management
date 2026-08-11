const SupabaseAdapter = require('./SupabaseAdapter');
class MessageTemplateModel extends SupabaseAdapter {
  constructor() {
    super('MessageTemplate');
  }
}
module.exports = new MessageTemplateModel();
