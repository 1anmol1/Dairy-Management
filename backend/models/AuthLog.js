const SupabaseAdapter = require('./SupabaseAdapter');
class AuthLogModel extends SupabaseAdapter {
  constructor() {
    super('AuthLog');
  }
}
module.exports = new AuthLogModel();
