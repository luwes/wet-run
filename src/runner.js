import process from 'node:process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import playwright from 'playwright-core';
import { serve } from './server.js';

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) run();

export async function run(opts) {
  const {
    dir = 'test/',
    browser = 'chromium',
    channel = 'chrome',
    timeout = 10000,
    port,
    servedir
  } = opts;

  const channels = {
    chromium: channel
  };

  try {
    const { url } = await serve({ dir: servedir, port });

    const brow = await playwright[browser].launch({
      channel: channels[browser],
      headless: !opts['no-headless'],
    });

    const page = await brow.newPage();

    page.on('console', event => {
      const msg = event.text();
      console.log(msg);

      const match = msg.match(/^# fail +(\d+)$/);
      if (match) {
        if (match[1] == 0) process.exit(0);
        else process.exit(1);
      }
    });

    await page.goto(`${url}/${dir}`);
    await page.waitForTimeout(+timeout);

    process.exit(2);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
