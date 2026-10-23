import type { SongResult } from '../../../../types';
import { DAY_BEGINS_HOUR } from './recentPlays';
import type { PlayRecordSnapshot } from './recentPlays';

// src/components/app/home/explore/listeningReport.ts
// The listening report: what the last thirty days of plays come to, per the record `recentPlays.ts`
// keeps. Pure functions over that record, so the numbers can be tested without a browser and the
// panel only lays them out.
//
// Everything here counts listenings, not plays. The record marks a song played after a few
// seconds and listened to only once half of it has sounded, so a song opened and skipped is on
// record as played but contributes nothing here.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
/** The report's window, in days: the same thirty the record keeps. */
export const REPORT_DAYS = 30;

/** What one song comes to inside the window. */
export interface SongTally {
    song: SongResult;
    /** Listenings inside the window. */
    listenings: number;
    /** Listenings on each of the window's days, oldest first; 0 where it was not heard. */
    byDay: number[];
    /** The number of the listener's day it was last heard on. */
    lastDay: number;
}

/** A day of the window: its number, and how many listenings fell on it. */
export interface DayTally {
    day: number;
    listenings: number;
}

export interface ListeningReport {
    /** The window's days, oldest first, including the ones nothing was heard on. */
    days: DayTally[];
    /** Every song heard in the window, most listened first. */
    songs: SongTally[];
    /** Distinct songs heard at least once. */
    songCount: number;
    /** Every listening in the window, summed. */
    listenings: number;
    /**
     * A floor on how long was spent listening, in milliseconds: each listening counted at half the
     * song's length, which is the point at which the record starts counting one. It is a floor and
     * not an estimate of the real figure - a song played right through contributes twice this - so
     * the panel words it as "at least".
     */
    atLeastMs: number;
    /** The day with the most listenings, or null when nothing was heard. */
    busiestDay: DayTally | null;
    /** Which provider each listening came from, most first. */
    byProvider: Array<{ providerId: string; listenings: number }>;
}

/**
 * The number of the listener's day a time falls in. Must agree with `recentPlays.dayOf` exactly:
 * that one is private, and the buckets here have to land on the days it wrote.
 */
const dayOf = (at: number) => Math.floor((at - new Date(at).getTimezoneOffset() * 60 * 1000 - DAY_BEGINS_HOUR * HOUR_MS) / DAY_MS);

/**
 * A song's identity across plays: its platform plus its own id, matching `getPlaybackSongKey` for
 * the online case without importing the guard module this file otherwise has no use for. Every
 * record holds an online song (`recentPlays.note` skips the others), but a record without an id is
 * left out rather than merged with another malformed one.
 */
const songKeyOf = (song: SongResult): string | null => {
    const source = song.sourceRef;
    if (!source || source.kind !== 'online') return null;
    const id = song.id ?? source.mediaId;
    return id === undefined || id === null || id === '' ? null : `${source.providerId}:${String(id)}`;
};

/**
 * Builds the report from the records of one account, or of several concatenated.
 *
 * `now` is handed in rather than read, so a test can pin the window; the panel passes the clock.
 */
export const buildListeningReport = (
    records: ReadonlyArray<{ providerId: string; records: PlayRecordSnapshot[] }>,
    now: number = Date.now(),
): ListeningReport => {
    const today = dayOf(now);
    const firstDay = today - (REPORT_DAYS - 1);
    const days: DayTally[] = Array.from({ length: REPORT_DAYS }, (_, index) => ({ day: firstDay + index, listenings: 0 }));
    const providerCounts = new Map<string, number>();
    const songs = new Map<string, SongTally>();
    let listenings = 0;
    let atLeastMs = 0;

    for (const { providerId, records: scoped } of records) {
        for (const record of scoped) {
            const key = songKeyOf(record.song);
            if (!key) continue;
            const halfLengthMs = Math.max(0, Number(record.song.durationMs) || 0) / 2;
            // One entry per song however many of its records name it: the map is filled lazily so a
            // song with nothing inside the window does not appear at all.
            let tally = songs.get(key) ?? null;
            for (const [day, count] of record.days) {
                if (day < firstDay || day > today || count <= 0) continue;
                if (!tally) {
                    tally = {
                        song: record.song,
                        listenings: 0,
                        byDay: new Array<number>(REPORT_DAYS).fill(0),
                        lastDay: day,
                    };
                    songs.set(key, tally);
                }
                const index = day - firstDay;
                tally.byDay[index] += count;
                tally.listenings += count;
                if (day > tally.lastDay) tally.lastDay = day;
                days[index].listenings += count;
                listenings += count;
                atLeastMs += count * halfLengthMs;
                providerCounts.set(providerId, (providerCounts.get(providerId) ?? 0) + count);
            }
        }
    }

    const ranked = [...songs.values()].sort((one, other) => (
        other.listenings - one.listenings || other.lastDay - one.lastDay
    ));

    const busiest = days.reduce<DayTally | null>((best, day) => (
        day.listenings > 0 && (!best || day.listenings > best.listenings) ? day : best
    ), null);

    return {
        days,
        songs: ranked,
        songCount: ranked.length,
        listenings,
        atLeastMs,
        busiestDay: busiest,
        byProvider: [...providerCounts.entries()]
            .map(([providerId, count]) => ({ providerId, listenings: count }))
            .sort((one, other) => other.listenings - one.listenings),
    };
};

/** The peak the calendar heat map scales against: the busiest day's count, at least 1. */
export const heatmapPeak = (report: ListeningReport): number => (
    Math.max(1, ...report.days.map(day => day.listenings))
);
