import * as SQLite from "expo-sqlite";

/** Default community for new meters and meter readings (change one place to retarget the app). */
export const DEFAULT_COMMUNITY_ID = 2;
let activeCommunityId = DEFAULT_COMMUNITY_ID;

/** Active community used by app screens after login. */
export function getActiveCommunityId(): number {
  return activeCommunityId;
}

export function setActiveCommunityId(communityId: number): void {
  if (Number.isFinite(communityId) && communityId > 0) {
    activeCommunityId = Math.trunc(communityId);
  }
}

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
    PRAGMA foreign_keys = ON;
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
      COMMUNITY_ID INTEGER NOT NULL DEFAULT ${DEFAULT_COMMUNITY_ID},
      CURRENT_READING REAL NOT NULL,
      WATER_USED REAL NOT NULL DEFAULT 0,
      PRICE REAL NOT NULL DEFAULT 0,
      DATE_LAST_READ TEXT,
      DATE_CURRENT TEXT NOT NULL,
      LAST_READING REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (METER_ID) REFERENCES METERS(METER_ID),
      FOREIGN KEY (COMMUNITY_ID) REFERENCES COMMUNITY(COMMUNITY_ID)
    );
  `);
  await database.runAsync(
    "INSERT OR IGNORE INTO COMMUNITY (COMMUNITY_ID, PRICE_RATE) VALUES (2, 0.01)",
  );
  await migrateMeterReadingsAddCommunityId(database);
}

/** Existing DBs: add COMMUNITY_ID column (defaults to 2). */
async function migrateMeterReadingsAddCommunityId(
  database: SQLite.SQLiteDatabase,
) {
  const cols = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(METER_READINGS)",
  );
  const hasCommunity = (cols ?? []).some((c) => c.name === "COMMUNITY_ID");
  if (!hasCommunity) {
    await database.execAsync(
      `ALTER TABLE METER_READINGS ADD COLUMN COMMUNITY_ID INTEGER NOT NULL DEFAULT ${DEFAULT_COMMUNITY_ID};`,
    );
  }
}

/** Delete all data and re-seed default community. Use for dev/reset. */
export async function clearAllData(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    DELETE FROM METER_READINGS;
    DELETE FROM METERS;
    DELETE FROM COMMUNITY;
    INSERT OR IGNORE INTO COMMUNITY (COMMUNITY_ID, PRICE_RATE) VALUES (${activeCommunityId}, 0.01);
  `);
}

/** Latest reading for this meter within a community (aligns with submit + Meters tab). */
export async function getLastReadingForMeter(
  meterId: number,
  communityId: number,
): Promise<{ CURRENT_READING: number; DATE_CURRENT: string } | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{
    CURRENT_READING: number;
    DATE_CURRENT: string;
  }>(
    "SELECT CURRENT_READING, DATE_CURRENT FROM METER_READINGS WHERE METER_ID = ? AND COMMUNITY_ID = ? ORDER BY DATE_CURRENT DESC LIMIT 1",
    [meterId, communityId],
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

export type CommunityInfoRow = {
  COMMUNITY_ID: number;
  PRICE_RATE: number;
};

export async function getCommunityInfo(
  communityId: number,
): Promise<CommunityInfoRow | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<CommunityInfoRow>(
    "SELECT COMMUNITY_ID, PRICE_RATE FROM COMMUNITY WHERE COMMUNITY_ID = ? LIMIT 1",
    [communityId],
  );
  return row ?? null;
}

export type MeterReadingPayload = {
  METER_ID: number;
  COMMUNITY_ID: number;
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
    `INSERT INTO METER_READINGS (METER_ID, COMMUNITY_ID, CURRENT_READING, WATER_USED, PRICE, DATE_LAST_READ, DATE_CURRENT, LAST_READING)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.METER_ID,
      payload.COMMUNITY_ID,
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

/** Ensures a COMMUNITY row exists so meters FK and Supabase backup order stay valid. */
export async function ensureCommunityExists(
  communityId: number,
  priceRate: number = 0,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "INSERT OR IGNORE INTO COMMUNITY (COMMUNITY_ID, PRICE_RATE) VALUES (?, ?)",
    [communityId, priceRate],
  );
}

/**
 * True if this meter is registered in **METERS** for the given community.
 * Matches what the Meters tab shows (`getMetersByCommunity`), not orphan rows in METER_READINGS.
 */
export async function meterExistsInCommunity(
  meterId: number,
  communityId: number,
): Promise<boolean> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ one: number }>(
    "SELECT 1 AS one FROM METERS WHERE METER_ID = ? AND COMMUNITY_ID = ? LIMIT 1",
    [meterId, communityId],
  );
  return row != null;
}

/**
 * Insert or update the meter for this community.
 * Uses UPSERT so a duplicate METER_ID (e.g. old row in another community) is updated
 * instead of ignored — `INSERT OR IGNORE` would leave the row invisible on the Meters tab.
 */
export async function ensureMeterExists(
  meterId: number,
  communityId: number,
  householdName?: string,
): Promise<void> {
  const database = await getDb();
  await ensureCommunityExists(communityId);
  const name = householdName ?? `Meter ${meterId}`;
  await database.runAsync(
    `INSERT INTO METERS (METER_ID, COMMUNITY_ID, HOUSEHOLD_NAME, ACTIVE)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(METER_ID) DO UPDATE SET
       COMMUNITY_ID = excluded.COMMUNITY_ID,
       HOUSEHOLD_NAME = excluded.HOUSEHOLD_NAME,
       ACTIVE = excluded.ACTIVE`,
    [meterId, communityId, name],
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
  COMMUNITY_ID: number;
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
    "SELECT id, METER_ID, COMMUNITY_ID, CURRENT_READING, WATER_USED, PRICE, DATE_LAST_READ, DATE_CURRENT, LAST_READING FROM METER_READINGS ORDER BY DATE_CURRENT ASC",
  );
  return rows ?? [];
}

// --- For Supabase backup (full table dumps) ---

export type CommunityRow = {
  COMMUNITY_ID: number;
  PRICE_RATE: number;
};

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
    "SELECT id, METER_ID, COMMUNITY_ID, CURRENT_READING, WATER_USED, PRICE, DATE_LAST_READ, DATE_CURRENT, LAST_READING FROM METER_READINGS ORDER BY id",
  );
  return rows ?? [];
}

/**
 * Replace local rows for one community with a snapshot pulled from Supabase.
 * Keeps other communities untouched.
 */
export async function replaceLocalCommunitySnapshot(
  community: CommunityRow,
  meters: MeterRow[],
  readings: MeterReadingRow[],
): Promise<void> {
  const database = await getDb();

  await database.runAsync(
    `INSERT INTO COMMUNITY (COMMUNITY_ID, PRICE_RATE)
     VALUES (?, ?)
     ON CONFLICT(COMMUNITY_ID) DO UPDATE SET PRICE_RATE = excluded.PRICE_RATE`,
    [community.COMMUNITY_ID, community.PRICE_RATE],
  );

  // Remove readings that belong to meters currently assigned to this community.
  // This avoids FK failures when legacy rows have mismatched COMMUNITY_ID values.
  await database.runAsync(
    `DELETE FROM METER_READINGS
     WHERE METER_ID IN (SELECT METER_ID FROM METERS WHERE COMMUNITY_ID = ?)`,
    [community.COMMUNITY_ID],
  );
  await database.runAsync("DELETE FROM METERS WHERE COMMUNITY_ID = ?", [
    community.COMMUNITY_ID,
  ]);

  for (const meter of meters) {
    await database.runAsync(
      `INSERT INTO METERS (METER_ID, HOUSEHOLD_NAME, COMMUNITY_ID, ACTIVE, LAST_READ_DATE, LATEST_READING)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(METER_ID) DO UPDATE SET
         HOUSEHOLD_NAME = excluded.HOUSEHOLD_NAME,
         COMMUNITY_ID = excluded.COMMUNITY_ID,
         ACTIVE = excluded.ACTIVE,
         LAST_READ_DATE = excluded.LAST_READ_DATE,
         LATEST_READING = excluded.LATEST_READING`,
      [
        meter.METER_ID,
        meter.HOUSEHOLD_NAME,
        meter.COMMUNITY_ID,
        meter.ACTIVE,
        meter.LAST_READ_DATE,
        meter.LATEST_READING,
      ],
    );
  }

  const validMeterIds = new Set(meters.map((m) => m.METER_ID));
  const safeReadings = readings.filter(
    (row) =>
      row.COMMUNITY_ID === community.COMMUNITY_ID &&
      validMeterIds.has(row.METER_ID),
  );

  for (const row of safeReadings) {
    await database.runAsync(
      `INSERT INTO METER_READINGS (id, METER_ID, COMMUNITY_ID, CURRENT_READING, WATER_USED, PRICE, DATE_LAST_READ, DATE_CURRENT, LAST_READING)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         METER_ID = excluded.METER_ID,
         COMMUNITY_ID = excluded.COMMUNITY_ID,
         CURRENT_READING = excluded.CURRENT_READING,
         WATER_USED = excluded.WATER_USED,
         PRICE = excluded.PRICE,
         DATE_LAST_READ = excluded.DATE_LAST_READ,
         DATE_CURRENT = excluded.DATE_CURRENT,
         LAST_READING = excluded.LAST_READING`,
      [
        row.id,
        row.METER_ID,
        row.COMMUNITY_ID,
        row.CURRENT_READING,
        row.WATER_USED,
        row.PRICE,
        row.DATE_LAST_READ,
        row.DATE_CURRENT,
        row.LAST_READING,
      ],
    );
  }
}
