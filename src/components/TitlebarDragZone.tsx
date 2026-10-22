import React from 'react';

// Keep native dragging available independently of whether the window controls are revealed.
export default function TitlebarDragZone({
    active,
}: {
    active: boolean;
}) {
    if (!active) return null;

    return (
        <div
            data-titlebar-drag-zone
            className="absolute inset-0 pointer-events-auto"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
    );
}
