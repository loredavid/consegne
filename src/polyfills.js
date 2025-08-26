// Browser polyfills for Node.js modules

// Setup global object
if (typeof global === 'undefined') {
  globalThis.global = globalThis;
}

// Buffer polyfill
try {
  const { Buffer } = await import('buffer');
  globalThis.Buffer = Buffer;
  window.Buffer = Buffer;
} catch (error) {
  console.warn('Failed to load Buffer polyfill:', error);
}

// Process polyfill
try {
  const process = await import('process/browser');
  globalThis.process = process.default || process;
} catch (error) {
  console.warn('Failed to load process polyfill:', error);
  // Fallback minimal process object
  globalThis.process = {
    env: {},
    nextTick: (fn) => setTimeout(fn, 0),
    version: 'v16.0.0',
    browser: true
  };
}
