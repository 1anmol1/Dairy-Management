const mongoose = require('mongoose');

// 🛡️ AI SAFETY WALL: Prevent any unrestricted deleteMany or delete operations on all schemas in production
mongoose.plugin((schema) => {
  const safetyHook = function (next) {
    const query = this.getQuery ? this.getQuery() : {};
    if (process.env.NODE_ENV === 'production' && (!query || Object.keys(query).length === 0)) {
      return next(new Error('🛡️ SAFETY WALL: Unrestricted delete (deleting all documents) is strictly blocked in production!'));
    }
    next();
  };
  schema.pre('deleteMany', safetyHook);
  schema.pre('remove', safetyHook);
  schema.pre('deleteOne', safetyHook);
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Connection pool for concurrent users
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
    });

    // 🛡️ AI SAFETY WALL: Prevent dropping database or collections in production
    if (conn.connection && conn.connection.db) {
      conn.connection.db.dropDatabase = async () => {
        throw new Error('🛡️ SAFETY WALL: Database deletion is strictly blocked on this cluster!');
      };
      conn.connection.db.dropCollection = async (name) => {
        throw new Error(`🛡️ SAFETY WALL: Collection deletion (${name}) is strictly blocked on this cluster!`);
      };
    }

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
