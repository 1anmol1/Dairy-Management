const SupabaseAdapter = require('./SupabaseAdapter');
class UserModel extends SupabaseAdapter {
  constructor() {
    super('User');
  }
}
module.exports = new UserModel();
