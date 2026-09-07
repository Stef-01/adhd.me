import { readFile, writeFile } from 'node:fs/promises';
import postcss from 'postcss';

// The navigation now has one owner. Remove its historical desktop/mobile overrides,
// and the ambiguous card layout, retaining other selectors in shared rules.
const filename = 'app/globals.css';
const root = postcss.parse(await readFile(filename, 'utf8'));
let removed = 0;
root.walkRules(rule => {
  const selectors = postcss.list.comma(rule.selector);
  const keep = selectors.filter(selector => !/\.app-tabs\b|\.app-tab(?:\b|[-])|\.learn-card(?=[\s.:[>+~]|$)/.test(selector));
  removed += selectors.length - keep.length;
  if (!keep.length) rule.remove(); else if (keep.length !== selectors.length) rule.selector = keep.join(',\n');
});
root.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
await writeFile(filename, root.toString());
console.log(`Removed ${removed} superseded selectors; shared rules retained.`);
