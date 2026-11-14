import { ListMusic, Shuffle, SquareDashed, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// src/components/modal/newFeaturesRelease.ts

type NewFeatureCard = {
    id: string;
    icon: LucideIcon;
};

type NewFeaturesRelease = {
    i18nKey: string;
    /** 重大更新：介绍上方显示「<代号> Update · 重大更新」标签；代号不翻译，文案在 help.majorUpdateLabel。
     *  servicePack：同一重大更新的热修复版，标签改成「<代号> Update SP<n> · 重大更新」，文案在 help.servicePackLabel。 */
    majorUpdate?: { codename: string; servicePack?: number };
    features: NewFeatureCard[];
};

// Defines the current Folia Plain release and its localized feature cards.
export const NEW_FEATURES_RELEASE: NewFeaturesRelease = {
    i18nKey: 'releaseNotes.v0_9_0',
    // 0.9.0 brings the shuffle work from upstream 0.7.28's follow-ups: random play next to play-all,
    // rounds that do not repeat a song, the seam bar's actions one click away, and the import fix
    // that kept a ten-thousand-song folder busy for the better part of half an hour.
    features: [
        { id: 'shuffle', icon: Shuffle },
        { id: 'seamActions', icon: ListMusic },
        { id: 'importSpeed', icon: Zap },
        { id: 'collageFix', icon: SquareDashed },
    ],
};
