/**
 * AppleScript contact-output parser tests.
 *
 * Tests parseContactsOutput() with canned strings that mirror real
 * osascript output.  No macOS or osascript dependency -- runs on any platform.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { iMessageMCPServer } from '../index.js';

describe('parseContactsOutput', () => {
  let server;

  beforeEach(() => {
    server = new iMessageMCPServer();
  });

  it('parses a normal record with all fields', () => {
    const raw =
      'Alice<<<FIELD>>>Smith<<<FIELD>>>+15550001111<<<FIELD>>>alice@example.com<<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 1);
    const c = server.appleScriptContacts[0];
    assert.equal(c.firstName, 'Alice');
    assert.equal(c.lastName, 'Smith');
    assert.equal(c.fullName, 'Alice Smith');
    assert.deepEqual(c.phones, ['+15550001111']);
    assert.deepEqual(c.emails, ['alice@example.com']);

    // phone map: digits only, value is full name
    assert.equal(server.phoneToNameMap.get('15550001111'), 'Alice Smith');
    // >10 digits => also has last-10-digit entry
    assert.equal(server.phoneToNameMap.get('5550001111'), 'Alice Smith');

    // email map: lowercase key
    assert.equal(server.emailToNameMap.get('alice@example.com'), 'Alice Smith');
  });

  it('handles missing last name (empty field)', () => {
    const raw =
      'Jos\u00e9<<<FIELD>>><<<FIELD>>>+15551112222<<<FIELD>>><<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 1);
    const c = server.appleScriptContacts[0];
    assert.equal(c.firstName, 'Jos\u00e9');
    assert.equal(c.lastName, '');
    assert.equal(c.fullName, 'Jos\u00e9');
    assert.deepEqual(c.phones, ['+15551112222']);
    assert.deepEqual(c.emails, []);
    assert.equal(server.phoneToNameMap.get('15551112222'), 'Jos\u00e9');
  });

  it('handles multiple phone numbers', () => {
    const raw =
      'Carol<<<FIELD>>>White<<<FIELD>>>+15552223333,+15554445555<<<FIELD>>><<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 1);
    const c = server.appleScriptContacts[0];
    assert.deepEqual(c.phones, ['+15552223333', '+15554445555']);
    assert.equal(server.phoneToNameMap.get('15552223333'), 'Carol White');
    assert.equal(server.phoneToNameMap.get('15554445555'), 'Carol White');
    // last-10-digit entries
    assert.equal(server.phoneToNameMap.get('5552223333'), 'Carol White');
    assert.equal(server.phoneToNameMap.get('5554445555'), 'Carol White');
  });

  it('handles multiple emails', () => {
    const raw =
      'Dave<<<FIELD>>>Brown<<<FIELD>>><<<FIELD>>>dave@work.com,dave@home.com<<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 1);
    const c = server.appleScriptContacts[0];
    assert.deepEqual(c.phones, []);
    assert.deepEqual(c.emails, ['dave@work.com', 'dave@home.com']);
    assert.equal(server.emailToNameMap.get('dave@work.com'), 'Dave Brown');
    assert.equal(server.emailToNameMap.get('dave@home.com'), 'Dave Brown');
  });

  it('handles Unicode names', () => {
    const raw =
      '\u738b<<<FIELD>>>\u5c0f\u660e<<<FIELD>>>+8613812345678<<<FIELD>>>wang@example.com<<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 1);
    const c = server.appleScriptContacts[0];
    assert.equal(c.firstName, '\u738b');
    assert.equal(c.lastName, '\u5c0f\u660e');
    assert.equal(c.fullName, '\u738b \u5c0f\u660e');
    assert.equal(server.phoneToNameMap.get('8613812345678'), '\u738b \u5c0f\u660e');
    // last-10-digit entry for >10 digit number
    assert.equal(server.phoneToNameMap.get('3812345678'), '\u738b \u5c0f\u660e');
    assert.equal(server.emailToNameMap.get('wang@example.com'), '\u738b \u5c0f\u660e');
  });

  it('skips empty records (trailing delimiter)', () => {
    const raw =
      'Alice<<<FIELD>>>Smith<<<FIELD>>>+15550001111<<<FIELD>>>alice@example.com<<<RECORD>>><<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 1);
  });

  it('parses multiple records in one output', () => {
    const raw = [
      'Alice<<<FIELD>>>Smith<<<FIELD>>>+15550001111<<<FIELD>>>alice@example.com<<<RECORD>>>',
      'Bob<<<FIELD>>>Jones<<<FIELD>>>+15556667777<<<FIELD>>>bob@example.com<<<RECORD>>>',
    ].join('');

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 2);
    assert.equal(server.appleScriptContacts[0].fullName, 'Alice Smith');
    assert.equal(server.appleScriptContacts[1].fullName, 'Bob Jones');
    assert.equal(server.phoneToNameMap.get('15550001111'), 'Alice Smith');
    assert.equal(server.phoneToNameMap.get('15556667777'), 'Bob Jones');
    assert.equal(server.emailToNameMap.get('alice@example.com'), 'Alice Smith');
    assert.equal(server.emailToNameMap.get('bob@example.com'), 'Bob Jones');
  });

  it('skips records with no name (all empty fields)', () => {
    const raw =
      '<<<FIELD>>><<<FIELD>>>+15559990000<<<FIELD>>><<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 0);
    assert.equal(server.phoneToNameMap.size, 0);
  });

  it('email Map keys are always lowercase', () => {
    const raw =
      'Eve<<<FIELD>>>Adams<<<FIELD>>><<<FIELD>>>Eve.Adams@Work.COM<<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.emailToNameMap.has('eve.adams@work.com'), true);
    assert.equal(server.emailToNameMap.has('Eve.Adams@Work.COM'), false);
  });

  it('phone Map keys are digit-only strings', () => {
    const raw =
      'Frank<<<FIELD>>>Lee<<<FIELD>>>+1 (555) 888-9999<<<FIELD>>><<<RECORD>>>';

    server.parseContactsOutput(raw);

    for (const [key] of server.phoneToNameMap) {
      assert.match(key, /^\d+$/, `phone key should be digits only: "${key}"`);
    }
    assert.equal(server.phoneToNameMap.get('15558889999'), 'Frank Lee');
  });

  it('does not create phone Map entry for numbers with fewer than 7 digits', () => {
    const raw =
      'Short<<<FIELD>>>Num<<<FIELD>>>123<<<FIELD>>><<<RECORD>>>';

    server.parseContactsOutput(raw);

    assert.equal(server.appleScriptContacts.length, 1);
    assert.equal(server.phoneToNameMap.size, 0);
  });

  it('handles empty string input', () => {
    server.parseContactsOutput('');

    assert.equal(server.appleScriptContacts.length, 0);
    assert.equal(server.phoneToNameMap.size, 0);
    assert.equal(server.emailToNameMap.size, 0);
  });
});
