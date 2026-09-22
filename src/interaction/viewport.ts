import type { Box } from '../layout/layout';
import type { Viewport, ZoomOptions } from '../types';
const defaultZoom: Readonly<ZoomOptions> = { min: .25, max: 4, default: 1 };
export function resolveZoomOptions(options?: Partial<ZoomOptions>): ZoomOptions {
    const result = { ...defaultZoom, ...options };
    if (![result.min, result.max, result.default].every(value => Number.isFinite(value) && value > 0)
        || result.min > result.default || result.default > result.max)
        throw new RangeError('Zoom scales must be finite and positive, with min <= default <= max.');
    return result;
}
export const clampZoom = (zoom: number, limits: Pick<ZoomOptions, 'min' | 'max'> = defaultZoom): number => Math.min(limits.max, Math.max(limits.min, zoom));
export function zoomAt(view: Viewport, zoom: number, x: number, y: number, limits = defaultZoom): Viewport {
    zoom = clampZoom(zoom, limits);
    const ratio = zoom / view.zoom;
    return { x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, zoom };
}
export function fitBounds(bounds: Box, width: number, height: number, limits = defaultZoom): Viewport {
    const zoom = clampZoom(Math.min(Math.max(1, width - 48) / bounds.width, Math.max(1, height - 48) / bounds.height), limits);
    return { x: width / 2 - (bounds.x + bounds.width / 2) * zoom, y: height / 2 - (bounds.y + bounds.height / 2) * zoom, zoom };
}
export function reveal(view: Viewport, box: Box, width: number, height: number): Viewport {
    const axis = (position: number, size: number, translation: number, available: number): number => {
        const start = position * view.zoom + translation, end = start + size * view.zoom;
        if (end - start > available - 32) return available / 2 - (position + size / 2) * view.zoom;
        return translation + (start < 16 ? 16 - start : end > available - 16 ? available - 16 - end : 0);
    };
    return { x: axis(box.x, box.width, view.x, width), y: axis(box.y, box.height, view.y, height), zoom: view.zoom };
}
