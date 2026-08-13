/**
 * SupabaseAdapter — drop-in Mongoose-like interface over Supabase/PostgreSQL
 *
 * Key design decisions:
 * - find() returns a QueryBuilder that resolves to a PLAIN Array (no mutations)
 * - All chainable methods (sort, skip, limit, lean, populate, select) live on
 *   the QueryBuilder, not on the array itself
 * - Documents from findOne/findById get Mongoose instance methods attached to
 *   a separate object clone (no property pollution on plain data rows)
 */

const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

// ── Query Builder ──────────────────────────────────────────────────────────
class QueryBuilder {
  constructor(tableName, queryObj = {}) {
    this._tableName = tableName;
    this._queryObj  = queryObj;
    this._sortObj   = null;
    this._skipVal   = 0;
    this._limitVal  = null;
    this._adapter   = null; // set by SupabaseAdapter after creation
  }

  sort(s)  { this._sortObj  = s; return this; }
  skip(n)  { this._skipVal  = n; return this; }
  limit(n) { this._limitVal = n; return this; }
  lean()   { return this; }           // no-op: always returns plain objects
  select() { return this; }           // no-op: always selects *
  populate(){ return this; }          // no-op: no nested documents

  then(resolve, reject) {
    return this._execute().then(resolve, reject);
  }

  async _execute() {
    try {
      let q = supabase.from(this._tableName).select('*');
      q = _parseQuery(q, this._queryObj);

      if (this._sortObj) {
        for (const [col, dir] of Object.entries(this._sortObj)) {
          q = q.order(col, { ascending: dir !== -1 && dir !== 'desc' });
        }
      }

      if (this._limitVal !== null) {
        const start = this._skipVal || 0;
        q = q.range(start, start + this._limitVal - 1);
      } else if (this._skipVal) {
        // No limit set — just offset (rare but possible)
        q = q.range(this._skipVal, 999999);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Attach _id virtual to each row but keep them plain objects
      return (data || []).map(row => ({ ...row, _id: row.id }));
    } catch (err) {
      console.error(`[Adapter] find error on ${this._tableName}:`, err);
      return [];
    }
  }
}

// ── Query helpers ──────────────────────────────────────────────────────────
function _parseQuery(q, queryObj) {
  if (!queryObj) return q;
  for (const [key, value] of Object.entries(queryObj)) {
    if (value === undefined || value === null) continue;

    if (key === '$or' && Array.isArray(value)) {
      const orConditions = value.map(cond => {
        const k = Object.keys(cond)[0];
        const v = cond[k];
        if (typeof v === 'object' && v !== null && v.$regex !== undefined) {
          const val = String(v.$regex).replace('^','').replace('$','');
          return `${k}.ilike.%${val}%`;
        }
        return `${k}.eq.${v}`;
      }).join(',');
      if (orConditions) {
        q = q.or(orConditions);
      }
      continue;
    }

    const col = key === '_id' ? 'id' : key;

    if (typeof value === 'object' && !Array.isArray(value)) {
      if (value.$regex !== undefined) {
        q = q.ilike(col, `%${String(value.$regex).replace('^','').replace('$','')}%`);
      } else if (value.$gte !== undefined || value.$lte !== undefined) {
        if (value.$gte !== undefined) q = q.gte(col, value.$gte);
        if (value.$lte !== undefined) q = q.lte(col, value.$lte);
      } else if (value.$gt !== undefined)  q = q.gt(col, value.$gt);
      else if (value.$lt !== undefined)    q = q.lt(col, value.$lt);
      else if (value.$in  !== undefined) {
        if (Array.isArray(value.$in) && value.$in.length === 0) {
          q = q.is(col, null).not(col, 'is', null); // impossible condition
        } else {
          q = q.in(col, value.$in);
        }
      }
      else if (value.$nin !== undefined) {
        if (Array.isArray(value.$nin) && value.$nin.length > 0) {
          q = q.not(col, 'in', `(${value.$nin.join(',')})`);
        }
      }
      else if (value.$ne  !== undefined)   q = q.neq(col, value.$ne);
      // nested object (e.g. subscription.status) — skip silently
    } else {
      q = q.eq(col, value);
    }
  }
  return q;
}

// ── Main Adapter ────────────────────────────────────────────────────────────
class SupabaseAdapter {
  constructor(tableName) {
    this.tableName = tableName;
  }

  // ── find ─────────────────────────────────────────────────────────────────
  find(query = {}) {
    const qb = new QueryBuilder(this.tableName, query);
    qb._adapter = this;
    return qb;
  }

  // ── findOne ──────────────────────────────────────────────────────────────
  findOne(query = {}) {
    const self = this;
    const promise = (async () => {
      try {
        let q = supabase.from(self.tableName).select('*');
        q = _parseQuery(q, query);
        const { data, error } = await q.limit(1).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return self._attachMethods({ ...data, _id: data.id });
      } catch (err) {
        console.error(`[Adapter] findOne error on ${self.tableName}:`, err);
        return null;
      }
    })();
    // Chainable stubs on the promise itself (for .select().lean() etc.)
    promise.select   = () => promise;
    promise.lean     = () => promise;
    promise.populate = () => promise;
    promise.sort     = () => promise;
    return promise;
  }

  // ── findById ─────────────────────────────────────────────────────────────
  findById(id) {
    if (!id) {
      const p = Promise.resolve(null);
      p.select = p.lean = p.populate = p.sort = () => p;
      return p;
    }
    return this.findOne({ _id: id });
  }

  // ── create ───────────────────────────────────────────────────────────────
  async create(data) {
    try {
      const row = { ...data };
      if (row._id) { row.id = row._id; delete row._id; }

      if (this.tableName === 'User' && row.password && !row.password.startsWith('$2')) {
        row.password = await bcrypt.hash(row.password, 12);
      }

      const { data: res, error } = await supabase
        .from(this.tableName).insert(row).select().single();
      if (error) throw error;
      return this._attachMethods({ ...res, _id: res.id });
    } catch (err) {
      console.error(`[Adapter] create error on ${this.tableName}:`, err);
      throw err;
    }
  }

  // ── findByIdAndUpdate ────────────────────────────────────────────────────
  async findByIdAndUpdate(id, update, options = {}) {
    try {
      const patch = { ...(update.$set || update) };
      delete patch._id; delete patch.id;

      if (this.tableName === 'User' && patch.password && !patch.password.startsWith('$2')) {
        patch.password = await bcrypt.hash(patch.password, 12);
      }

      const { data, error } = await supabase
        .from(this.tableName).update(patch).eq('id', id).select().maybeSingle();
      if (error) throw error;
      return data ? this._attachMethods({ ...data, _id: data.id }) : null;
    } catch (err) {
      console.error(`[Adapter] findByIdAndUpdate error on ${this.tableName}:`, err);
      throw err;
    }
  }

  // ── findOneAndUpdate ─────────────────────────────────────────────────────
  async findOneAndUpdate(query, update, options = {}) {
    const doc = await this.findOne(query);
    if (!doc) return null;
    return this.findByIdAndUpdate(doc.id || doc._id, update, options);
  }

  // ── updateMany ───────────────────────────────────────────────────────────
  async updateMany(query, update) {
    try {
      const patch = { ...(update.$set || update) };
      delete patch._id; delete patch.id;
      let q = supabase.from(this.tableName).update(patch);
      q = _parseQuery(q, query);
      const { error } = await q;
      if (error) throw error;
      return { modifiedCount: 1 };
    } catch (err) {
      console.error(`[Adapter] updateMany error on ${this.tableName}:`, err);
      return { modifiedCount: 0 };
    }
  }

  // ── deleteOne ────────────────────────────────────────────────────────────
  async deleteOne(query) {
    try {
      let q = supabase.from(this.tableName).delete();
      q = _parseQuery(q, query);
      await q;
      return { deletedCount: 1 };
    } catch (err) {
      console.error(`[Adapter] deleteOne error on ${this.tableName}:`, err);
      return { deletedCount: 0 };
    }
  }

  // ── deleteMany ───────────────────────────────────────────────────────────
  async deleteMany(query) {
    try {
      let q = supabase.from(this.tableName).delete();
      q = _parseQuery(q, query);
      await q;
      return { deletedCount: 1 };
    } catch (err) {
      console.error(`[Adapter] deleteMany error on ${this.tableName}:`, err);
      return { deletedCount: 0 };
    }
  }

  // ── countDocuments ───────────────────────────────────────────────────────
  async countDocuments(query = {}) {
    try {
      let q = supabase.from(this.tableName).select('*', { count: 'exact', head: true });
      q = _parseQuery(q, query);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    } catch (err) {
      return 0;
    }
  }

  // ── distinct ─────────────────────────────────────────────────────────────
  async distinct(field, query = {}) {
    try {
      let q = supabase.from(this.tableName).select(field);
      q = _parseQuery(q, query);
      const { data, error } = await q;
      if (error) throw error;
      return [...new Set((data || []).map(r => r[field]).filter(Boolean))];
    } catch (err) {
      return [];
    }
  }

  // ── aggregate ─────────────────────────────────────────────────────────────
  async aggregate(pipeline) {
    try {
      const matchStage = pipeline.find(s => s.$match)?.$match || {};
      const groupStage = pipeline.find(s => s.$group)?.$group;

      // Fetch matching rows
      let q = supabase.from(this.tableName).select('*');
      q = _parseQuery(q, matchStage);
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];

      // If there's a $group with a $sum, do in-memory grouping
      if (groupStage) {
        const groupField = groupStage._id; // e.g. '$ownerId'
        const col = groupField ? groupField.replace('$', '') : null;
        const countMap = {};
        for (const row of rows) {
          const key = col ? String(row[col] || '') : '_all';
          countMap[key] = (countMap[key] || 0) + 1;
        }
        return Object.entries(countMap).map(([k, v]) => ({ _id: k, count: v }));
      }

      return rows;
    } catch (err) {
      console.error(`[Adapter] aggregate error on ${this.tableName}:`, err);
      return [];
    }
  }

  // ── _attachMethods (instance helpers) ────────────────────────────────────
  _attachMethods(data) {
    if (!data) return data;

    const self = this;

    data.save = async () => {
      const patch = { ...data };
      // Strip non-column helpers before saving
      ['save','comparePassword','select','lean','populate','toObject','toJSON','_id'].forEach(k => delete patch[k]);

      if (self.tableName === 'User' && patch.password && !patch.password.startsWith('$2')) {
        patch.password = await bcrypt.hash(patch.password, 12);
      }
      const { error } = await supabase.from(self.tableName).update(patch).eq('id', data.id);
      if (error) console.error(`[Adapter] save error on ${self.tableName}:`, error);
      return data;
    };

    if (this.tableName === 'User') {
      data.comparePassword = async function(candidate) {
        return bcrypt.compare(candidate, this.password);
      };
    }

    const _toPlain = () => {
      const obj = { ...data };
      ['save','comparePassword','select','lean','populate','toObject','toJSON'].forEach(k => delete obj[k]);
      return obj;
    };

    data.toObject = _toPlain;
    data.toJSON   = _toPlain;
    data.lean     = () => data;
    data.select   = () => data;
    data.populate = () => data;

    return data;
  }
}

module.exports = SupabaseAdapter;
