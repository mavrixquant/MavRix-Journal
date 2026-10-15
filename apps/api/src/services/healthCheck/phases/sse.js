// apps/api/src/services/healthCheck/phases/sse.js
//
// SSE phase — 1 test.
// Opens the /api/events stream, waits for the `hello` handshake, closes.
// Uses native fetch with a ReadableStream reader — Node 20+ supports it.

export async function run(ctx) {
  const { test, tokens } = ctx;

  await test('sse.connect · opens /api/events and receives hello', async () => {
    const url = `${ctx.baseUrl}/api/events?token=${encodeURIComponent(tokens.admin)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`SSE connect failed: ${err?.message || err}`);
    }

    if (res.status !== 200) {
      clearTimeout(timeout);
      throw new Error(`SSE returned HTTP ${res.status}`);
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/event-stream')) {
      clearTimeout(timeout);
      throw new Error(`unexpected content-type: ${ct}`);
    }

    // Read the first SSE chunk. The server writes the `hello` event
    // immediately on connect, so we only need one read.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gotHello = false;

    try {
      // Read up to a few chunks in case of leading comments.
      for (let i = 0; i < 5 && !gotHello; i++) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.includes('event: hello')) {
          gotHello = true;
          break;
        }
      }
    } finally {
      clearTimeout(timeout);
      try { await reader.cancel(); } catch { /* noop */ }
      try { controller.abort(); } catch { /* noop */ }
    }

    if (!gotHello) {
      throw new Error(`did not receive hello event. buffer=${buffer.slice(0, 200)}`);
    }
  });
}