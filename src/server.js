import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { watch } from 'node:fs';
import fs from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { argv } from 'node:process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import WebSocket, { WebSocketServer } from 'ws';
import { Hono } from 'hono';
import { cors as honoCors } from 'hono/cors';
import { etag } from 'hono/etag';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';
import { getMimeType } from 'hono/utils/mime';
import { serve as honoServe } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';

import { getFreePort, resolvePair, sizeToString, lastModifiedToString } from './utils.js';

const nodePath = path.resolve(argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) cliServe();

export async function cliServe() {

  const options = {
    port: {
      type: 'string',
      short: 'p',
    },
    cors: {
      type: 'boolean',
      short: 'C',
    },
    redirect: {
      type: 'string',
      multiple: true,
    },
    livereload: {
      type: 'boolean',
      short: 'l',
    },
    'ssl-cert': {
      type: 'string',
    },
    'ssl-key': {
      type: 'string',
    },
    'ssl-pass': {
      type: 'string',
    },
  };

  const {
    values,
    positionals,
  } = parseArgs({
    options,
    allowPositionals: true
  });

  const [, dir] = positionals;
  await serve(dir, values);
}

export async function serve(root = '.', opts = {}) {
  let {
    port,
    cors,
    redirect,
    livereload,
    livereloadExts = ['html', 'css', 'js', 'png', 'gif', 'jpg', 'php', 'py', 'rb', 'erb']
  } = opts;

  const defaults = {
    '/favicon.ico': `${path.dirname(fileURLToPath(import.meta.url))}/favicon.ico`,
    '/livereload.js': `${path.dirname(fileURLToPath(import.meta.url))}/client/livereload.js`,
  };

  // Create the server.
  const sslCert = opts['ssl-cert'];
  const sslKey = opts['ssl-key'];
  const sslPass = opts['ssl-pass'];
  const isPFXFormat =
    sslCert && /[.](?<extension>pfx|p12)$/.exec(sslCert) !== null;
  const useSsl = sslCert && (sslKey || sslPass || isPFXFormat);

  let serverOptions = {};
  if (useSsl && sslCert && sslKey) {
    // Format detected is PEM due to usage of SSL Key and Optional Passphrase.
    serverOptions = {
      key: await readFile(sslKey),
      cert: await readFile(sslCert),
      passphrase: sslPass ? await readFile(sslPass, 'utf8') : '',
    };
  } else if (useSsl && sslCert && isPFXFormat) {
    // Format detected is PFX.
    serverOptions = {
      pfx: await readFile(sslCert),
      passphrase: sslPass ? await readFile(sslPass, 'utf8') : '',
    };
  }

  const app = new Hono();
  app.use('*', etag());
  app.use('*', logger());

  if (cors) app.use('*', honoCors());

  var textEncoder = new TextEncoder();

  app.use('*', compress());
  app.use('*', async (c, next) => {
    const response = await serveStatic({ root })(c, next);

    if (response.body instanceof ReadableStream) {

      response.headers.delete('Content-Length');

      return new Response(response.body.pipeThrough(new TransformStream({
        transform(chunk, controller) {
          let content = `${chunk}`;
          let script = `  <script type="module" src="/livereload.js"></script>\n`;

          if (livereload && content.includes('</head>')) {
            chunk = content.replace('</head>', `${script}</head>`);
            chunk = textEncoder.encode(chunk);
          }

          controller.enqueue(chunk);
        }
      })), {
        status: response.status,
        headers: response.headers,
      });
    }

    return response;
  });

  for (const r of redirect ?? []) {
    const [from, to] = r.split(':');
    app.get(from, (c) => c.redirect(to, 301));
  }

  app.notFound(async (c) => {
    const pathname = c.req.path;

    // Serve default files.
    if (defaults[pathname]) {
      const mimeType = getMimeType(pathname)
      if (mimeType) c.header('Content-Type', mimeType);
      return c.body(fs.createReadStream(defaults[pathname]));
    }

    // Serve directory index.
    const [, stats] = await resolvePair(stat(path.join(root, pathname)));

    if (stats?.isDirectory()) {
      c.header('Content-Type', 'text/html; charset=utf-8');
      return c.body(Readable.from(createDirIndex(root, pathname)));
    }

    return c.text('404 Not Found', 404);
  });

  port = await getFreePort(port);

  const server = honoServe({
    fetch: app.fetch,
    createServer: useSsl ? https.createServer : http.createServer,
    port,
    serverOptions,
  });

  if (livereload) {
    createLivereload(root, livereloadExts, { port, server });
  }

  const protocol = useSsl ? 'https' : 'http';
  const url = `${protocol}://localhost:${port}`;
  console.log(`Server running at ${url}\n`);

  return {
    server,
    url,
    port,
  };
}

function createLivereload(root, exts, { server }) {

  const wss = new WebSocketServer({
    server,
  });

  wss.on('connection', (ws) => {
    ws.on('error', console.error);

    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.command === 'hello') {
        console.log('Livereload client connected');
      }
    });

    ws.send(JSON.stringify({
      command: 'hello',
    }));
  });

  server.on('close', () => {
    fileWatcher?.close();

    for (const client of wss.clients) {
      client.close();
    }

    wss.close();
  });

  let fileWatcher;

  try {
    fileWatcher = watch(root, { recursive: true }, (eventType, filename) => {
      if (filename) {
        const ext = path.extname(filename).slice(1);
        if (exts.includes(ext)) {
          console.log(`  <-- WS  /${filename}`);

          for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                command: 'reload',
                path: filename,
                liveCSS: true,
                liveImg: true,
              }));
            }
          }
        }
      }
    });

    fileWatcher.on('error', console.error);
    fileWatcher.unref();
  }
  catch (err) {
    console.error(err);
  }
}

async function* createDirIndex(root, pathname) {
  yield `
<!doctype html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Index of ${pathname}</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      line-height: 1.5;
    }
    td { padding: 0 .5em; }
  </style>
</head>
<body>
  <h1>Index of ${pathname}</h1>
  <table>
`.trim();

    let [, files = []] = await resolvePair(readdir(path.join(root, pathname)));

    files = files.filter(f => {
      return !(f === '.DS_Store' || f === '.git');
    });

    for (let file of files) {
      let filePath = path.join(pathname, file);
      const [, stats] = await resolvePair(stat(path.join(root, pathname, file)));

      if (stats?.isDirectory()) filePath = path.join(filePath, path.sep);

      yield `
    <tr>
      <td>${lastModifiedToString(stats)}</td>
      <td><code>${sizeToString(stats, true)}</code></td>
      <td><a href="${filePath}">${file}</a></td>
    </tr>`;
  }

  yield `
  </table>
</body>`;
}
