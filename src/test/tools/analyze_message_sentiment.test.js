/**
 * analyze_message_sentiment — living specification.
 *
 * Searches for messages matching hostile or custom keywords.
 * Supports group-by-date or flat list mode, groups and individuals.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../helpers/server.js';

describe('Tool: analyze_message_sentiment', () => {
  let server, cleanup;

  before(async () => ({ server, cleanup } = await makeServer()));
  after(() => cleanup());

  // ── Smoke ──

  describe('smoke', () => {
    it('returns sentiment analysis for a known contact', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', undefined, 30, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.ok(parsed.conversation);
      assert.ok(parsed.period_days);
    });
  });

  // ── Functional ──

  describe('functional', () => {
    it('default keywords detect hostile word in fixture', async () => {
      // Message 3 contains "I hate waiting in line" — "hate" is a default keyword
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', undefined, 30, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.keywords_used, 'default_hostile');
      assert.ok(parsed.daily_breakdown.length > 0, 'should find at least one day with hostile messages');
    });

    it('custom keywords override defaults', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', ['waiting'], 30, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.deepEqual(parsed.keywords_searched, ['waiting']);
      assert.ok(parsed.daily_breakdown.length > 0);
    });

    it('group_by_date=true returns daily_breakdown', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', ['hate'], 30, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.analysis_type, 'sentiment_by_date');
      assert.ok(Array.isArray(parsed.daily_breakdown));
      for (const day of parsed.daily_breakdown) {
        assert.ok(day.date);
        assert.ok(typeof day.count === 'number');
        assert.ok(Array.isArray(day.samples));
      }
    });

    it('group_by_date=false returns flat messages array', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', ['hate'], 30, false);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.analysis_type, 'all_hostile_messages');
      assert.ok(Array.isArray(parsed.messages));
      for (const msg of parsed.messages) {
        assert.ok(msg.date_readable || msg.date);
        assert.ok(msg.text);
      }
    });

    it('group identifier returns group type', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('group:42', ['meeting'], 30, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'group');
    });

    it('group sentiment resolves sender names in flat mode', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('group:42', ['meeting'], 30, false);
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.messages.length > 0) {
        assert.ok(parsed.messages[0].sender);
      }
    });

    it('only searches received messages (is_from_me=0)', async () => {
      // "I'm doing great" is a sent message — searching for "great" should find nothing
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', ['great'], 30, false);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.messages.length, 0);
    });

    it('individual result includes conversation name', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', undefined, 30, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.type, 'individual');
      assert.ok(parsed.conversation);
    });

    it('samples are capped at 3 per day', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', ['hate'], 30, true);
      const parsed = JSON.parse(result.content[0].text);
      for (const day of parsed.daily_breakdown) {
        assert.ok(day.samples.length <= 3);
      }
    });
  });

  // ── Robustness ──

  describe('robustness', () => {
    it('unknown phone number throws "Contact not found"', async () => {
      await assert.rejects(
        () => server.analyzeMessageSentimentEnhanced('+10000000000', undefined, 30, true),
        /Contact not found/
      );
    });

    it('no keyword matches returns empty breakdown', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', ['xyznonexistent'], 30, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.daily_breakdown.length, 0);
    });

    it('days_back=0 returns empty results', async () => {
      const result = await server.analyzeMessageSentimentEnhanced('+15550001111', ['hate'], 0, true);
      const parsed = JSON.parse(result.content[0].text);
      assert.equal(parsed.daily_breakdown.length, 0);
    });

    it('empty keywords array throws SQL error', async () => {
      // An empty keywords array generates "AND ()" which is invalid SQL.
      // This documents the current behavior — a future improvement could
      // return empty results instead of throwing.
      await assert.rejects(
        () => server.analyzeMessageSentimentEnhanced('+15550001111', [], 30, true),
        /SQLITE_ERROR/
      );
    });
  });
});
