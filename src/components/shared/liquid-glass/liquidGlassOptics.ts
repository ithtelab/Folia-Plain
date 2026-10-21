// A rounded lens normal map, sampled only when a glass surface changes size.

export interface GlassLensMap {
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
}

/** Encode edge normals in R/G and the optical rim's coverage in B. The centre stays flat. */
export function createGlassLensMap(width: number, height: number, radius: number): GlassLensMap {
    const density = Math.min(0.75, 1024 / width, 256 / height);
    const mapWidth = Math.max(1, Math.ceil(width * density));
    const mapHeight = Math.max(1, Math.ceil(height * density));
    const pixels = new Uint8ClampedArray(mapWidth * mapHeight * 4);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const corner = Math.max(0, Math.min(radius, halfWidth, halfHeight));
    const rim = Math.min(12, halfHeight * 0.48);

    for (let y = 0; y < mapHeight; y += 1) {
        for (let x = 0; x < mapWidth; x += 1) {
            const px = (x + 0.5) * width / mapWidth - halfWidth;
            const py = (y + 0.5) * height / mapHeight - halfHeight;
            const qx = Math.abs(px) - halfWidth + corner;
            const qy = Math.abs(py) - halfHeight + corner;
            const ox = Math.max(qx, 0);
            const oy = Math.max(qy, 0);
            const length = Math.hypot(ox, oy);
            const distance = corner - length - Math.min(Math.max(qx, qy), 0);
            const depth = Math.max(0, Math.min(1, distance / rim));
            const coverage = distance >= 0 ? 1 - depth * depth * (3 - 2 * depth) : 0;
            // A smooth meniscus pulls the scene inward at the rim, without rippling its centre.
            const bend = Math.sin(depth * Math.PI) * coverage;
            const nx = length > 0 ? ox / length : qx > qy ? 1 : 0;
            const ny = length > 0 ? oy / length : qx > qy ? 0 : 1;
            const offset = (y * mapWidth + x) * 4;
            pixels[offset] = 128 - Math.sign(px) * nx * bend * 126;
            pixels[offset + 1] = 128 - Math.sign(py) * ny * bend * 126;
            pixels[offset + 2] = coverage * 255;
            pixels[offset + 3] = 255;
        }
    }

    return { width: mapWidth, height: mapHeight, pixels };
}
