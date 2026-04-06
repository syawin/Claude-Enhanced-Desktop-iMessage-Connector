/**
 * Test server factory.
 *
 * Creates a fully wired iMessageMCPServer with mock DB and injected contacts.
 * Each call returns a fresh instance for test isolation.
 */

import { iMessageMCPServer } from '../../index.js';
import { createTestDb } from '../fixtures/db.js';
import { injectTestContacts } from '../fixtures/contacts.js';

/**
 * Create a test server wired to a mock database with injected contacts.
 * @returns {{ server: iMessageMCPServer, cleanup: () => void }}
 */
export async function makeServer() {
  const testDb = await createTestDb();
  const server = new iMessageMCPServer(testDb.filePath);
  injectTestContacts(server);

  return {
    server,
    cleanup: testDb.cleanup,
  };
}
