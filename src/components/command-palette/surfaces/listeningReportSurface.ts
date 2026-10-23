import type { CommandPaletteSurface } from './types';

// src/components/command-palette/surfaces/listeningReportSurface.ts
// The listening report takes the palette body; it needs no input, so it shows no input row and
// nothing it draws is typed. The view is lazily imported like every other surface (see types.ts).

export const listeningReportSurface: CommandPaletteSurface = {
    load: () => import('./ListeningReportSurfaceView'),
    mapProps: ({ isDaylight, theme }) => ({ isDaylight, theme }),
};
