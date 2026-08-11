const SupabaseAdapter = require('./SupabaseAdapter');
class SubscriptionRequestModel extends SupabaseAdapter {
  constructor() {
    super('SubscriptionRequest');
  }
}
module.exports = new SubscriptionRequestModel();
