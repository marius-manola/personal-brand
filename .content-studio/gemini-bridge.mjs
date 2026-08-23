import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  geminiClose,
  geminiConnect,
  geminiForceRestart,
  geminiGenerate,
  geminiStatus,
} from '../lib/content-studio/gemini-images.mjs';

const PORT = Number(process.env.CONTENT_STUDIO_GEMINI_PORT || 18765);
const PID_FILE = join(process.cwd(), '.content-studio', 'gemini-bridge.pid');
const GEMINI = {
  engine: {
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    channel: null,
  },
  webReference: false,
  promptPrefix: 'Create image: ',
};

writeFileSync(PID_FILE, String(process.pid), 'utf8');

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://127.0.0.1:${PORT}`);
  try {
    if (request.method === 'GET' && url.pathname === '/status') {
      json(response, 200, { engine: 'playwright', ...(await geminiStatus(GEMINI)) });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/connect') {
      json(response, 200, { engine: 'playwright', ...(await geminiConnect(GEMINI)) });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/stop') {
      await geminiForceRestart();
      json(response, 200, { ok: true });
      return;
    }
    if (request.method === 'POST' && url.pathname === '/generate') {
      const body = await readBody(request);
      const result = await geminiGenerate({
        prompt: body.prompt,
        referencePrompt: body.referencePrompt || null,
        fallbackPrompt: body.fallbackPrompt,
        timeoutMs: body.timeoutMs || 75_000,
        bluffRetry: body.bluffRetry || null,
        newChat: Boolean(body.newChat),
        gemini: GEMINI,
      });
      json(response, 200, {
        mime: result.mime,
        buffer: Buffer.from(result.buffer).toString('base64'),
      });
      return;
    }
    json(response, 404, { error: 'not found' });
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, '127.0.0.1');

const cleanup = async () => {
  try { await geminiClose(); } catch { /* ignore */ }
  process.exit(0);
};
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
