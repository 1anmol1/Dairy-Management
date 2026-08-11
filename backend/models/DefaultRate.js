const SupabaseAdapter = require('./SupabaseAdapter');
class DefaultRateModel extends SupabaseAdapter {
  constructor() {
    super('DefaultRate');
  }
}
module.exports = new DefaultRateModel();
