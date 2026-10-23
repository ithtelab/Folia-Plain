import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/locales/en';
import inLocale from '../../src/i18n/locales/in';
import zhCN from '../../src/i18n/locales/zh-CN';
import { NEW_FEATURES_RELEASE } from '../../src/components/modal/newFeaturesRelease';
import { USER_GUIDE_AUTO_OPEN_VERSION } from '../../src/components/modal/userGuideContent';

// test/unit/newFeaturesRelease.test.ts
// The release intro reads every card's text by key at render time; a key missing in one locale shows the raw key there.

const LOCALES = { en, in: inLocale, 'zh-CN': zhCN } as Record<string, unknown>;

const lookup = (tree: unknown, path: string): unknown => path.split('.').reduce<unknown>(
    (node, segment) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined),
    tree,
);

describe('new features release', () => {
    it.each(Object.keys(LOCALES))('has the intro and every card title / description in %s', (locale) => {
        const tree = LOCALES[locale];
        const texts = [
            `${NEW_FEATURES_RELEASE.i18nKey}.intro`,
            ...NEW_FEATURES_RELEASE.features.flatMap(feature => [
                `${NEW_FEATURES_RELEASE.i18nKey}.${feature.id}.title`,
                `${NEW_FEATURES_RELEASE.i18nKey}.${feature.id}.description`,
            ]),
        ];
        for (const key of texts) {
            expect(lookup(tree, key), key).toEqual(expect.any(String));
        }
    });

    it.each(Object.keys(LOCALES))('has the major update label in %s whenever the release names one', (locale) => {
        if (!NEW_FEATURES_RELEASE.majorUpdate) return;
        const label = lookup(LOCALES[locale], 'help.majorUpdateLabel');
        expect(label).toEqual(expect.stringContaining('{{codename}}'));
    });

    it('uses card ids once each and the release key that matches the auto-open version', () => {
        const ids = NEW_FEATURES_RELEASE.features.map(feature => feature.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(NEW_FEATURES_RELEASE.i18nKey).toBe(`releaseNotes.v${(USER_GUIDE_AUTO_OPEN_VERSION ?? '').replace(/\./g, '_')}`);
    });

    // v0.7.25 shipped with four cards copied from v0.7.24 and one naming a feature that landed
    // after the tag: the dialog and the GitHub release both told readers about work they already
    // had. The checks below make that hard to do again without noticing.
    describe('says only what this release changed', () => {
        const currentVersion = USER_GUIDE_AUTO_OPEN_VERSION ?? '';
        const releaseNotes = (zhCN as unknown as Record<string, unknown>).releaseNotes as
            | Record<string, Record<string, unknown>>
            | undefined;
        const currentKey = `v${currentVersion.replace(/\./g, '_')}`;

        /** Card ids of the release one patch version before the current one, when its notes are kept. */
        const previousIds = (): string[] => {
            const [major, minor, patch] = currentVersion.split('.').map(Number);
            if (![major, minor, patch].every(Number.isFinite)) return [];
            const block = releaseNotes?.[`v${major}_${minor}_${patch - 1}`];
            if (!block || typeof block !== 'object') return [];
            return Object.keys(block).filter(key => key !== 'intro');
        };

        it('reuses no card id from the previous release', () => {
            const previous = previousIds();
            expect(previous.length, 'the previous release notes should still be there to compare against').toBeGreaterThan(0);
            const repeated = NEW_FEATURES_RELEASE.features
                .map(feature => feature.id)
                .filter(id => previous.includes(id));
            expect(repeated, 'a card copied from the previous release').toEqual([]);
        });

        it('matches this release\'s block exactly, so no card renders as a raw key and none is left orphaned', () => {
            const block = releaseNotes?.[currentKey];
            expect(block).toBeDefined();
            const inBlock = Object.keys(block ?? {}).filter(key => key !== 'intro');
            expect(new Set(inBlock)).toEqual(new Set(NEW_FEATURES_RELEASE.features.map(feature => feature.id)));
        });
    });
});
