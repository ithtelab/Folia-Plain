// src/services/wholeQueueWrites.ts
// How many times the whole play queue was replaced at once (Folium's `folium.playback.replaceQueue`, and
// the user's undo of it). The host's paths that read the queue, wait, and then write it back compare the
// count from before their wait with the count after it: a change means the queue they read is gone, and
// they leave the new one standing (the queue and library controllers, the session restore, the window
// handoff). With no writer the count never moves and those paths behave as they always did.
//
// Kept out of hostExtensionHooks.ts on purpose: several tests replace that module whole with a factory,
// and a new export missing from it would break every controller that calls it.

let writes = 0;

/** Counts one whole-queue write; called just before the store write itself. */
export const noteWholeQueueWrite = () => {
    writes += 1;
};

/** The whole-queue writes so far. It only grows: compare two readings rather than resetting it. */
export const wholeQueueWritesSoFar = () => writes;
