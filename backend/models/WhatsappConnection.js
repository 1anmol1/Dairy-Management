const SupabaseAdapter = require('./SupabaseAdapter');
class WhatsappConnectionModel extends SupabaseAdapter {
  constructor() {
    super('WhatsappConnection');
  }
}
module.exports = new WhatsappConnectionModel();
