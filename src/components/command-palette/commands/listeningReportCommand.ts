import { BarChart3 } from 'lucide-react';
import { defineCommand } from '../commandFactories';
import { listeningReportSurface } from '../surfaces/listeningReportSurface';
import type { CommandPaletteCommand } from '../types';

// src/components/command-palette/commands/listeningReportCommand.ts
// Opens the listening report in the palette body. It takes no input: the report is a read of what
// has already been recorded, so there is nothing to type and no argument to parse.

export const listeningReportCommand: CommandPaletteCommand = defineCommand({
    id: 'listening-report',
    group: 'settings',
    title: 'Listening report',
    description: 'What you listened to over the last thirty days: totals, a calendar and your most played songs',
    keywords: ['stats', 'statistics', 'wrapped', 'year in review', 'monthly recap', '月度报告', '年度报告', '统计', '收听'],
    icon: BarChart3,
    surface: listeningReportSurface,
    execute: () => true,
});
