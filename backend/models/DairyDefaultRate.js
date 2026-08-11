const SupabaseAdapter = require('./SupabaseAdapter');
class DairyDefaultRateModel extends SupabaseAdapter {
  constructor() {
    super('DairyDefaultRate');
  }
}
module.exports = new DairyDefaultRateModel();
