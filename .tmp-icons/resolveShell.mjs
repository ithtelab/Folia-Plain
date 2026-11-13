import fs from 'node:fs';

// Resolves the two conflicts in VisualizerShell.tsx for the scene back-button cherry-pick.
// Upstream moved the back button (and the pointer handlers) into usePlayerChrome; the glass
// surface we had added to it moves there too, so this file keeps only upstream's imports plus
// the LiquidGlassSurface import that usePlayerChrome now needs — which lives in ITS file, not here.
const p = 'src/components/visualizer/VisualizerShell.tsx';
let s = fs.readFileSync(p, 'utf8');

const hunks = [
    {
        pattern: /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [^\n]*\n/g,
        replacements: [
            // Hunk 1: take upstream's imports. `LiquidGlassSurface` is no longer rendered here.
            `import React, { forwardRef, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { MotionValue } from 'framer-motion';
`,
            // Hunk 2: upstream's `{backButton}`.
            `            {backButton}
`,
        ],
    },
];

let i = 0;
s = s.replace(hunks[0].pattern, () => {
    const out = hunks[0].replacements[i];
    i += 1;
    return out;
});

fs.writeFileSync(p, s);
console.log('conflicts left:', (s.match(/^<<<<<<< /gm) ?? []).length);
