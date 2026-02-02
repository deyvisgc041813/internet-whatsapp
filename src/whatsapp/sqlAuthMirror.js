import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { prisma } from '../db/pool.js';

function zipFolderToBuffer(dir) {
  const files = [];
  (function walk(d) {
    fs.readdirSync(d).forEach((f) => {
      const p = path.join(d, f);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) walk(p);
      else files.push({ rel: path.relative(dir, p), data: fs.readFileSync(p) });
    });
  })(dir);
  const payload = JSON.stringify(files.map((f) => ({ r: f.rel, b: f.data.toString('base64') })));
  return zlib.gzipSync(Buffer.from(payload));
}

function unzipBufferToFolder(buf, dir) {
  if (!buf) return;
  fs.mkdirSync(dir, { recursive: true });
  const json = JSON.parse(zlib.gunzipSync(buf).toString());
  json.forEach((f) => {
    const p = path.join(dir, f.r);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, Buffer.from(f.b, 'base64'));
  });
}

export async function restoreAuthFromDB(sessionId, authDir) {
  const row = await prisma.wasSession.findUnique({ where: { id: sessionId } });
  if (row?.authSnapshot && !fs.existsSync(authDir)) {
    unzipBufferToFolder(row.authSnapshot, authDir);
  }
}

export async function backupAuthToDB(sessionId, authDir, status) {
  if (!fs.existsSync(authDir)) return;
  const buf = zipFolderToBuffer(authDir);
  await prisma.wasSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, status, authSnapshot: buf },
    update: { authSnapshot: buf, updatedAt: new Date() },
  });
}
