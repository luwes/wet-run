import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import { argv } from 'node:process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { serveHandler } from './serve-handler/serve-handler.js';

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

export async function serve(dir = '.', opts) {

  let {
    port,
    cors,
    redirect,
  } = opts;

  let redirects;
  if (redirect?.length > 0) {
    redirects = redirect.map(r => {
      const [source, destination] = r.split(':');
      return { source, destination };
    });
  }

  const defaults = {
    '/favicon.ico': `${path.dirname(fileURLToPath(import.meta.url))}/favicon.ico`,
  };

  // Create the server.
  const sslCert = opts['ssl-cert'];
  const sslKey = opts['ssl-key'];
  const sslPass = opts['ssl-pass'];
  const isPFXFormat =
    sslCert && /[.](?<extension>pfx|p12)$/.exec(sslCert) !== null;
  const useSsl = sslCert && (sslKey || sslPass || isPFXFormat);

  let serverConfig = {};
  if (useSsl && sslCert && sslKey) {
    // Format detected is PEM due to usage of SSL Key and Optional Passphrase.
    serverConfig = {
      key: await readFile(sslKey),
      cert: await readFile(sslCert),
      passphrase: sslPass ? await readFile(sslPass, 'utf8') : '',
    };
  } else if (useSsl && sslCert && isPFXFormat) {
    // Format detected is PFX.
    serverConfig = {
      pfx: await readFile(sslCert),
      passphrase: sslPass ? await readFile(sslPass, 'utf8') : '',
    };
  }

  const server = useSsl
    ? https.createServer(serverConfig, serverHandler)
    : http.createServer(serverHandler);

  async function serverHandler(request, response) {

    if (cors) {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    }

    await serveHandler(request, response, {
      public: dir,
      redirects,
      defaults,
    });

    console.log(`${request.method} ${request.url} ${response.statusCode}`);
  }

  port = await getFreePort(port);
  server.listen(port);

  const protocol = useSsl ? 'https' : 'http';
  const url = `${protocol}://localhost:${port}`;
  console.log(`Server running at ${url}`);

  return {
    url,
    port,
  };
}

async function getFreePort(base = 8000) {
  for (let port = base; port < base + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = http
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () =>
        tester.once('close', () => resolve(true)).close()
      )
      .listen(port);
  });
}
