import { test } from 'zora';

test('is running in a browser', async function (t) {
  let div = document.createElement('div');
  t.equal(div.localName, 'div');
});
