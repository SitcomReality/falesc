#!/usr/bin/env node
/**
 * Zero-dependency static file server for local FALESC development.
 *
 * Usage:
 *   npm run dev
 *   npm run dev -- --port 3000 --host 0.0.0.0
 *   npm run dev -- --strict-port   # fail instead of choosing the next free port
 *
 * The project is a zero-build game: this only serves the repository over HTTP so
 * native ES modules and the import map in index.html can load.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
};

const args = process.argv.slice(2);

function readOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

const host = readOption('--host', process.env.HOST || '127.0.0.1');
const strictPort = args.includes('--strict-port');
const startPort = Number(readOption('--port', process.env.PORT || 5173));

if (!Number.isInteger(startPort) || startPort < 0 || startPort > 65535) {
  console.error(`Invalid port: ${startPort}`);
  process.exit(1);
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(body);
}

/** Resolve a URL pathname to a file inside ROOT, or null if unsafe. */
function resolveRequestPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  // Refuse dotfiles/directories (e.g. /.git, /.env) and null bytes.
  if (decoded.includes('\0')) return null;
  const segments = decoded.split('/');
  if (segments.some((segment) => segment.startsWith('.') && segment !== '' && segment !== '.')) {
    return null;
  }

  const filePath = resolve(ROOT, `.${decoded}`);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${sep}`)) return null;
  return filePath;
}

async function handleRequest(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, 'Method Not Allowed\n', { Allow: 'GET, HEAD' });
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch {
    send(response, 400, 'Bad Request\n');
    return;
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  let filePath = resolveRequestPath(pathname);
  if (!filePath) {
    send(response, 403, 'Forbidden\n');
    return;
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = resolve(filePath, 'index.html');
      fileStat = await stat(filePath);
    }
  } catch {
    send(response, 404, `Not Found: ${pathname}\n`);
    return;
  }

  if (!fileStat.isFile()) {
    send(response, 404, 'Not Found\n');
    return;
  }

  const contentType = MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  response.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': fileStat.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', (error) => {
    console.error(`Failed to read ${filePath}:`, error.message);
    response.destroy();
  });
  stream.pipe(response);
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error('Unhandled request error:', error);
    if (!response.headersSent) send(response, 500, 'Internal Server Error\n');
    else response.destroy();
  });
});

function listen(port) {
  return new Promise((resolvePromise, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolvePromise(server.address());
    };
    const cleanup = () => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

async function start() {
  const maxAttempts = strictPort ? 1 : 20;
  let port = startPort;
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const address = await listen(port);
      const actualPort = typeof address === 'object' && address ? address.port : port;
      console.log('FALESC dev server');
      console.log(`  Local: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${actualPort}/`);
      console.log(`  Root:  ${ROOT}`);
      console.log('  Press Ctrl+C to stop.');
      return;
    } catch (error) {
      lastError = error;
      if (error.code !== 'EADDRINUSE' || strictPort) break;
      console.warn(`Port ${port} is in use, trying ${port + 1}...`);
      port += 1;
    }
  }

  console.error(`Could not start dev server: ${lastError?.message || 'unknown error'}`);
  if (lastError?.code === 'EADDRINUSE') {
    console.error('Stop the process using that port, or pass --port <number>.');
  }
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // Do not wait forever for keep-alive sockets.
    setTimeout(() => process.exit(0), 1000).unref();
  });
}

start();
