import { describe, expect, it } from 'vitest';
import type { SongResult } from '@/types';
import { buildListeningReport, heatmapPeak, REPORT_DAYS } from '@/components/app/home/explore/listeningReport';
import { DAY_BEGINS_HOUR } from '@/components/app/home/explore/recentPlays';

// The report is pure arithmetic over the record, so these cases pin the window edges, the
// per-song ranking and the time floor; the panel only draws what comes out of here.

const DAY_MS = 24 * 60 * 60 * 1000;

/** The listener's day number a time falls in, as the module under test and the record both count it. */
const dayOf = (at: number) => Math.floor((at - new Date(at).getTimezoneOffset() * 60 * 1000 - DAY_BEGINS_HOUR * 60 * 60 * 1000) / DAY_MS);

/** A fixed local noon, so the test does not straddle a day boundary. */
const NOW = new Date(2026, 9, 23, 12, 0, 0).getTime();
const TODAY = dayOf(NOW);

const online = (id: string, durationMs = 200_000): SongResult => ({
    id,
    name: `song ${id}`,
    artists: [],
    album: { id: '', name: '' },
    durationMs,
    sourceRef: { kind: 'online', providerId: 'netease', mediaId: id },
} as SongResult);

describe('buildListeningReport', () => {
    it('counts only listenings inside the window, on the window\'s own days', () => {
        const report = buildListeningReport([{
            providerId: 'netease',
            records: [{
                song: online('a'),
                days: [
                    [TODAY, 2],
                    [TODAY - 3, 1],
                    // One day before the window opens, and one after today: neither counts.
                    [TODAY - REPORT_DAYS, 5],
                    [TODAY + 1, 4],
                ],
            }],
        }], NOW);

        expect(report.listenings).toBe(3);
        expect(report.days).toHaveLength(REPORT_DAYS);
        expect(report.days[REPORT_DAYS - 1]).toEqual({ day: TODAY, listenings: 2 });
        expect(report.days[REPORT_DAYS - 4]).toEqual({ day: TODAY - 3, listenings: 1 });
        expect(report.songs[0].byDay[REPORT_DAYS - 1]).toBe(2);
    });

    it('takes the day with the most listenings, and null when nothing was heard', () => {
        const report = buildListeningReport([{
            providerId: 'netease',
            records: [{ song: online('a'), days: [[TODAY, 1], [TODAY - 1, 4]] }],
        }], NOW);
        expect(report.busiestDay).toEqual({ day: TODAY - 1, listenings: 4 });

        const empty = buildListeningReport([{ providerId: 'netease', records: [{ song: online('a'), days: [] }] }], NOW);
        expect(empty.busiestDay).toBeNull();
        expect(empty.listenings).toBe(0);
        expect(empty.songCount).toBe(0);
        expect(heatmapPeak(empty)).toBe(1);
    });

    it('ranks songs by listenings, then by the more recent one', () => {
        const report = buildListeningReport([{
            providerId: 'netease',
            records: [
                { song: online('few'), days: [[TODAY - 5, 2]] },
                { song: online('many'), days: [[TODAY - 9, 3]] },
                { song: online('tie-older'), days: [[TODAY - 2, 2]] },
                { song: online('tie-newer'), days: [[TODAY - 1, 2]] },
            ],
        }], NOW);

        expect(report.songs.map(tally => tally.song.id)).toEqual(['many', 'tie-newer', 'tie-older', 'few']);
        expect(report.songCount).toBe(4);
    });

    it('merges the same song across providers apart, and across records together', () => {
        const report = buildListeningReport([
            { providerId: 'netease', records: [{ song: online('shared'), days: [[TODAY, 1]] }] },
            // Same id from another platform is another song: the key carries the platform.
            { providerId: 'qq', records: [{ song: { ...online('shared'), sourceRef: { kind: 'online', providerId: 'qq', mediaId: 'shared' } }, days: [[TODAY, 2]] }] },
        ], NOW);

        expect(report.songs).toHaveLength(2);
        expect(report.byProvider).toEqual([
            { providerId: 'qq', listenings: 2 },
            { providerId: 'netease', listenings: 1 },
        ]);
    });

    it('gives the time floor at half of each song\'s length per listening', () => {
        const report = buildListeningReport([{
            providerId: 'netease',
            // 200 000 ms long, heard three times: the floor is 3 * 100 000.
            records: [{ song: online('a', 200_000), days: [[TODAY, 3]] }],
        }], NOW);

        expect(report.atLeastMs).toBe(300_000);
    });

    it('leaves out records with no usable identity instead of merging them', () => {
        const report = buildListeningReport([{
            providerId: 'netease',
            records: [
                { song: { ...online('x'), id: '' }, days: [[TODAY, 2]] },
                { song: online('ok'), days: [[TODAY, 1]] },
            ],
        }], NOW);

        expect(report.songCount).toBe(1);
        expect(report.listenings).toBe(1);
    });

    it('is empty for no records at all', () => {
        const report = buildListeningReport([], NOW);
        expect(report.listenings).toBe(0);
        expect(report.atLeastMs).toBe(0);
        expect(report.songs).toEqual([]);
        expect(report.byProvider).toEqual([]);
        expect(report.days.every(day => day.listenings === 0)).toBe(true);
    });
});
