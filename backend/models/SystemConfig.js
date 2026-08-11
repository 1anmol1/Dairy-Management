const SupabaseAdapter = require('./SupabaseAdapter');
class SystemConfigModel extends SupabaseAdapter {
  constructor() {
    super('SystemConfig');
  }
}
module.exports = new SystemConfigModel();
