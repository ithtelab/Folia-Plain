import identity from './productIdentity.json' with { type: 'json' };

// Shared fork identity for the renderer and ESM build tools; values live in one JSON file.
export default Object.freeze(identity);
