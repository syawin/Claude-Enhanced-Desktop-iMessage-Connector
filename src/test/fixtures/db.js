/**
 * Mock SQLite database fixture for integration tests.
 *
 * Creates a temporary file-backed SQLite database with the same schema as
 * ~/Library/Messages/chat.db, populated with deterministic seed data.
 * Apple timestamps are computed relative to Date.now() so they never age out.
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlinkSync } from 'node:fs';

const APPLE_EPOCH_OFFSET = 978307200; // seconds between 1970-01-01 and 2001-01-01

/** Convert a "days ago" offset into an Apple-epoch nanosecond timestamp. */
export function appleTimestamp(daysAgo = 0) {
  const nowUnixSecs = Math.floor(Date.now() / 1000);
  const appleSecs = nowUnixSecs - APPLE_EPOCH_OFFSET - (daysAgo * 86400);
  return appleSecs * 1_000_000_000;
}

/** A minimal attributedBody BLOB that extractTextFromAttributedBody() can decode. */
export function makeAttributedBody(text) {
  return Buffer.concat([
    Buffer.from([0x04, 0x0b, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d]), // typedstream header bytes
    Buffer.from(text),
  ]);
}

const SCHEMA = `
  CREATE TABLE handle (
    ROWID   INTEGER PRIMARY KEY,
    id      TEXT NOT NULL,
    service TEXT,
    country TEXT
  );

  CREATE TABLE message (
    ROWID          INTEGER PRIMARY KEY,
    text           TEXT,
    attributedBody BLOB,
    date           INTEGER,
    is_from_me     INTEGER DEFAULT 0,
    handle_id      INTEGER,
    service        TEXT
  );

  CREATE TABLE chat (
    ROWID           INTEGER PRIMARY KEY,
    display_name    TEXT,
    chat_identifier TEXT
  );

  CREATE TABLE chat_message_join (
    chat_id    INTEGER,
    message_id INTEGER
  );
`;

/**
 * Seed data covering all tool scenarios.
 *
 * Handles:
 *   1: +15550001111 (iMessage) — Alice Smith's iMessage handle
 *   2: +15550001111 (SMS)      — Alice Smith's SMS handle (multi-handle test)
 *   3: alice@example.com (iMessage) — Alice Smith's email handle
 *   4: +15559999999 (iMessage) — Bob Jones (no messages — empty result test)
 *   5: +15552223333 (iMessage) — Carol White (group participant)
 *   6: +15553334444 (iMessage) — Dave Brown (group participant)
 *
 * Messages (individual — Alice):
 *   1: Received from handle 1, 2 days ago — "Hey, how are you?"
 *   2: Sent to handle 1, 2 days ago — "I'm doing great, thanks!"
 *   3: Received from handle 2 (SMS), 5 days ago — "I hate waiting in line"
 *   4: Received from handle 1, 10 days ago — "Let's meet tomorrow"
 *   5: Received from handle 3 (email), 3 days ago — only attributedBody, no text
 *   6: Received from handle 1, 100 days ago — "Old message outside default range"
 *
 * Chat (group):
 *   ROWID 42: "Work Team" group with chat_identifier "chat123456"
 *
 * Group messages:
 *   7: From handle 5 (Carol), 1 day ago — "Meeting at 3pm"
 *   8: From handle 6 (Dave), 1 day ago — "Sounds good"
 *   9: Sent by user, 1 day ago — "I'll be there"
 *
 * Chat without display_name:
 *   ROWID 99: no display_name, chat_identifier "chat999"
 *
 * Group message for chat 99:
 *  10: From handle 5, 2 days ago — "Hello from unnamed group"
 */
async function seedData(db) {
  // Handles
  await db.run(`INSERT INTO handle VALUES (1, '+15550001111', 'iMessage', 'us')`);
  await db.run(`INSERT INTO handle VALUES (2, '+15550001111', 'SMS', 'us')`);
  await db.run(`INSERT INTO handle VALUES (3, 'alice@example.com', 'iMessage', NULL)`);
  await db.run(`INSERT INTO handle VALUES (4, '+15559999999', 'iMessage', 'us')`);
  await db.run(`INSERT INTO handle VALUES (5, '+15552223333', 'iMessage', 'us')`);
  await db.run(`INSERT INTO handle VALUES (6, '+15553334444', 'iMessage', 'us')`);

  // Individual messages (Alice)
  await db.run(`INSERT INTO message VALUES (1, 'Hey, how are you?', NULL, ?, 0, 1, 'iMessage')`,
    [appleTimestamp(2)]);
  await db.run(`INSERT INTO message VALUES (2, ?, NULL, ?, 1, 1, 'iMessage')`,
    ["I'm doing great, thanks!", appleTimestamp(2) + 60_000_000_000]); // 1 minute later
  await db.run(`INSERT INTO message VALUES (3, 'I hate waiting in line', NULL, ?, 0, 2, 'SMS')`,
    [appleTimestamp(5)]);
  await db.run(`INSERT INTO message VALUES (4, ?, NULL, ?, 0, 1, 'iMessage')`,
    ["Let's meet tomorrow", appleTimestamp(10)]);
  await db.run(`INSERT INTO message VALUES (5, NULL, ?, ?, 0, 3, 'iMessage')`,
    [makeAttributedBody('Email message via attributedBody'), appleTimestamp(3)]);
  await db.run(`INSERT INTO message VALUES (6, 'Old message outside default range', NULL, ?, 0, 1, 'iMessage')`,
    [appleTimestamp(100)]);

  // Group chats
  await db.run(`INSERT INTO chat VALUES (42, 'Work Team', 'chat123456')`);
  await db.run(`INSERT INTO chat VALUES (99, NULL, 'chat999')`);

  // Group messages
  await db.run(`INSERT INTO message VALUES (7, 'Meeting at 3pm', NULL, ?, 0, 5, 'iMessage')`,
    [appleTimestamp(1)]);
  await db.run(`INSERT INTO message VALUES (8, 'Sounds good', NULL, ?, 0, 6, 'iMessage')`,
    [appleTimestamp(1) + 30_000_000_000]);
  await db.run(`INSERT INTO message VALUES (9, ?, NULL, ?, 1, NULL, 'iMessage')`,
    ["I'll be there", appleTimestamp(1) + 60_000_000_000]);

  // Chat-message joins for group 42
  await db.run(`INSERT INTO chat_message_join VALUES (42, 7)`);
  await db.run(`INSERT INTO chat_message_join VALUES (42, 8)`);
  await db.run(`INSERT INTO chat_message_join VALUES (42, 9)`);

  // Chat-message join for unnamed group 99
  await db.run(`INSERT INTO message VALUES (10, 'Hello from unnamed group', NULL, ?, 0, 5, 'iMessage')`,
    [appleTimestamp(2)]);
  await db.run(`INSERT INTO chat_message_join VALUES (99, 10)`);
}

/**
 * Create a temporary SQLite database with the Messages schema and seed data.
 * @returns {{ filePath: string, cleanup: () => void }}
 */
export async function createTestDb() {
  const filePath = join(tmpdir(), `imessage-test-${randomUUID()}.db`);

  const db = await open({
    filename: filePath,
    driver: sqlite3.Database,
  });

  await db.exec(SCHEMA);
  await seedData(db);
  await db.close();

  return {
    filePath,
    cleanup() {
      try { unlinkSync(filePath); } catch { /* already deleted */ }
    },
  };
}
