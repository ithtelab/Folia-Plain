import { useEffect, useState, type CSSProperties } from 'react';
import { Grid3DSlider } from '../../src/library/suites/grid/home/Grid3DSlider';
import WallBackButton from '../../src/components/wall/WallBackButton';
import { useGlassSettingsStore } from '../../src/stores/useGlassSettingsStore';
import { useThemeSettingsStore } from '../../src/stores/useThemeSettingsStore';
import type { ProbeDefinition } from './definition';

// Actual playlist cards and shared wall navigation over a patterned background, in both materials.
const items = ['Quiet moments', 'Collected favourites', 'Evening sessions'].map((name, index) => ({
    id: index, name, type: 'playlist', description: 'Folia Plain Sessions', trackCount: 24,
    coverUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${['#879ba0', '#bdb293', '#928ba5'][index]}"/><circle cx="200" cy="170" r="110" fill="#f6ead3"/><text x="24" y="368" fill="#343637" font-size="28">${name}</text></svg>`)}`,
}));

function Probe() {
    const [daylight, setDaylight] = useState(true);
    const [focused, setFocused] = useState(1);
    const [action, setAction] = useState('none');
    const enabled = useGlassSettingsStore(state => state.liquidGlassEnabled);
    useEffect(() => { useThemeSettingsStore.setState({ isDaylight: daylight }); }, [daylight]);
    return (
        <div data-home-glass data-action={action} className="absolute inset-0" style={{
            '--text-primary': daylight ? '#1c1917' : '#f7f4ee', '--text-secondary': daylight ? '#625c56' : '#c4b9ae',
            '--bg-color': daylight ? '#eee9e0' : '#28211b',
            color: 'var(--text-primary)',
            background: `repeating-linear-gradient(110deg, transparent 0 140px, ${daylight ? '#aa968840' : '#cf97501f'} 140px 280px), linear-gradient(35deg, ${daylight ? '#d5d1c9, #efe5d8' : '#272019, #6b4b2b'})`,
        } as CSSProperties}>
            <div className="absolute right-8 top-6 z-50 flex gap-5 text-sm">
                <button data-material-toggle onClick={() => useGlassSettingsStore.getState().setLiquidGlassEnabled(!enabled)}>{enabled ? 'Liquid Glass' : 'Classic'}</button>
                <button data-tone-toggle onClick={() => setDaylight(value => !value)}>Theme</button>
            </div>
            <WallBackButton label="Back" onBack={() => setAction('back')} />
            <Grid3DSlider items={items} focusedIndex={focused} onFocusedIndexChange={setFocused}
                onSelect={item => setAction(`open:${item.id}`)} isDaylight={daylight} />
        </div>
    );
}

export default { id: 'homeGlassCards', title: 'Home glass cards', description: 'Actual playlist card and shared back-button materials, classic fallback and light/dark comparison.', Component: Probe } satisfies ProbeDefinition;
