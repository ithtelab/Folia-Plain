// Separate the small activation edge from the window controls and the content safety margin.
export const TITLEBAR_SAFE_TOP = 56;
// Leave room for Windows' native resize border before the renderer can receive pointer events.
export const TITLEBAR_REVEAL_EDGE = 16;
export const TITLEBAR_REVEAL_DELAY_MS = 180;
const TITLEBAR_KEEP_VISIBLE_BOTTOM = 40;

/** A brief crossing never opens the controls; a revealed bar stays reachable across its height. */
export const createTitlebarHover = (onChange: (visible: boolean) => void) => {
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cancel = () => {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
    };
    const leave = () => {
        cancel();
        if (!visible) return;
        visible = false;
        onChange(false);
    };
    return {
        move(y: number) {
            if (y < 0 || y > TITLEBAR_KEEP_VISIBLE_BOTTOM) {
                leave();
            } else if (!visible && y <= TITLEBAR_REVEAL_EDGE) {
                if (timer !== undefined) return;
                timer = setTimeout(() => {
                    timer = undefined;
                    visible = true;
                    onChange(true);
                }, TITLEBAR_REVEAL_DELAY_MS);
            } else if (!visible) {
                cancel();
            }
        },
        leave,
        dispose: leave,
    };
};
