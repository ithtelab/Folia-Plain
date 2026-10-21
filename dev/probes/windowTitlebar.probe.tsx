import React, { useLayoutEffect, useMemo, useState } from 'react';
import AppShell from '../../src/components/app/AppShell';
import { useAppChromeStore } from '../../src/stores/useAppChromeStore';
import { DEFAULT_THEME } from '../../src/services/baseThemes';
import type { ProbeDefinition } from './definition';

// Exercise real window chrome against inert native commands, without opening or closing a window.
const WindowTitlebarProbe: React.FC = () => {
    const [ready, setReady] = useState(false);
    const [action, setAction] = useState('none');
    const [alwaysShow, setAlwaysShow] = useState(false);
    const revealed = useAppChromeStore(state => state.isTitlebarRevealed);
    const stub = useMemo(() => ({
        platform: 'win32',
        isWindowMaximized: async () => false,
        isWindowFullscreen: async () => false,
        onWindowFullscreenChanged: () => () => {},
        openRemoteControl: async () => { setAction('remote'); },
        toggleFullscreenWindow: async () => { setAction('fullscreen'); },
        toggleMaximizeWindow: async () => { setAction('maximize'); },
        minimizeWindow: async () => { setAction('minimize'); },
        closeWindow: async () => { setAction('close'); },
    }), []);

    useLayoutEffect(() => {
        const previous = window.electron;
        window.electron = stub as unknown as typeof window.electron;
        setReady(true);
        return () => { window.electron = previous; };
    }, [stub]);
    if (!ready) return null;

    return (
        <AppShell appStyle={{ background: '#171b21', color: '#f4f4f5' }}
            theme={DEFAULT_THEME} isDaylight={false} audioElement={null}
            isElectronWindow hideFullscreenButton={false} usesCustomWindowChrome
            useCustomWindowRadius={false} showTransparentWindowBorder={false} isPlayerView={false}
            isTitlebarRevealed={revealed} alwaysShowMainWindowTitlebar={alwaysShow}
            isMainWindowClickThroughEnabled={false} showMainWindowClickThroughToggle={revealed}
            onToggleMainWindowClickThrough={() => setAction('click-through')}>
            <div className="flex items-center gap-6 px-8 pt-[max(2rem,var(--window-titlebar-safe-top,0px))]">
                <button data-titlebar-test-navigation onClick={() => setAction('navigation')}>Library navigation</button>
                <button onClick={() => setAlwaysShow(value => !value)}>Toggle always-visible titlebar</button>
            </div>
            <output data-titlebar-test-action className="mt-8 px-8">{action}</output>
        </AppShell>
    );
};

export default {
    id: 'windowTitlebar', title: '窗口顶栏 · 防误触与命中范围',
    description: '验证导航安全间距、边缘唤出、隐藏控件命中与显式常显。', Component: WindowTitlebarProbe,
} satisfies ProbeDefinition;
