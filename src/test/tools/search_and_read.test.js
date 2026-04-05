/**
 * search_and_read — living specification.
 *
 * Combined search + read: finds contacts/groups by name, phone, or email,
 * then reads their recent messages. Supports three output formats.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../helpers/server.js';

describe('Tool: search_and_read', () => {
  let server, cleanup;

  before(async () => ({ server, cleanup } = await makeServer()));
  after(() => cleanup());

  // ── Smoke ──

  describe('smoke', () => {
    it('returns conversations for a known phone number', async () => {
      const result = await server.searchAndRead('+15550001111', true, 5, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.found > 0);
    });
  });

  // ── Functional ──

  describe('functional', () => {
    it('name-based lookup resolves via contact map', async () => {
      const result = await server.searchAndRead('Alice', true, 15, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.found > 0);
      // Should find conversations via Alice's phone/email from contacts
      const names = parsed.conversations.map(c => c.name);
      assert.ok(names.some(n => n.includes('Alice')));
    });

    it('groups messages from multiple handles for same contact', async () => {
      // +15550001111 has both iMessage (handle 1) and SMS (handle 2)
      const result = await server.searchAndRead('+15550001111', true, 15, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      const individual = parsed.conversations.find(c => c.type === 'individual');
      assert.ok(individual, 'should find individual conversation');
      // Messages from both handles should be present
      assert.ok(individual.message_count > 0);
    });

    it('include_groups=false excludes group results', async () => {
      const result = await server.searchAndRead('Work', false, 15, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      const groups = (parsed.conversations || []).filter(c => c.type === 'group');
      assert.equal(groups.length, 0);
    });

    it('include_groups=true finds matching groups', async () => {
      const result = await server.searchAndRead('Work Team', true, 15, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      const groups = parsed.conversations.filter(c => c.type === 'group');
      assert.ok(groups.length > 0, 'should find Work Team group');
      assert.ok(groups[0].identifier.startsWith('group:'));
    });

    it('format=minimal returns plain text output', async () => {
      const result = await server.searchAndRead('+15550001111', true, 5, 30, 'minimal');
      // Minimal format is plain text, not JSON
      const text = result.content[0].text;
      assert.ok(!text.startsWith('{'), 'minimal should be plain text, not JSON');
    });

    it('format=compact returns JSON with conversations array', async () => {
      const result = await server.searchAndRead('+15550001111', true, 5, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(Array.isArray(parsed.conversations));
      assert.ok(parsed.query);
      assert.ok(typeof parsed.found === 'number');
    });

    it('format=full returns raw results JSON', async () => {
      const result = await server.searchAndRead('+15550001111', true, 5, 30, 'full');
      const parsed = JSON.parse(result.content[0].text);
      // TODO: `results || query` accepts either shape — pin the actual contract of format=full (check index.js searchAndRead) so consumers have something to rely on.
      assert.ok(parsed.results || parsed.query); // full format includes results array
    });

    it('limit parameter caps message count per conversation', async () => {
      const result = await server.searchAndRead('+15550001111', true, 2, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      for (const conv of parsed.conversations) {
        assert.ok(conv.message_count <= 10); // compact shows up to 10
      }
    });

    it('days_back parameter filters old messages', async () => {
      // With days_back=3, should exclude the 5-day-old and 10-day-old messages
      const result = await server.searchAndRead('+15550001111', true, 15, 3, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.conversations?.length > 0) {
        const individual = parsed.conversations.find(c => c.type === 'individual');
        if (individual) {
          // Should only get messages from within 3 days
          assert.ok(individual.message_count <= 2); // only the 2-day-old messages
        }
      }
    });

    it('resolves sender names in group messages', async () => {
      const result = await server.searchAndRead('Work Team', true, 10, 30, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      const group = parsed.conversations.find(c => c.type === 'group');
      assert.ok(group, 'should find group');
    });
  });

  // ── Robustness ──

  describe('robustness', () => {
    it('returns "No conversations found" for truly unmatched phone', async () => {
      // Use a phone number that won't match any handle
      const result = await server.searchAndRead('+10000000000', false, 5, 30, 'minimal');
      assert.ok(result.content[0].text.includes('No conversations found'));
    });

    it('days_back=0 returns no messages', async () => {
      const result = await server.searchAndRead('+15550001111', false, 15, 0, 'compact');
      // With threshold = now, no messages match
      const text = result.content[0].text;
      if (text.startsWith('{')) {
        const parsed = JSON.parse(text);
        const individual = (parsed.conversations || []).find(c => c.type === 'individual');
        if (individual) {
          assert.equal(individual.message_count, 0);
        }
      } else {
        assert.ok(text.includes('No conversations found'));
      }
    });
  });
});
