const SupabaseAdapter = require('./SupabaseAdapter');
class FarmerCollectionModel extends SupabaseAdapter {
  constructor() {
    super('FarmerCollection');
  }
}
module.exports = new FarmerCollectionModel();
