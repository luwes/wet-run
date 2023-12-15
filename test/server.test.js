import dns from 'node:dns';
import assert from 'node:assert';
import { test } from 'node:test';
import { serve } from '../src/server.js';

dns.setDefaultResultOrder('ipv4first');

const servers = [];
const addServe = async (root, options) => {
  const { url, server } = await serve(root, options);
  servers.push(server);
  return url;
};

let url = await addServe(`./test/fixtures/`, {
  redirect: ['public:public-folder.test/']
});

await test('serves a directory index', async () => {
  const response = await fetch(url);

  const type = response.headers.get('content-type');
  assert.equal(type, 'text/html; charset=utf-8');

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

await test('redirects /public to /public-folder.test/', async () => {
  let response = await fetch(`${url}/public`, {
    redirect: 'manual',
    follow: 0
  });

  assert.equal(response.status, 301);

  const location = response.headers.get('location');
  assert.equal(location, 'public-folder.test/');

  response = await fetch(`${url}/public`);
  assert.equal(response.status, 200);

  const type = response.headers.get('content-type');
  assert.equal(type, 'text/html; charset=utf-8');
});

url = await addServe(`./test/fixtures/`, {
  livereload: true
});

await test('serves a html file with livereload script', async () => {
  const response = await fetch(`${url}/page.html`);

  const type = response.headers.get('content-type');
  assert.equal(type, 'text/html; charset=utf-8');

  const text = await response.text();
  assert.match(text, /<script type="module" src="\/livereload.js"><\/script>/);
});

for (const server of servers) {
  server.close();
  server.closeAllConnections();
}
