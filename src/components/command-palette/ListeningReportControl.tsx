import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, CalendarDays, Clock3, Disc3, Sparkles } from 'lucide-react';
import type { Theme } from '../../types';
import { buildListeningReport, heatmapPeak, REPORT_DAYS } from '../app/home/explore/listeningReport';
import type { ListeningReport } from '../app/home/explore/listeningReport';
import { recordedScopes, playRecordsOf, watchRecentPlays } from '../app/home/explore/recentPlays';

// src/components/command-palette/ListeningReportControl.tsx
// The listening report: the last thirty days of listenings as the app recorded them, laid out as
// totals, a calendar heat map and the most listened songs.
//
// The numbers all come from `listeningReport.ts`; this file decides nothing about them. It reads
// the record for every scope the app has (each platform's each account) and hands them over
// together, so a listener who used two platforms sees one report.
//
// Nothing is written here: the record is read, watched for changes, and drawn.

type ListeningReportControlProps = {
    isDaylight: boolean;
    theme: Theme;
    /** How many of the songs to list; the report holds all of them. */
    topCount?: number;
};

const useReport = (): { report: ListeningReport; hasAny: boolean } => {
    // The record changes as songs are listened to, and its own notifications are the only signal:
    // a scope that gains a listening keeps the same scope list, so a snapshot derived from the
    // scopes alone would never change and the panel would sit on stale numbers. Counting the
    // notifications gives a snapshot that moves whenever the record does.
    const [revision, setRevision] = React.useState(0);
    React.useEffect(() => watchRecentPlays(() => setRevision(current => current + 1)), []);
    return useMemo(() => {
        const records = recordedScopes().map(scope => ({
            providerId: scope.providerId,
            records: playRecordsOf(scope.providerId as never, scope.accountId),
        }));
        const report = buildListeningReport(records);
        return { report, hasAny: report.listenings > 0 };
    }, [revision]);
};

/** A day's number as a date in the listener's own calendar. */
const dayLabel = (day: number) => {
    // `dayOf` counts days since the epoch with the listener's day boundary at DAY_BEGINS_HOUR, so
    // the reverse is the epoch plus that many days, formatted locally.
    const at = new Date(day * 86_400_000 + 86_400_000 / 2);
    return `${at.getMonth() + 1}/${at.getDate()}`;
};

/** 42 cells, weeks of Monday first, for the last thirty days plus the padding the grid needs. */
const calendarCells = (report: ListeningReport): Array<{ day: number | null; listenings: number }> => {
    const byDay = new Map(report.days.map(day => [day.day, day.listenings]));
    const first = report.days[0].day;
    if (!first) return [];
    // Shift so the first day sits under its weekday (Sunday-first grid, like the system calendar).
    const weekday = new Date(first * 86_400_000 + 86_400_000 / 2).getDay();
    const cells: Array<{ day: number | null; listenings: number }> = Array.from({ length: weekday }, () => ({ day: null, listenings: 0 }));
    report.days.forEach(day => cells.push({ day: day.day, listenings: day.listenings }));
    while (cells.length % 7 !== 0) cells.push({ day: null, listenings: 0 });
    return cells;
};

const formatDuration = (ms: number): string => {
    const totalMinutes = Math.round(ms / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const StatTile: React.FC<{
    isDaylight: boolean;
    icon: React.ReactNode;
    label: string;
    value: string;
    note: string;
}> = ({ isDaylight, icon, label, value, note }) => (
    <div
        className="flex min-w-0 flex-col gap-1 rounded-xl px-3 py-2.5"
        style={{
            background: isDaylight ? 'rgba(17, 17, 22, 0.04)' : 'rgba(255, 255, 255, 0.055)',
            border: `1px solid ${isDaylight ? 'rgba(17, 17, 22, 0.07)' : 'rgba(255, 255, 255, 0.08)'}`,
        }}
    >
        <span className="flex items-center gap-1.5 text-[11px] opacity-60">
            {icon}
            {label}
        </span>
        <span className="truncate text-lg font-semibold tabular-nums">{value}</span>
        <span className="truncate text-[10px] opacity-45">{note}</span>
    </div>
);

const ListeningReportControl: React.FC<ListeningReportControlProps> = ({ isDaylight, theme, topCount = 10 }) => {
    const { t } = useTranslation();
    const { report, hasAny } = useReport();
    const peak = heatmapPeak(report);
    const cells = useMemo(() => calendarCells(report), [report]);
    const top = report.songs.slice(0, topCount);
    const accent = theme.primaryColor;

    if (!hasAny) {
        return (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <BarChart3 size={28} style={{ opacity: 0.35 }} />
                <p className="text-sm opacity-60">{t('listeningReport.empty', '还没有足够的收听记录。听上几首歌，这里就会有内容。')}</p>
                <p className="text-[11px] opacity-40">
                    {t('listeningReport.emptyNote', '一首歌听到一半才会计入，跳过的不算。')}
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto px-3 pb-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
                <StatTile
                    isDaylight={isDaylight}
                    icon={<Disc3 size={12} />}
                    label={t('listeningReport.songs', '歌曲')}
                    value={String(report.songCount)}
                    note={t('listeningReport.lastDays', { days: REPORT_DAYS, defaultValue: '近 {{days}} 天' })}
                />
                <StatTile
                    isDaylight={isDaylight}
                    icon={<BarChart3 size={12} />}
                    label={t('listeningReport.listenings', '收听次数')}
                    value={String(report.listenings)}
                    note={report.busiestDay
                        ? t('listeningReport.busiest', { date: dayLabel(report.busiestDay.day), count: report.busiestDay.listenings, defaultValue: '最多 {{date}} · {{count}} 次' })
                        : ''}
                />
                <StatTile
                    isDaylight={isDaylight}
                    icon={<Clock3 size={12} />}
                    label={t('listeningReport.time', '时长')}
                    value={formatDuration(report.atLeastMs)}
                    note={t('listeningReport.timeFloor', '至少（按每次半首计）')}
                />
            </div>

            <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-1.5 text-[11px] font-medium opacity-60">
                    <CalendarDays size={12} />
                    {t('listeningReport.calendar', '收听日历')}
                </h3>
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 16px)' }}>
                    {cells.map((cell, index) => {
                        if (cell.day === null) return <span key={`pad-${index}`} className="h-4 w-4" />;
                        // Four steps, so a quiet day and a heavy one are told apart without a legend.
                        const level = cell.listenings === 0 ? 0 : Math.ceil((cell.listenings / peak) * 4);
                        const alpha = level === 0 ? 0.06 : 0.18 + level * 0.2;
                        return (
                            <span
                                key={cell.day}
                                title={`${dayLabel(cell.day)} · ${cell.listenings}`}
                                className="h-4 w-4 rounded-[3px]"
                                style={{ background: level === 0 ? `rgba(128,128,128,${alpha})` : accent, opacity: level === 0 ? 1 : alpha }}
                            />
                        );
                    })}
                </div>
            </section>

            <section className="flex flex-col gap-1.5">
                <h3 className="flex items-center gap-1.5 text-[11px] font-medium opacity-60">
                    <Sparkles size={12} />
                    {t('listeningReport.topSongs', '最常听')}
                </h3>
                <ol className="flex flex-col">
                    {top.map((tally, index) => (
                        <li key={`${tally.song.id}-${index}`} className="flex items-center gap-2.5 py-1.5">
                            <span className="w-4 shrink-0 text-right text-[11px] tabular-nums opacity-40">{index + 1}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px]">{tally.song.name}</span>
                                <span className="block truncate text-[11px] opacity-45">
                                    {tally.song.artists?.map(artist => artist.name).join(' / ') || '—'}
                                </span>
                            </span>
                            <span className="shrink-0 text-[11px] tabular-nums opacity-55">
                                {t('listeningReport.times', { count: tally.listenings, defaultValue: '{{count}} 次' })}
                            </span>
                        </li>
                    ))}
                </ol>
            </section>

            {report.byProvider.length > 1 && (
                <p className="text-[10px] opacity-40">
                    {report.byProvider
                        .map(entry => `${t(`providers.${entry.providerId}`, entry.providerId)} ${entry.listenings}`)
                        .join(' · ')}
                </p>
            )}
        </div>
    );
};

export default ListeningReportControl;
