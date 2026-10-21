import { type Line, type VisualizerMode } from '../../types';
import { getLineRenderEndTime } from '../../utils/lyrics/renderHints';
import placeholderCoverUrl from '../../../assets/placeholder_cover.svg';
import placeholderCover2Url from '../../../assets/placeholder_cover-2.svg';
import { getVisualizerPreviewStartOffset } from './registry';

const createCharacterWords = (text: string, startTime: number, endTime: number) => {
    const chars = Array.from(text);
    const duration = endTime - startTime;

    return chars.map((char, index) => {
        const charStart = startTime + duration * (index / chars.length);
        const charEnd = startTime + duration * ((index + 1) / chars.length);

        return {
            text: char,
            startTime: charStart,
            endTime: charEnd,
        };
    });
};

const createTokenWords = (tokens: string[], startTime: number, endTime: number) => {
    const duration = endTime - startTime;

    return tokens.map((token, index) => ({
        text: token,
        startTime: startTime + duration * (index / tokens.length),
        endTime: startTime + duration * ((index + 1) / tokens.length),
    }));
};

// Original preview lines demonstrate mixed scripts and background vocals without quoting songs.
const DEFAULT_PREVIEW_PLACEHOLDER_LINES: Line[] = [
    {
        startTime: 0.7,
        endTime: 3.6,
        fullText: '静听微光穿过窗，让旋律慢慢醒来。',
        translation: 'Let the first light in; let the melody unfold.',
        romanization: 'Jìng tīng wēiguāng chuānguò chuāng, ràng xuánlǜ mànmàn xǐnglái.',
        words: createCharacterWords('静听微光穿过窗，让旋律慢慢醒来。', 0.7, 3.6),
        backgroundVocal: {
            text: 'closer to the morning',
            startTime: 1.3,
            endTime: 3.1,
            words: createTokenWords(['closer', 'to', 'the', 'morning'], 1.3, 3.1),
            translation: '向清晨再靠近一些。',
            romanization: 'closer to the morning',
        },
    },
    {
        startTime: 4.2,
        endTime: 7.2,
        fullText: 'We follow the rhythm of a quiet morning.',
        translation: '我们跟随清晨安静的节拍。',
        romanization: 'We follow the rhythm of a quiet morning.',
        words: createTokenWords(
            ['We', 'follow', 'the', 'rhythm', 'of', 'a', 'quiet', 'morning.'],
            4.2,
            7.2,
        ),
        backgroundVocal: {
            text: '风经过，声音留下。',
            startTime: 4.8,
            endTime: 6.6,
            words: createCharacterWords('风经过，声音留下。', 4.8, 6.6),
            translation: 'The breeze passes; the sound stays.',
            romanization: 'Fēng jīngguò, shēngyīn liúxià.',
        },
    },
    {
        startTime: 7.8,
        endTime: 10.9,
        fullText: 'La lumière avance au rythme de nos pas.',
        translation: '光沿着我们的步伐缓缓向前。',
        romanization: 'La lumière avance au rythme de nos pas.',
        words: createTokenWords(
            ['La', 'lumière', 'avance', 'au', 'rythme', 'de', 'nos', 'pas.'],
            7.8,
            10.9,
        ),
        backgroundVocal: {
            text: 'a new day begins',
            startTime: 8.4,
            endTime: 10.2,
            words: createTokenWords(['a', 'new', 'day', 'begins'], 8.4, 10.2),
            translation: '新的一天开始了。',
            romanization: 'a new day begins',
        },
    },
    {
        startTime: 11.5,
        endTime: 14.4,
        fullText: '把今天的风，轻轻唱成一段远行。',
        translation: 'Turn today’s breeze into a song for the road.',
        romanization: 'Bǎ jīntiān de fēng, qīngqīng chàng chéng yī duàn yuǎnxíng.',
        words: createCharacterWords('把今天的风，轻轻唱成一段远行。', 11.5, 14.4),
    },
];

const OPEN_ROADS_PREVIEW_PLACEHOLDER_LINES: Line[] = [
    {
        startTime: 0,
        endTime: 3.1,
        fullText: 'Every open road begins with a quiet step.',
        translation: '每一段远行，都从安静的一步开始。',
        romanization: 'Every open road begins with a quiet step.',
        words: createTokenWords(['Every', 'open', 'road', 'begins', 'with', 'a', 'quiet', 'step.'], 0, 3.1),
    },
    {
        startTime: 3.6,
        endTime: 6.9,
        fullText: '沿着河流的方向，听见城市渐渐远去。',
        translation: 'Follow the river and hear the city fade away.',
        romanization: 'Yánzhe héliú de fāngxiàng, tīngjiàn chéngshì jiànjiàn yuǎnqù.',
        words: createCharacterWords('沿着河流的方向，听见城市渐渐远去。', 3.6, 6.9),
        backgroundVocal: {
            text: 'The horizon has room for another song.',
            startTime: 4.2,
            endTime: 6.6,
            words: createTokenWords(['The', 'horizon', 'has', 'room', 'for', 'another', 'song.'], 4.2, 6.6),
            translation: '地平线还容得下一首歌。',
            romanization: 'The horizon has room for another song.',
        },
    },
    {
        startTime: 7.4,
        endTime: 10.3,
        fullText: 'Un souffle léger accompagne nos pas.',
        translation: '一阵轻风伴着我们的脚步。',
        romanization: 'Un souffle léger accompagne nos pas.',
        words: createTokenWords(['Un', 'souffle', 'léger', 'accompagne', 'nos', 'pas.'], 7.4, 10.3),
    },
    {
        startTime: 10.8,
        endTime: 13.6,
        fullText: '下一段旋律，就在前方。',
        translation: 'The next melody is just ahead.',
        romanization: 'Xià yī duàn xuánlǜ, jiù zài qiánfāng.',
        words: createCharacterWords('下一段旋律，就在前方。', 10.8, 13.6),
    },
];

export type PreviewPlaceholderId = 'default' | 'reserved';

export interface PreviewPlaceholder {
    id: PreviewPlaceholderId;
    title: string;
    lines: Line[];
    loopDuration: number;
    coverUrl: string;
}

export const VIS_PLAYGROUND_PREVIEW_PLACEHOLDERS: Record<PreviewPlaceholderId, PreviewPlaceholder> = {
    default: {
        id: 'default',
        title: 'First Light',
        lines: DEFAULT_PREVIEW_PLACEHOLDER_LINES,
        loopDuration: 14.4,
        coverUrl: placeholderCoverUrl,
    },
    reserved: {
        id: 'reserved',
        title: 'Open Roads',
        lines: OPEN_ROADS_PREVIEW_PLACEHOLDER_LINES,
        loopDuration: 13.6,
        coverUrl: placeholderCover2Url,
    },
};

export const VIS_PLAYGROUND_PREVIEW_LINES = VIS_PLAYGROUND_PREVIEW_PLACEHOLDERS.default.lines;
export const VIS_PLAYGROUND_PREVIEW_LOOP_DURATION = VIS_PLAYGROUND_PREVIEW_PLACEHOLDERS.default.loopDuration;
export const VIS_PLAYGROUND_PREVIEW_COVER_URL = VIS_PLAYGROUND_PREVIEW_PLACEHOLDERS.default.coverUrl;

export const getPreviewPlaceholderStartOffset = (mode: VisualizerMode, loopDuration: number) =>
    getVisualizerPreviewStartOffset(mode, loopDuration);

export const findPreviewPlaceholderLineIndex = (lines: Line[], time: number) => {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index];
        if (!line || time < line.startTime) {
            continue;
        }

        if (time <= getLineRenderEndTime(line)) {
            return index;
        }
    }

    return -1;
};
