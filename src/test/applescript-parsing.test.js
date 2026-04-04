/**
 * AppleScript contact loading — macOS-only test.
 *
 * Tests the real osascript-based contact resolution pipeline.
 * Skipped automatically on non-macOS platforms (e.g., CI ubuntu runners).
 * Requires the Contacts app to have at least one entry.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { iMessageMCPServer } from '../index.js';

describe('AppleScript contact loading (macOS only)', { skip: process.platform !== 'darwin' }, () => {
  it('loads contacts and builds phone/email Maps', async () => {
    const server = new iMessageMCPServer();

    // Directly call the loading method (bypasses the lazy-load guard)
    server.loadContactsViaAppleScript();

    assert.ok(Array.isArray(server.appleScriptContacts), 'appleScriptContacts should be an array');
    assert.ok(server.appleScriptContacts.length > 0, 'should load at least 1 contact');
    assert.ok(server.phoneToNameMap instanceof Map, 'phoneToNameMap should be a Map');
    assert.ok(server.emailToNameMap instanceof Map, 'emailToNameMap should be a Map');
  });

  it('every contact has a non-empty fullName', async () => {
    const server = new iMessageMCPServer();
    server.loadContactsViaAppleScript();

    for (const contact of server.appleScriptContacts) {
      assert.ok(contact.fullName.length > 0, `contact should have a fullName: ${JSON.stringify(contact)}`);
    }
  });

  it('phone Map keys are digit-only strings', async () => {
    const server = new iMessageMCPServer();
    server.loadContactsViaAppleScript();

    for (const [key] of server.phoneToNameMap) {
      assert.match(key, /^\d+$/, `phone key should be digits only: "${key}"`);
    }
  });

  it('email Map keys are lowercase', async () => {
    const server = new iMessageMCPServer();
    server.loadContactsViaAppleScript();

    for (const [key] of server.emailToNameMap) {
      assert.equal(key, key.toLowerCase(), `email key should be lowercase: "${key}"`);
    }
  });
});
