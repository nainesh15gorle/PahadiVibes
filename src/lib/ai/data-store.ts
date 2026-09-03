// src/lib/ai/data-store.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface DataStoreRecord {
  id: string;
  [key: string]: any;
}

const STORE_FILE_PATH = path.resolve(process.cwd(), ".pahadi_ai_store.json");

/**
 * Resilient In-Memory & File-Persisted Data Store for Pahadi AI
 *
 * Provides a resilient PostgREST-like query engine when remote database tables
 * (such as revenue_events, recovery_cases, agent_actions) are not yet provisioned in Postgres.
 */
class PahadiAiDataStore {
  private tables: {
    revenue_events: Map<string, DataStoreRecord>;
    recovery_cases: Map<string, DataStoreRecord>;
    agent_actions: Map<string, DataStoreRecord>;
  };
  private isLoaded = false;

  constructor() {
    this.tables = {
      revenue_events: new Map(),
      recovery_cases: new Map(),
      agent_actions: new Map()
    };
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (this.isLoaded) return;
    try {
      if (fs.existsSync(STORE_FILE_PATH)) {
        const raw = fs.readFileSync(STORE_FILE_PATH, "utf8");
        const data = JSON.parse(raw);
        if (data.revenue_events) {
          for (const item of data.revenue_events) {
            this.tables.revenue_events.set(item.id, item);
          }
        }
        if (data.recovery_cases) {
          for (const item of data.recovery_cases) {
            this.tables.recovery_cases.set(item.id, item);
          }
        }
        if (data.agent_actions) {
          for (const item of data.agent_actions) {
            this.tables.agent_actions.set(item.id, item);
          }
        }
      }
    } catch {
      // Ignore disk load errors in constrained environments
    } finally {
      this.isLoaded = true;
    }
  }

  public saveToDisk(): void {
    try {
      const serializable = {
        revenue_events: Array.from(this.tables.revenue_events.values()),
        recovery_cases: Array.from(this.tables.recovery_cases.values()),
        agent_actions: Array.from(this.tables.agent_actions.values())
      };
      fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(serializable, null, 2), "utf8");
    } catch {
      // Ignore disk write errors if read-only filesystem
    }
  }

  public getTableMap(tableName: "revenue_events" | "recovery_cases" | "agent_actions") {
    this.loadFromDisk();
    return this.tables[tableName];
  }

  public clearTable(tableName: "revenue_events" | "recovery_cases" | "agent_actions") {
    this.tables[tableName].clear();
    this.saveToDisk();
  }

  public clearAll() {
    this.tables.revenue_events.clear();
    this.tables.recovery_cases.clear();
    this.tables.agent_actions.clear();
    this.saveToDisk();
  }
}

export const aiDataStore = new PahadiAiDataStore();

/**
 * Creates a PostgREST-compatible chainable query builder around the fallback data store
 */
export function createFallbackQueryBuilder(
  tableName: "revenue_events" | "recovery_cases" | "agent_actions"
) {
  let selectedFields: string | null = null;
  let filters: Array<(record: DataStoreRecord) => boolean> = [];
  let sortColumn: string | null = null;
  let sortAscending = true;
  let limitCount: number | null = null;
  let isSingle = false;
  let isMaybeSingle = false;
  let pendingInsert: any = null;
  let pendingUpdate: any = null;
  let pendingDelete = false;

  const builder: any = {
    select(fields?: string) {
      selectedFields = fields || "*";
      return builder;
    },

    insert(values: any | any[]) {
      pendingInsert = values;
      return builder;
    },

    update(values: any) {
      pendingUpdate = values;
      return builder;
    },

    delete() {
      pendingDelete = true;
      return builder;
    },

    eq(column: string, value: any) {
      filters.push((r) => {
        const recVal = r[column];
        if (recVal === value) return true;
        if (value !== undefined && value !== null && String(recVal) === String(value)) return true;
        return false;
      });
      return builder;
    },

    or(filterExpr: string) {
      // Example: "id.eq.val,event_id.eq.val" or "case_id.eq.val,id.eq.val"
      const clauses = filterExpr.split(",").map((s) => s.trim());
      filters.push((record) => {
        return clauses.some((clause) => {
          const parts = clause.split(".eq.");
          if (parts.length === 2) {
            const [col, val] = parts;
            return record[col] === val || String(record[col]) === String(val);
          }
          return false;
        });
      });
      return builder;
    },

    in(column: string, values: any[]) {
      filters.push((r) => values.includes(r[column]) || values.map(String).includes(String(r[column])));
      return builder;
    },

    order(column: string, options?: { ascending?: boolean }) {
      sortColumn = column;
      sortAscending = options?.ascending ?? true;
      return builder;
    },

    limit(count: number) {
      limitCount = count;
      return builder;
    },

    single() {
      isSingle = true;
      return builder;
    },

    maybeSingle() {
      isMaybeSingle = true;
      return builder;
    },

    async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      try {
        const tableMap = aiDataStore.getTableMap(tableName);

        // 1. Handle Insert
        if (pendingInsert !== null) {
          const items = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
          const insertedItems: DataStoreRecord[] = [];

          for (const item of items) {
            const id = item.id || crypto.randomUUID();
            const now = new Date().toISOString();
            const record: DataStoreRecord = {
              id,
              created_at: now,
              updated_at: now,
              ...item
            };

            // Check if updating existing by id or unique order_id/event_id/case_id
            let existingKey: string | null = null;
            for (const [key, existing] of tableMap.entries()) {
              if (existing.id === id) {
                existingKey = key;
                break;
              }
              if (tableName === "revenue_events" && item.event_id && existing.event_id === item.event_id) {
                existingKey = key;
                break;
              }
              if (tableName === "recovery_cases" && item.order_id && existing.order_id === item.order_id) {
                existingKey = key;
                break;
              }
            }

            if (existingKey) {
              const updated = { ...tableMap.get(existingKey), ...record, updated_at: now };
              tableMap.set(existingKey, updated);
              insertedItems.push(updated);
            } else {
              tableMap.set(id, record);
              insertedItems.push(record);
            }
          }

          aiDataStore.saveToDisk();

          const result = Array.isArray(pendingInsert) ? insertedItems : insertedItems[0];
          const payload = isSingle || isMaybeSingle ? { data: result || null, error: null } : { data: insertedItems, error: null };
          return onfulfilled ? onfulfilled(payload) : payload;
        }

        // 2. Handle Delete
        if (pendingDelete) {
          const deleted: DataStoreRecord[] = [];
          for (const [id, record] of Array.from(tableMap.entries())) {
            if (filters.every((fn) => fn(record))) {
              deleted.push(record);
              tableMap.delete(id);
            }
          }
          aiDataStore.saveToDisk();
          const payload = { data: deleted, error: null };
          return onfulfilled ? onfulfilled(payload) : payload;
        }

        // 3. Handle Update
        if (pendingUpdate !== null) {
          const updatedRecords: DataStoreRecord[] = [];
          const now = new Date().toISOString();

          for (const [id, record] of tableMap.entries()) {
            if (filters.every((fn) => fn(record))) {
              const updated = {
                ...record,
                ...pendingUpdate,
                updated_at: now
              };
              tableMap.set(id, updated);
              updatedRecords.push(updated);
            }
          }

          aiDataStore.saveToDisk();

          const singleVal = updatedRecords.length > 0 ? updatedRecords[0] : null;
          const payload = isSingle || isMaybeSingle ? { data: singleVal, error: null } : { data: updatedRecords, error: null };
          return onfulfilled ? onfulfilled(payload) : payload;
        }

        // 4. Handle Query / Select
        let allRecords = Array.from(tableMap.values());

        // Apply filters
        for (const filterFn of filters) {
          allRecords = allRecords.filter(filterFn);
        }

        // Apply sorting
        if (sortColumn) {
          allRecords.sort((a, b) => {
            const valA = a[sortColumn!];
            const valB = b[sortColumn!];
            if (valA === valB) return 0;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            if (valA < valB) return sortAscending ? -1 : 1;
            return sortAscending ? 1 : -1;
          });
        }

        // Apply limit
        if (typeof limitCount === "number") {
          allRecords = allRecords.slice(0, limitCount);
        }

        // Project fields if specified
        if (selectedFields && selectedFields !== "*") {
          const fieldNames = selectedFields.split(",").map((f) => f.trim());
          allRecords = allRecords.map((rec) => {
            const projected: Record<string, any> = {};
            for (const f of fieldNames) {
              projected[f] = rec[f];
            }
            return projected as DataStoreRecord;
          });
        }

        if (isMaybeSingle) {
          const payload = { data: allRecords[0] || null, error: null };
          return onfulfilled ? onfulfilled(payload) : payload;
        }

        if (isSingle) {
          if (allRecords.length === 0) {
            const payload = { data: null, error: { message: "Row not found", code: "PGRST116" } };
            return onfulfilled ? onfulfilled(payload) : payload;
          }
          const payload = { data: allRecords[0], error: null };
          return onfulfilled ? onfulfilled(payload) : payload;
        }

        const payload = { data: allRecords, error: null };
        return onfulfilled ? onfulfilled(payload) : payload;
      } catch (err: any) {
        const errorPayload = { data: null, error: { message: err?.message || String(err) } };
        return onfulfilled ? onfulfilled(errorPayload) : errorPayload;
      }
    }
  };

  return builder;
}
