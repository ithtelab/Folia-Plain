import { describe, expect, it } from 'vitest';
import en from '../../../src/i18n/locales/en';
import inLocale from '../../../src/i18n/locales/in';
import vi from '../../../src/i18n/locales/vi';
import zhCN from '../../../src/i18n/locales/zh-CN';

// test/unit/i18n/placeholderParity.test.ts
// Every locale has to interpolate exactly what `en` does. A key that reaches i18next without the
// placeholder it needs renders the literal `{{name}}` on screen; one that stops spelling the
// modifier as `{{mod}}` tells macOS readers to press Ctrl. The release sync did the second to 14
// keys in zh-CN and in at once, and nothing caught it: vietnameseLocale.test.ts only holds vi
// against en.

type Bundle = Record<string, unknown>;

const flatten = (node: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> => {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const [key, value] of Object.entries(node as Bundle)) {
            flatten(value, prefix ? `${prefix}.${key}` : key, out);
        }
        return out;
    }
    out[prefix] = String(node);
    return out;
};

const placeholdersOf = (value: string) => (value.match(/\{\{[^}]+\}\}/g) ?? []).sort();

const flatEN = flatten(en);
const LOCALES = { 'zh-CN': flatten(zhCN), in: flatten(inLocale), vi: flatten(vi) } as Record<string, Record<string, string>>;

const KNOWN: Record<string, string[]> = {
    'zh-CN': [
        'status.songUnavailableAlternativeDescription',
        'localMusic.entityEditorHint',
        'localMusic.entityMergeHint',
    ],
    in: [],
    vi: [],
};

describe('every locale interpolates what en interpolates', () => {
    it.each(Object.keys(LOCALES))('matches the placeholder set in %s', (locale) => {
        const flat = LOCALES[locale];
        const known = new Set(KNOWN[locale] ?? []);
        const mismatched = Object.keys(flatEN)
            .filter(key => !known.has(key))
            .filter(key => JSON.stringify(placeholdersOf(flatEN[key])) !== JSON.stringify(placeholdersOf(flat[key] ?? '')));
        expect(mismatched, `keys whose placeholders differ from en: ${mismatched.slice(0, 10).join(', ')}`).toEqual([]);
    });

    it('keeps the allowance honest: none of the listed keys matches en any more', () => {
        for (const [locale, keys] of Object.entries(KNOWN)) {
            const stale = keys.filter(key => (
                JSON.stringify(placeholdersOf(flatEN[key])) === JSON.stringify(placeholdersOf(LOCALES[locale]?.[key] ?? ''))
            ));
            expect(stale, `${locale}: these now match en, take them out of the allowance`).toEqual([]);
        }
    });
});
