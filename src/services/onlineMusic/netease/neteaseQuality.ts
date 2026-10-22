import type { AudioQualityPreference } from '../../../types/onlineMusic';

// Enhanced stream names belong to this adapter; other providers only see shared quality preferences.
export const NETEASE_QUALITY_LEVELS: readonly AudioQualityPreference[] = ['standard', 'high', 'lossless', 'hires', 'spatial', 'master', 'surround'];
const levels: Record<AudioQualityPreference, string> = {
    standard: 'standard', high: 'exhigh', ultra: 'exhigh', lossless: 'lossless', hires: 'hires',
    spatial: 'jyeffect', master: 'jymaster', surround: 'sky',
};
export const neteaseQualityLevel = (quality: AudioQualityPreference): string => levels[quality];
export function actualNeteaseQuality(raw: unknown, requested: AudioQualityPreference): AudioQualityPreference {
    if (typeof raw !== 'string') return requested;
    return NETEASE_QUALITY_LEVELS.find(quality => levels[quality] === raw) ?? requested;
}
export const isEnhancedNeteaseQuality = (quality: AudioQualityPreference): boolean => quality === 'spatial' || quality === 'master' || quality === 'surround';
