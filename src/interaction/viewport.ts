import type { Box } from '../layout/layout';
import type { Viewport } from '../types';
export const clampZoom = (zoom: number): number => Math.min(4, Math.max(.25, zoom));
export function zoomAt(view: Viewport, zoom: number, x: number, y: number): Viewport {
    zoom = clampZoom(zoom);
    const ratio = zoom / view.zoom;
    return { x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio, zoom };
}
export function fitBounds(bounds: Box, width: number, height: number): Viewport {
    const zoom = clampZoom(Math.min(Math.max(1, width - 48) / bounds.width, Math.max(1, height - 48) / bounds.height));
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
