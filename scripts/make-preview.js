#!/usr/bin/env node
/*
 * Renders scripts/preview.html to site/assets/preview.jpg (1200 x 630)
 * with the Chrome installed on this machine. Run with `npm run preview`.
 * No dependencies: talks to headless Chrome over its debugging port.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PAGE = 'file:///' + path.join(__dirname, 'preview.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '..', 'site', 'assets', 'preview.jpg');
const WIDTH = 1200;
const HEIGHT = 630;
const PORT = 9333 + Math.floor(Math.random() * 500);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(CHROME)) {
    throw new Error('Chrome not found at ' + CHROME + '. Set CHROME_PATH to your chrome.exe.');
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-chrome-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
      '--window-size=' + WIDTH + ',' + HEIGHT, 'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    try {
      targets = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json();
    } catch (e) {
      await sleep(250);
    }
  }
  if (!targets) throw new Error('Chrome did not start');
  const page = targets.find((t) => t.type === 'page');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
  });
  await send('Page.navigate', { url: PAGE });
  await sleep(1500);
  await send('Runtime.evaluate', {
    expression: 'document.fonts.ready.then(() => true)', awaitPromise: true,
  });
  await sleep(600);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  fs.writeFileSync(OUT, Buffer.from(shot.result.data, 'base64'));
  console.log('Wrote ' + path.relative(process.cwd(), OUT) + ' (' + fs.statSync(OUT).size + ' bytes)');

  ws.close();
  chrome.kill();
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
