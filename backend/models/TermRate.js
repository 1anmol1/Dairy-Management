const SupabaseAdapter = require('./SupabaseAdapter');
class TermRateModel extends SupabaseAdapter {
  constructor() {
    super('TermRate');
  }
}
module.exports = new TermRateModel();
