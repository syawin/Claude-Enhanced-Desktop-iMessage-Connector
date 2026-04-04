/**
 * Smoke tests — verify every tool returns a valid MCP response.
 *
 * These are the minimal "does it turn on" tests. Each tool gets one happy-path
 * call and we assert the response has the correct MCP content shape.
 * Mirrors the contract checked by scripts/test-tools.sh.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from './helpers/server.js';

describe('smoke — all tools return valid responses', () => {
  let server, cleanup;

  before(async () => {
    ({ server, cleanup } = await makeServer());
  });

  after(() => cleanup());

  /** Assert the standard MCP tool response shape. */
  function assertMcpResponse(result) {
    assert.ok(result, 'result should not be null/undefined');
    assert.ok(Array.isArray(result.content), 'result.content should be an array');
    assert.ok(result.content.length > 0, 'result.content should not be empty');
    assert.equal(result.content[0].type, 'text');
    assert.ok(result.content[0].text.length > 0, 'text should not be empty');
    assert.ok(
      !result.content[0].text.toLowerCase().startsWith('error:'),
      `tool returned an error: ${result.content[0].text}`
    );
  }

  it('search_contacts returns valid response', async () => {
    const result = await server.searchContacts('+15550001111');
    assertMcpResponse(result);
  });

  it('search_and_read returns valid response', async () => {
    const result = await server.searchAndRead('+15550001111', true, 5, 30, 'minimal');
    assertMcpResponse(result);
  });

  it('read_conversation returns valid response for individual', async () => {
    const result = await server.readConversation('+15550001111', 10, 30, true, 'minimal');
    assertMcpResponse(result);
  });

  it('read_conversation returns valid response for group', async () => {
    const result = await server.readConversation('group:42', 10, 30, true, 'minimal');
    assertMcpResponse(result);
  });

  it('get_conversation_stats returns valid response', async () => {
    const result = await server.getConversationStatsEnhanced('+15550001111', 30);
    assertMcpResponse(result);
  });

  it('analyze_message_sentiment returns valid response', async () => {
    const result = await server.analyzeMessageSentimentEnhanced('+15550001111', undefined, 30, true);
    assertMcpResponse(result);
  });
});
