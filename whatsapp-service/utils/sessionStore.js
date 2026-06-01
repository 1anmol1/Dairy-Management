const sessionMap = new Map();

module.exports = {
  sessionMap,
  getSession(phone) {
    return sessionMap.get(phone);
  },
  setSession(phone, data) {
    const existing = sessionMap.get(phone) || {};
    sessionMap.set(phone, { ...existing, ...data });
  },
  deleteSession(phone) {
    sessionMap.delete(phone);
  },
  getAllSessions() {
    const result = [];
    for (const [phone, info] of sessionMap.entries()) {
      result.push({
        phone,
        status: info.status || 'disconnected',
        lastSeen: info.lastSeen || new Date().toISOString()
      });
    }
    return result;
  }
};
