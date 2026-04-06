/**
 * read_conversation — living specification.
 *
 * Reads messages from a specific contact (by phone/email/name) or group (by group:ID).
 * Supports sent-message filtering and three output formats.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../helpers/server.js';

describe('Tool: read_conversation', () => {
  let server, cleanup;

  before(async () => ({ server, cleanup } = await makeServer()));
  after(() => cleanup());

  // ── Smoke ──

  describe('smoke', () => {
    it('reads individual conversation by phone number', async () => {
      const result = await server.readConversation('+15550001111', 10, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'individual');
      assert.ok(parsed.message_count > 0);
    });
  });

  // ── Functional ──

  describe('functional', () => {
    it('reads individual by phone — includes sent and received', async () => {
      const result = await server.readConversation('+15550001111', 20, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'individual');
      // Should have both received and sent messages
      const msgs = parsed.messages;
      assert.ok(msgs.some(m => m.text.startsWith('> ')), 'should have sent messages (prefixed with "> ")');
      assert.ok(msgs.some(m => !m.text.startsWith('> ')), 'should have received messages');
      // Note: message 5 (attributedBody-only, text=NULL on handle 3/email) is excluded
      // at the SQL level by the "text IS NOT NULL AND text != ''" filter in
      // readConversation(). The attributedBody decode path is therefore not exercised
      // for individual conversations in the current fixture data.
    });

    it('reads group by group:ID', async () => {
      const result = await server.readConversation('group:42', 20, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'group');
      assert.ok(parsed.message_count > 0);
      // Group messages should have sender field
      assert.ok(parsed.messages[0].sender);
    });

    it('group messages resolve sender names', async () => {
      const result = await server.readConversation('group:42', 20, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      const senders = parsed.messages.map(m => m.sender);
      // Should have resolved names, not raw phone numbers
      assert.ok(senders.some(s => s === 'Carol White' || s === 'Dave Brown' || s === 'You'));
    });

    it('include_sent=false excludes sent messages', async () => {
      const result = await server.readConversation('+15550001111', 20, 30, false, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      // No messages should start with "> " (the sent-message prefix)
      for (const msg of parsed.messages) {
        assert.ok(!msg.text.startsWith('> '), `sent message found: ${msg.text}`);
      }
    });

    it('include_sent=false on group excludes is_from_me messages', async () => {
      const result = await server.readConversation('group:42', 20, 30, false, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      for (const msg of parsed.messages) {
        assert.notEqual(msg.sender, 'You', 'should not include sent messages');
      }
    });

    it('format=minimal returns plain text', async () => {
      const result = await server.readConversation('+15550001111', 10, 30, true, 'minimal');
      const text = result.content[0].text;
      assert.ok(!text.startsWith('{'), 'minimal should be plain text');
    });

    it('format=compact returns structured JSON', async () => {
      const result = await server.readConversation('+15550001111', 10, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.conversation);
      assert.ok(parsed.type);
      assert.ok(typeof parsed.message_count === 'number');
      assert.ok(typeof parsed.period_days === 'number');
      assert.ok(Array.isArray(parsed.messages));
    });

    it('format=full returns detailed JSON', async () => {
      const result = await server.readConversation('+15550001111', 10, 30, true, 'full');
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.type);
      assert.ok(parsed.messages);
    });

    it('limit parameter caps messages returned', async () => {
      const result = await server.readConversation('+15550001111', 1, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.message_count, 1);
    });

    it('days_back filters by date range', async () => {
      // 3 days back should exclude 5-day and 10-day old messages
      const result = await server.readConversation('+15550001111', 20, 3, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.message_count, 2); // only 2-day-old messages
    });

    it('name-based identifier resolves via contacts', async () => {
      const result = await server.readConversation('Alice', 10, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'individual');
      assert.ok(parsed.message_count > 0);
    });

    it('group with no display_name falls back to "Group N"', async () => {
      const result = await server.readConversation('group:99', 10, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      // TODO: the `||` hides which field actually carries the fallback name — read the compact-format code in index.js and pin the real field (either parsed.conversation or parsed.name, not both).
      assert.ok(parsed.conversation.includes('Group 99') || parsed.name?.includes('Group 99'));
    });
  });

  // ── Robustness ──

  describe('robustness', () => {
    it('unknown phone number throws "Contact not found"', async () => {
      // Use a phone-like identifier so it skips the name path
      // and goes directly to handle lookup where nothing matches
      await assert.rejects(
        () => server.readConversation('+10000000000', 10, 30, true, 'compact'),
        /Contact not found/
      );
    });

    it('group:999 (non-existent) returns empty messages', async () => {
      const result = await server.readConversation('group:999', 10, 30, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.message_count, 0);
    });

    it('days_back=0 returns no messages', async () => {
      const result = await server.readConversation('+15550001111', 20, 0, true, 'compact');
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.message_count, 0);
    });
  });
});
