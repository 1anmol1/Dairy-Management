const SupabaseAdapter = require('./SupabaseAdapter');
class FarmerModel extends SupabaseAdapter {
  constructor() {
    super('Farmer');
  }
}
module.exports = new FarmerModel();
