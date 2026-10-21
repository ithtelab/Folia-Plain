import React, { useState } from 'react';
import { motionValue } from 'framer-motion';
import { ArrowLeft, Search, PanelsTopLeft } from 'lucide-react';
import FloatingPlayerControls from '../../src/components/FloatingPlayerControls';
import LiquidGlassSurface from '../../src/components/shared/liquid-glass/LiquidGlassSurface';
import { PlayerState } from '../../src/types';
import type { ProbeDefinition } from './definition';
import NowPlayingToast from '../../src/components/app/overlays/NowPlayingToast';
import PanelHandle from '../../src/components/panelTab/shell/PanelHandle';
import { DEFAULT_THEME } from '../../src/services/baseThemes';

// The real player over varied, original artwork; query parameters also exercise bright/striped backdrops.
const clock = motionValue(137);
const noop = () => {};
const albums = [
    ['AFTER HOURS', 'A study in blue', '#517e99', '#172331'],
    ['SOLSTICE', 'Warm frequencies', '#edb581', '#614341'],
    ['FORMA', 'Shapes in sound', '#c0c5ab', '#3b574d'],
    ['SLOW MOTION', 'Quiet geometry', '#a594b3', '#443247'],
    ['TIDELINES', 'The open water', '#8fb8c4', '#325b6a'],
    ['STILL LIFE', 'Notes on colour', '#caa49a', '#7f4c52'],
    ['NOCTURNE', 'City / night', '#69668e', '#302e4d'],
    ['ECHOES', 'Somewhere else', '#bdc19a', '#5e6957'],
    ['RADIANT', 'A little daylight', '#dec18b', '#967449'],
    ['HORIZON', 'Beyond the frame', '#b6b0a1', '#454d53'],
    ['MONO', 'Collected moments', '#9faaa9', '#424f54'],
    ['PASSAGE', 'Room to breathe', '#9bafc4', '#3f546f'],
];

const LiquidGlassProbe: React.FC = () => {
    const query = new URLSearchParams(location.search);
    const [light, setLight] = useState(query.get('tone') === 'light');
    const [playing, setPlaying] = useState(false);
    const [seeks, setSeeks] = useState(0);
    const [panelOpen, setPanelOpen] = useState(false);
    const [activations, setActivations] = useState(0);
    const [commands, setCommands] = useState(0);
    const striped = query.get('backdrop') === 'stripes';
    return <div data-glass-preview data-seeks={seeks} data-card-activations={activations} data-command-opens={commands} style={{
        position: 'relative', height: '100dvh', overflow: 'hidden',
        background: striped ? 'repeating-linear-gradient(90deg, #204f9a 0 14px, #e8aa64 14px 28px, #cf647f 28px 42px)' : light ? '#e2ded7' : '#242528',
        color: light ? '#202228' : '#f8f9fc',
        '--text-primary': light ? '#202228' : '#f8f9fc',
        '--text-secondary': light ? '#424650' : '#d0d5df',
        '--bg-color': light ? '#f5f5f8' : '#242528',
    } as React.CSSProperties}>
        {!striped && <div style={{ position: 'absolute', inset: '12% -3% -6%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '28px 5%', transform: 'rotate(-5deg) scale(1.05)', opacity: light ? 0.86 : 0.9 }}>
            {albums.map(([title, subtitle, a, b], index) => <div key={title} style={{ padding: 10, borderRadius: 15, background: light ? '#f4f0e9' : '#303134', boxShadow: '0 12px 40px #0002', transform: `translateY(${index % 2 ? 22 : -22}px)` }}>
                <div style={{ position: 'relative', aspectRatio: '1.5', overflow: 'hidden', padding: 18, background: `linear-gradient(${index * 27}deg, ${a}, ${b})`, color: '#fff' }}>
                    <div style={{ position: 'absolute', right: '-10%', bottom: '-45%', width: '90%', aspectRatio: '1', border: '20px solid #ffffff30', borderRadius: index % 3 ? '50%' : 18, transform: 'rotate(25deg)' }} />
                    <div style={{ fontSize: 'clamp(17px, 2.3vw, 34px)', letterSpacing: '-0.04em', fontWeight: 750, position: 'relative', lineHeight: 1 }}>{title}</div>
                    <div style={{ position: 'absolute', left: 18, bottom: 15, fontSize: 9, letterSpacing: '0.18em' }}>FOLIA PLAIN · SESSIONS</div>
                </div>
                <div style={{ padding: '10px 3px 2px', fontSize: 13, fontWeight: 600 }}>{title}</div>
                <div style={{ padding: '0 3px 4px', fontSize: 11, opacity: 0.65 }}>{subtitle}</div>
            </div>)}
        </div>}
        <div style={{ position: 'absolute', left: 32, right: 32, top: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button aria-label="Back" className="liquid-glass-host liquid-glass-button relative rounded-full w-11 h-11 flex items-center justify-center"><LiquidGlassSurface isDaylight={light} /><ArrowLeft size={19} /></button>
            <nav className="liquid-glass-host relative rounded-full flex gap-1 p-1 text-sm">
                <LiquidGlassSurface isDaylight={light} />
                {['歌单', '电台', '探索', '专辑'].map((tab, i) => <button key={tab} className="rounded-full px-5 py-2" style={i === 0 ? { background: '#f8f9fc', color: '#23252a', boxShadow: '0 1px 3px #0001' } : undefined}>{tab}</button>)}
                <button aria-label="Collections" className="px-3"><PanelsTopLeft size={17} /></button>
            </nav>
            <div className="liquid-glass-host relative rounded-full flex items-center gap-2 px-4 py-2.5 w-48"><LiquidGlassSurface isDaylight={light} /><Search size={16} /><span className="opacity-75 text-sm">搜索在线歌曲…</span></div>
        </div>
        <FloatingPlayerControls currentSong={{ name: 'Somewhere, in the quiet' }} playerState={playing ? PlayerState.PLAYING : PlayerState.PAUSED}
            currentTime={clock} duration={252} loopMode="all" currentView="lattice" audioSrc="probe://audio" canTogglePlay
            lyrics={null} onSeek={time => { clock.set(time); setSeeks(n => n + 1); }} onTogglePlay={() => setPlaying(v => !v)} onToggleLoop={noop}
            onNavigateToPlayer={noop} isDaylight={light} primaryColor={light ? '#202228' : '#f8f9fc'} secondaryColor={light ? '#424650' : '#d0d5df'}
            slotPrimary="loop" slotSecondary="queue" slotContext={{ onShuffle: noop, canShuffle: true, onLike: noop, isLiked: false, likeDisabled: false, invokeCommandById: noop, canInvokeCommandById: () => true }}
            onCommitBottomBarOffset={noop} />
        <NowPlayingToast song={{ title: 'Somewhere, in the quiet', artist: 'Folia Plain Sessions', coverUrl: null }}
            trackKey="glass-preview" isDaylight={light} mode="always"
            onActivate={() => setActivations(n => n + 1)} activateLabel="Open current track" />
        <PanelHandle isOpen={panelOpen} onToggle={() => setPanelOpen(v => !v)} theme={DEFAULT_THEME}
            isDaylight={light} showOpenPanelCloseButton isPanelGuideHotspotActive={false} hideToggleButton={false}
            onOpenCommandPalette={() => setCommands(n => n + 1)} isCommandPaletteOpen={false} />
        <button data-preview-tone onClick={() => setLight(v => !v)} className="absolute left-8 top-28 text-xs opacity-70">{light ? '深色预览' : '浅色预览'}</button>
    </div>;
};

const definition: ProbeDefinition = {
    id: 'liquidGlass', title: 'Liquid Glass · 材质与真实播放器',
    description: '在深浅封面、条纹背景上观察边缘折射，并验证真实播放器的点击、进度和缩放。',
    Component: LiquidGlassProbe,
};
export default definition;
