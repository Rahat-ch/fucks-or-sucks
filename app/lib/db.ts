import Database from 'better-sqlite3';
import path from 'path';

// Database file location - will be in /data for Coolify persistent volume
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'game.db');

let db: Database.Database | null = null;

// Initialize database connection
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better performance for concurrent reads/writes
    initializeTables();
  }
  return db;
}

// Create tables if they don't exist
function initializeTables() {
  if (!db) return;

  // Game state table - stores pause status and winner info
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      is_paused INTEGER NOT NULL DEFAULT 0,
      winner_name TEXT,
      winner_score INTEGER,
      loser_score INTEGER,
      declared_at INTEGER,
      updated_at INTEGER NOT NULL
    )
  `);

  // Migration: Add winner columns if they don't exist (for existing databases)
  const columns = db.prepare("PRAGMA table_info(game_state)").all() as Array<{ name: string }>;
  const columnNames = columns.map((col) => col.name);

  if (!columnNames.includes('winner_name')) {
    db.exec(`ALTER TABLE game_state ADD COLUMN winner_name TEXT`);
  }
  if (!columnNames.includes('winner_score')) {
    db.exec(`ALTER TABLE game_state ADD COLUMN winner_score INTEGER`);
  }
  if (!columnNames.includes('loser_score')) {
    db.exec(`ALTER TABLE game_state ADD COLUMN loser_score INTEGER`);
  }
  if (!columnNames.includes('declared_at')) {
    db.exec(`ALTER TABLE game_state ADD COLUMN declared_at INTEGER`);
  }

  // Vote cache table - stores latest vote counts from blockchain
  db.exec(`
    CREATE TABLE IF NOT EXISTS vote_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shayan_fucks INTEGER NOT NULL DEFAULT 0,
      shayan_sucks INTEGER NOT NULL DEFAULT 0,
      dhai_fucks INTEGER NOT NULL DEFAULT 0,
      dhai_sucks INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `);

  // Initialize game state if not exists
  const gameState = db.prepare('SELECT id FROM game_state WHERE id = 1').get();
  if (!gameState) {
    db.prepare('INSERT INTO game_state (id, is_paused, updated_at) VALUES (1, 0, ?)').run(
      Date.now()
    );
  }

  // Initialize vote cache if not exists
  const voteCache = db.prepare('SELECT id FROM vote_cache WHERE id = 1').get();
  if (!voteCache) {
    db.prepare(
      'INSERT INTO vote_cache (id, shayan_fucks, shayan_sucks, dhai_fucks, dhai_sucks, updated_at) VALUES (1, 0, 0, 0, 0, ?)'
    ).run(Date.now());
  }
}

// Game state operations
export interface WinnerInfo {
  name: string;
  score: number;
  loserScore: number;
  declaredAt: number;
}

export interface GameState {
  isPaused: boolean;
  winner: WinnerInfo | null;
  updatedAt: number;
}

export function getGameState(): GameState {
  const db = getDb();
  const row = db
    .prepare('SELECT is_paused, winner_name, winner_score, loser_score, declared_at, updated_at FROM game_state WHERE id = 1')
    .get() as {
    is_paused: number;
    winner_name: string | null;
    winner_score: number | null;
    loser_score: number | null;
    declared_at: number | null;
    updated_at: number;
  };

  return {
    isPaused: row.is_paused === 1,
    winner: row.winner_name
      ? {
          name: row.winner_name,
          score: row.winner_score!,
          loserScore: row.loser_score!,
          declaredAt: row.declared_at!,
        }
      : null,
    updatedAt: row.updated_at,
  };
}

export function setGamePaused(isPaused: boolean): void {
  const db = getDb();
  db.prepare('UPDATE game_state SET is_paused = ?, updated_at = ? WHERE id = 1').run(
    isPaused ? 1 : 0,
    Date.now()
  );
}

export function declareWinner(winner: WinnerInfo): void {
  const db = getDb();
  db.prepare(
    'UPDATE game_state SET is_paused = 1, winner_name = ?, winner_score = ?, loser_score = ?, declared_at = ?, updated_at = ? WHERE id = 1'
  ).run(winner.name, winner.score, winner.loserScore, winner.declaredAt, Date.now());
}

export function clearWinner(): void {
  const db = getDb();
  db.prepare(
    'UPDATE game_state SET is_paused = 0, winner_name = NULL, winner_score = NULL, loser_score = NULL, declared_at = NULL, updated_at = ? WHERE id = 1'
  ).run(Date.now());
}

// Vote cache operations
export function getVoteCache(): {
  shayan_fucks: number;
  shayan_sucks: number;
  dhai_fucks: number;
  dhai_sucks: number;
  updatedAt: number;
} {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT shayan_fucks, shayan_sucks, dhai_fucks, dhai_sucks, updated_at FROM vote_cache WHERE id = 1'
    )
    .get() as {
    shayan_fucks: number;
    shayan_sucks: number;
    dhai_fucks: number;
    dhai_sucks: number;
    updated_at: number;
  };

  return {
    shayan_fucks: row.shayan_fucks,
    shayan_sucks: row.shayan_sucks,
    dhai_fucks: row.dhai_fucks,
    dhai_sucks: row.dhai_sucks,
    updatedAt: row.updated_at,
  };
}

export function updateVoteCache(votes: {
  shayan_fucks: number;
  shayan_sucks: number;
  dhai_fucks: number;
  dhai_sucks: number;
}): void {
  const db = getDb();
  db.prepare(
    'UPDATE vote_cache SET shayan_fucks = ?, shayan_sucks = ?, dhai_fucks = ?, dhai_sucks = ?, updated_at = ? WHERE id = 1'
  ).run(votes.shayan_fucks, votes.shayan_sucks, votes.dhai_fucks, votes.dhai_sucks, Date.now());
}

// Close database connection (for cleanup)
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
