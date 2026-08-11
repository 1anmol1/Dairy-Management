const SupabaseAdapter = require('./SupabaseAdapter');
class BillModel extends SupabaseAdapter {
  constructor() {
    super('Bill');
  }
}
module.exports = new BillModel();
