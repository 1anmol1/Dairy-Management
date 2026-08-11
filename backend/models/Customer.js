const SupabaseAdapter = require('./SupabaseAdapter');
class CustomerModel extends SupabaseAdapter {
  constructor() {
    super('Customer');
  }
}
module.exports = new CustomerModel();
