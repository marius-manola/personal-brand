import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function appendPipelineLog(logFile, line) {
  await mkdir(dirname(logFile), { recursive: true });
  const stamp = new Date().toISOString();
  await appendFile(logFile, `[${stamp}] ${line}\n`, 'utf8');
}
