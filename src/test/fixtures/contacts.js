/**
 * Mock contact data for integration tests.
 *
 * Injects contact Maps directly into the server instance, bypassing AppleScript.
 * Replicates the exact data structures that loadContactsViaAppleScript() produces.
 */

/** Contact definitions matching the handles in db.js seed data. */
const TEST_CONTACTS = [
  {
    firstName: 'Alice',
    lastName: 'Smith',
    fullName: 'Alice Smith',
    phones: ['+15550001111'],
    emails: ['alice@example.com'],
  },
  {
    firstName: 'Bob',
    lastName: 'Jones',
    fullName: 'Bob Jones',
    phones: ['+15559999999'],
    emails: [],
  },
  {
    firstName: 'Carol',
    lastName: 'White',
    fullName: 'Carol White',
    phones: ['+15552223333'],
    emails: [],
  },
  {
    firstName: 'Dave',
    lastName: 'Brown',
    fullName: 'Dave Brown',
    phones: ['+15553334444'],
    emails: [],
  },
];

/**
 * Populate server contact state, bypassing AppleScript.
 * Mirrors the Map-building logic in loadContactsViaAppleScript().
 */
export function injectTestContacts(server) {
  server.appleScriptContacts = TEST_CONTACTS;
  server.phoneToNameMap = new Map();
  server.emailToNameMap = new Map();

  for (const contact of TEST_CONTACTS) {
    for (const phone of contact.phones) {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length >= 7) {
        server.phoneToNameMap.set(digits, contact.fullName);
        if (digits.length > 10) {
          server.phoneToNameMap.set(digits.slice(-10), contact.fullName);
        }
      }
    }
    for (const email of contact.emails) {
      server.emailToNameMap.set(email.toLowerCase(), contact.fullName);
    }
  }
}

export { TEST_CONTACTS };
