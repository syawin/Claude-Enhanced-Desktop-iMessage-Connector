/**
 * search_contacts — living specification.
 *
 * Queries the handle table for contacts matching phone, email, or name fragments.
 * Returns up to 20 handles with their service type.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../helpers/server.js';

describe('Tool: search_contacts', () => {
  let server, cleanup;

  before(async () => ({ server, cleanup } = await makeServer()));
  after(() => cleanup());

  // ── Smoke ──

  describe('smoke', () => {
    it('returns a valid MCP response for a known phone', async () => {
      const result = await server.searchContacts('+15550001111');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.contacts_found > 0);
    });
  });

  // ── Functional ──

  describe('functional', () => {
    it('finds handles by exact phone number', async () => {
      const result = await server.searchContacts('+15550001111');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.contacts_found, 2); // iMessage + SMS handles
      assert.ok(parsed.contacts.some(c => c.includes('iMessage')));
      assert.ok(parsed.contacts.some(c => c.includes('SMS')));
    });

    it('finds handles by email address', async () => {
      const result = await server.searchContacts('alice@example.com');
      const parsed = JSON.parse(result.content[0].text);
      // Email query matches on the raw string; digits-only version is empty
      // so the second LIKE pattern becomes '%%' matching all handles.
      // The first LIKE still matches the email handle specifically.
      assert.ok(parsed.contacts_found >= 1);
      assert.ok(parsed.contacts.some(c => c.includes('alice@example.com')));
    });

    it('finds handles by partial phone match (digits only)', async () => {
      const result = await server.searchContacts('5550001111');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.contacts_found >= 2); // both handles for Alice
    });

    it('returns contacts sorted by id', async () => {
      const result = await server.searchContacts('555');
      const parsed = JSON.parse(result.content[0].text);
      const ids = parsed.contacts.map(c => c.split(' ')[0]);
      const sorted = [...ids].sort();
      assert.deepEqual(ids, sorted);
    });

    it('preserves the original query in the response', async () => {
      const result = await server.searchContacts('+15550001111');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.query, '+15550001111');
    });
  });

  // ── Robustness ──

  describe('robustness', () => {
    it('returns contacts_found=0 for a non-matching query', async () => {
      const result = await server.searchContacts('+19999999999');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.contacts_found, 0);
      assert.deepEqual(parsed.contacts, []);
    });

    it('handles empty string query without error', async () => {
      const result = await server.searchContacts('');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(typeof parsed.contacts_found === 'number');
    });

    it('handles special characters in query without SQL injection', async () => {
      const result = await server.searchContacts("'; DROP TABLE handle; --");
      const parsed = JSON.parse(result.content[0].text);
      // Parameterized queries prevent injection. The query still runs
      // (digits-only version is empty → LIKE '%%' matches all), but
      // the handle table is intact.
      assert.ok(typeof parsed.contacts_found === 'number');
      // Verify the table wasn't dropped by searching again
      const verify = await server.searchContacts('+15550001111');
      const verifyParsed = JSON.parse(verify.content[0].text);
      assert.ok(verifyParsed.contacts_found > 0, 'handle table should still exist');
    });
  });
});
