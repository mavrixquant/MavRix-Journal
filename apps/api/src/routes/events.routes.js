import { Router } from 'express';
import { requireAuthSSE } from '../middleware/auth.js';
import { addClient, removeClient, getClientCount } from '../lib/broadcaster.js';

export const eventsRoutes = Router();

const KEEP_ALIVE_MS = 25_000;

eventsRoutes.get('/', requireAuthSSE, (req, res) => {
    const userId = req.userId;

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    res.flushHeaders();

    res.write(`event: hello\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

    addClient(userId, res);

    console.log(
        `[sse] connect  user=${userId.slice(0, 8)}… clients=${getClientCount(userId)}`
    );

    const keepAlive = setInterval(() => {
        try {
        res.write(`: ping ${Date.now()}\n\n`);
        } catch {
        }
    }, KEEP_ALIVE_MS);

    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        clearInterval(keepAlive);
        removeClient(userId, res);
        console.log(
        `[sse] disconnect user=${userId.slice(0, 8)}… clients=${getClientCount(userId)}`
        );
    };

    res.on('close', cleanup);
    res.on('error', cleanup);
});