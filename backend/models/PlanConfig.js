const SupabaseAdapter = require('./SupabaseAdapter');
class PlanConfigModel extends SupabaseAdapter {
  constructor() {
    super('PlanConfig');
  }
}
module.exports = new PlanConfigModel();
