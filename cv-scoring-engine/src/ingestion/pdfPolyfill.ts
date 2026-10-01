// pdf-parse's underlying pdfjs-dist library expects certain browser globals
// (DOMMatrix, ImageData, Path2D) to exist, normally supplied via its optional
// native dependency @napi-rs/canvas. That dependency is a platform-specific
// native binary, and Vercel's serverless function file-tracing does not
// reliably include it (it's required dynamically inside a try/catch, which
// static tracers can miss) — so in production it's often simply absent from
// the deployed bundle.
//
// When @napi-rs/canvas fails to load, pdfjs-dist logs a warning and continues,
// but then references these globals directly anyway, throwing a
// ReferenceError at MODULE EVALUATION time (i.e. during the `import` itself)
// — before any application try/catch ever runs, which is why this crash was
// surfacing as an empty, unparseable server response rather than a caught
// error.
//
// We only ever use pdf-parse for plain text extraction (getText()), never
// rendering, so these globals are never actually exercised — minimal no-op
// stubs are sufficient to stop the crash. This file has no imports and must
// be the first thing extractText.ts imports, so the stubs exist before
// pdf-parse (and therefore pdfjs-dist) is ever evaluated.
function stub(name: string, impl: unknown): void {
  const scope = globalThis as unknown as Record<string, unknown>;
  if (typeof scope[name] === "undefined") {
    scope[name] = impl;
  }
}

stub("DOMMatrix", class DOMMatrix {});
stub("ImageData", class ImageData {});
stub("Path2D", class Path2D {});
