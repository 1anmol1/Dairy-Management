const SupabaseAdapter = require('./SupabaseAdapter');
class RecycleBinModel extends SupabaseAdapter {
  constructor() {
    super('RecycleBin');
  }
}
module.exports = new RecycleBinModel();
