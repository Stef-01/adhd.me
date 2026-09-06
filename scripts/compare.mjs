// Builds before/after comparison sheets from qa/polish/{before,after}.
// Renders a labelled two-up HTML page per pair and screenshots it, so the pairs can be read
// side by side at a glance rather than by flipping between two files.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = 'qa/polish/compare';
mkdirSync(OUT, { recursive: true });

const PAIRS = [
  ['welcome-1440', '1440-home.png', 'The finder at 1440'],
  ['welcome-1920', '1920-home.png', 'The finder at 1920'],
  ['results-1440', 'f2-results.png', 'Results at 1440'],
  ['filters-1440', '1440-profile.png', 'Filters (Profile tab) at 1440'],
  ['learn-1440', '1440-approach.png', 'Learn tab at 1440'],
];

const dataUri = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

const browser = await chromium.launch();
for (const [name, file, title] of PAIRS) {
  const before = resolve('qa/polish/before', file);
  const after = resolve('qa/polish/after', file);
  if (!existsSync(before) || !existsSync(after)) { console.log('skip', name); continue; }

  const html = `<!doctype html><meta charset="utf-8"><style>
    :root { color-scheme: light; }
    body { margin:0; padding:26px; background:#0e1420; font:13px/1.4 ui-sans-serif,system-ui,sans-serif; color:#e9edf5; }
    h1 { margin:0 0 18px; font-size:17px; font-weight:650; letter-spacing:-0.01em; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:22px; align-items:start; }
    .pane h2 { margin:0 0 8px; font-size:11px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; }
    .before h2 { color:#ff9b8a; } .after h2 { color:#7fd8a6; }
    img { display:block; width:100%; border-radius:6px; border:1px solid rgba(255,255,255,.14); }
  </style>
  <h1>${title} &mdash; before / after</h1>
  <div class="grid">
    <div class="pane before"><h2>Before</h2><img src="${dataUri(before)}"></div>
    <div class="pane after"><h2>After</h2><img src="${dataUri(after)}"></div>
  </div>`;

  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.close();
  console.log('ok', name);
}
await browser.close();
