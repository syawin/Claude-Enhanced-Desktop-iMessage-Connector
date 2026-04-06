/**
 * get_conversation_stats — living specification.
 *
 * Returns aggregate statistics for a conversation: message counts,
 * date range, and per-participant breakdown for groups.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../helpers/server.js';

describe('Tool: get_conversation_stats', () => {
  let server, cleanup;

  before(async () => ({ server, cleanup } = await makeServer()));
  after(() => cleanup());

  // ── Smoke ──

  describe('smoke', () => {
    it('returns stats for a known contact', async () => {
      const result = await server.getConversationStatsEnhanced('+15550001111', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.stats || parsed.participants);
    });
  });

  // ── Functional ──

  describe('functional', () => {
    it('individual stats include sent and received counts', async () => {
      const result = await server.getConversationStatsEnhanced('+15550001111', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'individual');
      // Phone-based lookup resolves handles 1 and 2 (+15550001111 iMessage/SMS).
      // Handle 3 (alice@example.com) is NOT resolved via phone lookup.
      // Messages 1 (received, h1), 2 (sent, h1), 3 (received, h2), 4 (received, h1) = 4 total.
      // The stats query has no text IS NOT NULL filter, but message 5 (handle 3) is excluded
      // because handle 3 is not in the resolved set. Message 6 is outside 30-day range.
      assert.equal(parsed.stats.total_messages, 4);
      assert.equal(parsed.stats.received_messages, 3);
      assert.equal(parsed.stats.sent_messages, 1);
    });

    it('individual stats include first_message and last_message', async () => {
      const result = await server.getConversationStatsEnhanced('+15550001111', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.match(parsed.stats.first_message, /^\d{4}-\d{2}-\d{2}/);
      assert.match(parsed.stats.last_message, /^\d{4}-\d{2}-\d{2}/);
    });

    it('individual stats reflect multi-handle count', async () => {
      const result = await server.getConversationStatsEnhanced('+15550001111', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.handles >= 2, 'should have at least 2 handles (iMessage + SMS)');
    });

    it('individual stats include period_days', async () => {
      const result = await server.getConversationStatsEnhanced('+15550001111', 60);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.period_days, 60);
    });

    it('group stats include participant breakdown', async () => {
      const result = await server.getConversationStatsEnhanced('group:42', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'group');
      assert.ok(Array.isArray(parsed.participants));
      assert.ok(parsed.participants.length > 0);
    });

    it('group stats have per-participant message counts', async () => {
      const result = await server.getConversationStatsEnhanced('group:42', 30);
      const parsed = JSON.parse(result.content[0].text);
      for (const p of parsed.participants) {
        assert.ok(typeof p.messages === 'number');
        assert.ok(typeof p.sent_by_you === 'number');
      }
    });

    it('group stats include totals', async () => {
      const result = await server.getConversationStatsEnhanced('group:42', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.totals);
      assert.ok(typeof parsed.totals.total_messages === 'number');
      assert.ok(typeof parsed.totals.total_participants === 'number');
      assert.ok(parsed.totals.most_active);
    });

    it('group stats resolve participant names', async () => {
      const result = await server.getConversationStatsEnhanced('group:42', 30);
      const parsed = JSON.parse(result.content[0].text);
      const names = parsed.participants.map(p => p.participant);
      // Should have resolved names, not just phone numbers
      assert.ok(names.some(n => n === 'Carol White' || n === 'Dave Brown' || n === 'You'));
    });

    // TODO: add a test that runs stats against group:99 (unnamed) — covers the display_name fallback path where the '2001-01-1' typo historically lived (CHANGELOG 1.4.0).

    it('name-based lookup works for stats', async () => {
      const result = await server.getConversationStatsEnhanced('Alice', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'individual');
      assert.ok(parsed.stats.total_messages > 0);
    });
  });

  // ── Robustness ──

  describe('robustness', () => {
    it('unknown phone number throws "Contact not found"', async () => {
      await assert.rejects(
        () => server.getConversationStatsEnhanced('+10000000000', 30),
        /Contact not found/
      );
    });

    it('days_back=0 returns zero messages', async () => {
      const result = await server.getConversationStatsEnhanced('+15550001111', 0);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.stats.total_messages, 0);
    });

    it('group:999 (non-existent group) returns empty stats', async () => {
      const result = await server.getConversationStatsEnhanced('group:999', 30);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'group');
      assert.deepEqual(parsed.participants, []);
    });
  });
});
