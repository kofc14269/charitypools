import '@testing-library/jest-dom';

// Let React know the test environment supports `act()` (React 18+/19+)
// this prevents the "not configured to support act(...)" warning.
// See: https://reactjs.org/docs/test-utils.html#act
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Minimal mocks used by tests
if (typeof window.HTMLCanvasElement !== 'undefined') {
  // Provide a no-op toBlob for jsdom environment if missing
  // @ts-ignore
  if (!HTMLCanvasElement.prototype.toBlob) {
    // @ts-ignore
    HTMLCanvasElement.prototype.toBlob = function (cb: any) {
      const data = this.toDataURL && this.toDataURL();
      // tiny transparent PNG fallback
      const b = atob(data.split(',')[1] || '');
      const u8 = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
      cb(new Blob([u8], { type: 'image/png' }));
    };
  }
}

// Provide Image constructor behavior for validateImageUrl tests
class TestImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  set src_(v: string) { this.src = v; }
}
// leave default Image behavior to jsdom, tests will stub when needed
// provide fetch polyfill if absent (vitest supplies one normally)
