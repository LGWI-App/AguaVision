import * as SQLite from "expo-sqlite";

const DB_NAME = "aguavision.db";
let db: SQLite.SQLiteDatabase | null = null;

export function getDatabasePath(): string | null {
  try {
    const dir = SQLite.defaultDatabaseDirectory;
    if (dir == null) return null;
    return `${String(dir).replace(/\/*$/, "")}/${DB_NAME.replace(/^\/+/, "")}`;
  } catch {
    return null;
  }
}

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(db);
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS COMMUNITY (
      COMMUNITY_ID INTEGER PRIMARY KEY,
      PRICE_RATE REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS METERS (
      METER_ID INTEGER PRIMARY KEY,
      HOUSEHOLD_NAME TEXT,
      COMMUNITY_ID INTEGER NOT NULL,
      ACTIVE INTEGER NOT NULL DEFAULT 1,
      LAST_READ_DATE TEXT,
      LATEST_READING REAL,
      FOREIGN KEY (COMMUNITY_ID) REFERENCES COMMUNITY(COMMUNITY_ID)
    );
    CREATE TABLE IF NOT EXISTS METER_READINGS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      METER_ID INTEGER NOT NULL,
      CURRENT_READING REAL NOT NULL,
      WATER_USED REAL NOT NULL DEFAULT 0,
      PRICE REAL NOT NULL DEFAULT 0,
      DATE_LAST_READ TEXT,
      DATE_CURRENT TEXT NOT NULL,
      LAST_READING REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (METER_ID) REFERENCES METERS(METER_ID)
    );
  `);
  await database.runAsync(
    "INSERT OR IGNORE INTO COMMUNITY (COMMUNITY_ID, PRICE_RATE) VALUES (2, 0.01)",
  );
}

/** Delete all data and re-seed default community. Use for dev/reset. */
export async function clearAllData(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    DELETE FROM METER_READINGS;
    DELETE FROM METERS;
    DELETE FROM COMMUNITY;
    INSERT OR IGNORE INTO COMMUNITY (COMMUNITY_ID, PRICE_RATE) VALUES (2, 0.01);
  `);
}

export async function getLastReadingForMeter(
  meterId: number,
): Promise<{ CURRENT_READING: number; DATE_CURRENT: string } | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{
    CURRENT_READING: number;
    DATE_CURRENT: string;
  }>(
    "SELECT CURRENT_READING, DATE_CURRENT FROM METER_READINGS WHERE METER_ID = ? ORDER BY DATE_CURRENT DESC LIMIT 1",
    [meterId],
  );
  return row ?? null;
}

export async function getCommunityPriceRate(
  communityId: number,
): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ PRICE_RATE: number }>(
    "SELECT PRICE_RATE FROM COMMUNITY WHERE COMMUNITY_ID = ? LIMIT 1",
    [communityId],
  );
  return row ? Number(row.PRICE_RATE) : 0;
}

export type MeterReadingPayload = {
  METER_ID: number;
  CURRENT_READING: number;
  WATER_USED: number;
  PRICE: number;
  DATE_LAST_READ: string | null;
  DATE_CURRENT: string;
  LAST_READING: number;
};

export async function insertMeterReading(
  payload: MeterReadingPayload,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO METER_READINGS (METER_ID, CURRENT_READING, WATER_USED, PRICE, DATE_LAST_READ, DATE_CURRENT, LAST_READING)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.METER_ID,
      payload.CURRENT_READING,
      payload.WATER_USED,
      payload.PRICE,
      payload.DATE_LAST_READ,
      payload.DATE_CURRENT,
      payload.LAST_READING,
    ],
  );
}

export async function updateMeterLatestReading(
  meterId: number,
  latestReading: number,
  lastReadDate: string,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE METERS SET LATEST_READING = ?, LAST_READ_DATE = ? WHERE METER_ID = ?",
    [latestReading, lastReadDate, meterId],
  );
}

export async function ensureMeterExists(
  meterId: number,
  communityId: number,
  householdName?: string,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "INSERT OR IGNORE INTO METERS (METER_ID, COMMUNITY_ID, HOUSEHOLD_NAME, ACTIVE) VALUES (?, ?, ?, 1)",
    [meterId, communityId, householdName ?? `Meter ${meterId}`],
  );
}

/** Delete a meter and all its readings. */
export async function deleteMeter(meterId: number): Promise<void> {
  const database = await getDb();
  await database.runAsync("DELETE FROM METER_READINGS WHERE METER_ID = ?", [
    meterId,
  ]);
  await database.runAsync("DELETE FROM METERS WHERE METER_ID = ?", [meterId]);
}

export type MeterRow = {
  METER_ID: number;
  HOUSEHOLD_NAME: string | null;
  COMMUNITY_ID: number;
  ACTIVE: number;
  LAST_READ_DATE: string | null;
  LATEST_READING: number | null;
};

export async function getMetersByCommunity(
  communityId: number,
): Promise<MeterRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<MeterRow>(
    "SELECT * FROM METERS WHERE COMMUNITY_ID = ? ORDER BY METER_ID",
    [communityId],
  );
  return rows ?? [];
}

export type MeterReadingRow = {
  id: number;
  METER_ID: number;
  CURRENT_READING: number;
  WATER_USED: number;
  PRICE: number;
  DATE_LAST_READ: string | null;
  DATE_CURRENT: string;
  LAST_READING: number;
};

export async function getAllMeterReadingsOrderedByDate(): Promise<
  MeterReadingRow[]
> {
  const database = await getDb();
  const rows = await database.getAllAsync<MeterReadingRow>(
    "SELECT id, METER_ID, CURRENT_READING, WATER_USED, PRICE, DATE_LAST_READ, DATE_CURRENT, LAST_READING FROM METER_READINGS ORDER BY DATE_CURRENT ASC",
  );
  return rows ?? [];
}

// --- For Supabase backup (full table dumps) ---

export type CommunityRow = { COMMUNITY_ID: number; PRICE_RATE: number };

export async function getAllCommunities(): Promise<CommunityRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<CommunityRow>(
    "SELECT * FROM COMMUNITY",
  );
  return rows ?? [];
}

export async function getAllMeters(): Promise<MeterRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<MeterRow>(
    "SELECT * FROM METERS ORDER BY METER_ID",
  );
  return rows ?? [];
}

export async function getAllMeterReadings(): Promise<MeterReadingRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<MeterReadingRow>(
    "SELECT id, METER_ID, CURRENT_READING, WATER_USED, PRICE, DATE_LAST_READ, DATE_CURRENT, LAST_READING FROM METER_READINGS ORDER BY id",
  );
  return rows ?? [];
}
