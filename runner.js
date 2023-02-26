import process from 'node:process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { serve } from './server.js';

const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
const isRunningDirectlyViaCLI = nodePath === modulePath;

if (isRunningDirectlyViaCLI) run();

export async function run({ dir = 'test/', port, servedir }) {
  try {
    const { url } = await serve({ dir: servedir, port });
    const browser = await chromium.launch({ channel: 'chrome' });
    const page = await browser.newPage();

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
    await page.waitForTimeout(15000);

    process.exit(2);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
