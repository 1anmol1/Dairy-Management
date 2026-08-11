const SupabaseAdapter = require('./SupabaseAdapter');
class DailyLogModel extends SupabaseAdapter {
  constructor() {
    super('DailyLog');
  }
}
module.exports = new DailyLogModel();
