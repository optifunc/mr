import { expect, it } from 'vitest';
import { fitBounds, resolveZoomOptions, zoomAt } from '../../src/interaction/viewport';

it('keeps existing defaults and copies custom options', () => {
  expect(resolveZoomOptions()).toEqual({ min: .25, max: 4, default: 1 });
  const input = { min: .3575, max: 5.72, default: 1.43 };
  const resolved = resolveZoomOptions(input);
  input.default = 2;
  expect(resolved.default).toBe(1.43);
});
it.each([{ min: 0 }, { min: -1 }, { max: Infinity }, { default: NaN },
  { min: 2 }, { max: .5 }, { min: 4, max: 2 }, { default: 5 }])('rejects invalid zoom settings %j', options => {
  expect(() => resolveZoomOptions(options)).toThrow(RangeError);
});
it('clamps custom pointer zoom while preserving its world anchor', () => {
  const limits = resolveZoomOptions({ min: .3575, max: 5.72, default: 1.43 });
  const before = { x: 100, y: 200, zoom: 1.43 };
  for (const [requested, expected] of [[100, 5.72], [.01, .3575]]) {
    const after = zoomAt(before, requested!, 150, 250, limits);
    expect(after.zoom).toBe(expected);
    expect((150 - after.x) / after.zoom).toBeCloseTo((150 - before.x) / before.zoom);
    expect((250 - after.y) / after.zoom).toBeCloseTo((250 - before.y) / before.zoom);
  }
});
it('applies custom limits to fit without changing its center', () => {
  const limits = resolveZoomOptions({ min: .3575, max: 5.72, default: 1.43 });
  for (const [size, expected] of [[1, 5.72], [10000, .3575]]) {
    const fitted = fitBounds({ x: -size! / 2, y: -size! / 2, width: size!, height: size! }, 800, 600, limits);
    expect(fitted).toEqual({ x: 400, y: 300, zoom: expected });
  }
});
