// electron/backgroundThrottling.cjs
// The opt-in 后台节流 switch (性能与动效 page) for the main window. Off, the default, the window keeps
// backgroundThrottling: false, so OBS window capture of a covered or minimised Folia stays live for
// the streamers who rely on it. On, Chromium may throttle the window while it is hidden, and the
// renderer holds the lyric animation while the window is out of focus
// (src/components/app/backgroundThrottling/). The switch stands down while something needs the
// window live whatever its focus: wallpaper mode, always-on-top (the desktop lyric preset), a video
// export, a connected OBS browser source.

const BACKGROUND_THROTTLING_SETTING_KEY = 'BACKGROUND_THROTTLING';

/**
 * Applies the switch to the main window. `isEnabled` reads the saved setting; `getStandDownReason`
 * names what currently needs the window live, or null. Call `refresh` whenever either may have changed.
 */
function createBackgroundThrottling({ isEnabled, getStandDownReason }) {
  let window = null;
  let applied = null;
  let lastReason = null;

  const isActive = () => applied === true;

  const refresh = () => {
    if (!window || window.isDestroyed()) {
      return;
    }
    const enabled = isEnabled();
    const reason = enabled ? getStandDownReason() : null;
    const active = enabled && !reason;
    if (active === applied && reason === lastReason) {
      return;
    }
    const wasApplied = applied;
    applied = active;
    lastReason = reason;
    if (active !== wasApplied) {
      window.webContents.setBackgroundThrottling(active);
      window.webContents.send('background-throttling-changed', active);
    }
    console.info(`[BackgroundThrottling] ${!enabled ? 'Off' : active ? 'On' : `Standing down: ${reason}`}`);
  };

  // A new main window starts at backgroundThrottling: false and has not been told anything yet.
  const attach = (win) => {
    window = win;
    applied = false;
    lastReason = null;
    refresh();
  };

  return { attach, refresh, isActive };
}

module.exports = { BACKGROUND_THROTTLING_SETTING_KEY, createBackgroundThrottling };
