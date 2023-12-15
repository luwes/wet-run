import dns from 'node:dns';
import assert from 'node:assert';
import { test } from 'node:test';
import { serve } from '../src/server.js';

dns.setDefaultResultOrder('ipv4first')

const { url, server } = await serve(`./test/fixtures/`);

await test('serves a directory index', async () => {
  const response = await fetch(url);

  const type = response.headers.get('content-type');
  assert.equal(type, 'text/html');

  const text = await response.text();
  assert.match(text, /<title>Index of/);
  assert.match(text, /<td><a href="\/404.html">404.html<\/a><\/td>/);
});

await test('serves a JSON file', async () => {
  const response = await fetch(`${url}/object.json`);

  const type = response.headers.get('content-type');
  assert.equal(type, 'application/json; charset=utf-8');

  const json = await response.json();
  assert.deepEqual(json, {
    "string": "another-string",
    "boolean": true,
    "array": [
      "first",
      "second"
    ]
  });
});

await test('returns a 404', async () => {
  const response = await fetch(`${url}/not-existing`);
  assert.equal(response.status, 404);

  const text = await response.text();
  assert.match(text, /404 Not Found/);
});

server.closeAllConnections();
server.close();
