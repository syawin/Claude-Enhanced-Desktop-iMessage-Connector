/**
 * Phone format variation coverage.
 *
 * Validates that findHandleIds() resolves various phone number formats
 * to the same contact (Alice), exercising the multi-pattern LIKE matching
 * that is the connector's core value proposition over built-in tools.
 *
 * Seed data: handles 1 & 2 store "+15550001111" (iMessage + SMS),
 * handle 3 stores "alice@example.com". Phone-based lookups match
 * handles 1 & 2 only (4 messages in the 30-day window). Handle 3
 * (email) is not matched by phone patterns — that's correct behavior;
 * email handles require an email-based lookup.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../helpers/server.js';

describe('Phone format variations', () => {
  let server, cleanup;

  before(async () => ({ server, cleanup } = await makeServer()));
  after(() => cleanup());

  const FORMATS = [
    ['+15550001111',    'canonical E.164'],
    ['15550001111',     'no plus'],
    ['5550001111',      '10-digit, no country code'],
    ['(555) 000-1111',  'formatted with parens'],
    ['+1-555-000-1111', 'dashes'],
    ['555.000.1111',    'dots'],
  ];

  for (const [format, label] of FORMATS) {
    it(`resolves "${format}" (${label})`, async () => {
      const result = await server.readConversation(format, 20, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);

      assert.equal(parsed.type, 'individual',
        `expected type "individual" for format "${format}"`);
      // 4 messages: handles 1 & 2 matched (phone), handle 3 (email) not matched
      assert.equal(parsed.message_count, 4,
        `expected 4 messages for format "${format}", got ${parsed.message_count}`);
    });
  }
});
