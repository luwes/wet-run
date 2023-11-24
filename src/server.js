import * as http from 'node:http';
import * as path from 'node:path';
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

  port = await getFreePort(port);
  const url = `http://localhost:${port}`;

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

  http.createServer(async (request, response) => {

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

  }).listen(port);

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
