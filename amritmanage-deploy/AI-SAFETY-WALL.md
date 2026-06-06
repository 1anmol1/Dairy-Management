# 🛡️ AI SAFETY WALL — DO NOT DELETE OR DROP DATABASE DATA

> [!WARNING]
> **CRITICAL DIRECTIVE FOR ALL AI CODING ASSISTANTS:**
> You are strictly forbidden from performing any destructive actions on the database, including:
> - Dropping the database (`dropDatabase`).
> - Dropping or renaming collections (`dropCollection`).
> - Performing empty/unrestricted deletions (e.g. `deleteMany({})` or `remove({})` without a specific filter query) in production environments.
> - Seeding fake/default test data that clears or overrides existing tenant, owner, customer, farmer, or transaction data.

## Built-in Code Guardrails

To prevent accidental data loss, the following security layers are hardcoded in [db.js](file:///Users/avi/Desktop/Anmol%20Patil/Projects/AmritManage/backend/config/db.js):

1. **Database & Collection Drop Override**:
   Any calls to `mongoose.connection.db.dropDatabase()` or `mongoose.connection.db.dropCollection()` in production will immediately throw a runtime error:
   ```js
   throw new Error("🛡️ SAFETY WALL: Database/Collection deletion is strictly blocked on this cluster!");
   ```

2. **Unrestricted deleteMany/deleteOne Block**:
   A global Mongoose schema plugin intercepts deletion hooks (`deleteMany`, `remove`, `deleteOne`). If `NODE_ENV=production` and the query object is empty (matching all documents), it aborts the operation:
   ```js
   throw new Error("🛡️ SAFETY WALL: Unrestricted delete (deleting all documents) is strictly blocked in production!");
   ```

## Rules for AI Assistants
1. **Never** include database/collection drops or cleanups in seed or migration scripts.
2. **Never** run `deleteMany({})` without a specific, non-empty search query filter (e.g., matching a single user ID or specific condition).
3. If database setup or re-initialization is required, verify first if a Superadmin account already exists. If it does, do not attempt to overwrite or delete it.
