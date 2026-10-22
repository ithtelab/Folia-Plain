import type { AudioQualityPreference } from '../../../types/onlineMusic';

// Report the actual supported source tier without inferring it from the requested preference.
export const NETEASE_QUALITY_LEVELS: readonly AudioQualityPreference[] = ['standard', 'high', 'lossless', 'hires'];
const levels: Record<AudioQualityPreference, string> = {
    standard: 'standard', high: 'exhigh', ultra: 'exhigh', lossless: 'lossless', hires: 'hires',
};
export const neteaseQualityLevel = (quality: AudioQualityPreference): string => levels[quality];
export function actualNeteaseQuality(raw: unknown, requested: AudioQualityPreference): AudioQualityPreference {
    if (typeof raw !== 'string') return requested;
    return NETEASE_QUALITY_LEVELS.find(quality => levels[quality] === raw) ?? requested;
}
