import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const runtimeSpecifiersOf = (file, dynamic) => {
  const source = read(file);
  return [
    ...[...source.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"];/gms)]
      .filter(m => !/^\s*(?:import|export)\s+type\s/.test(m[0])).map(m => m[1]),
    ...[...source.matchAll(/^\s*import\s+['"]([^'"]+)['"];/gm)].map(m => m[1]),
    ...(dynamic ? [...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]) : []),
  ];
};
const resolveSource = (file, spec) => {
  let base;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
  else return null;
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
    .find(c => /\.(?:tsx?|m?js|json|css)$/.test(c) && existsSync(path.join(ROOT, c)));
};
const walk = (entry, dynamic = true) => {
  const seen = new Set();
  const unresolved = [];
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of runtimeSpecifiersOf(file, dynamic)) {
      const t = resolveSource(file, spec);
      if (t === undefined) unresolved.push(`${file} -> ${spec}`);
      else if (t !== null) queue.push(t);
    }
  }
  return { files: [...seen].sort(), unresolved };
};
const r = walk('src/mods/folium/api.ts');
console.log('UNRESOLVED:'); r.unresolved.forEach(u => console.log(' ', u));
