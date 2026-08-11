const SupabaseAdapter = require('./SupabaseAdapter');
class DailyCollectionModel extends SupabaseAdapter {
  constructor() {
    super('DailyCollection');
  }
}
module.exports = new DailyCollectionModel();
