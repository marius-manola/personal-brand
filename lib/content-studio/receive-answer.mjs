import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appendPipelineLog } from './pipeline-log.mjs';

export const FAIL_SUBMIT_FILE = 'fail-submit-once';

export async function receiveChatGPTAnswer({ runtimeRoot, jobId, turnId, text }) {
  const jobDir = join(runtimeRoot, 'jobs', jobId);
  const logFile = join(jobDir, 'worker.log');
  const failPath = join(runtimeRoot, FAIL_SUBMIT_FILE);

  try {
    await readFile(failPath);
    await unlink(failPath);
    const error = 'forced submit failure for test';
    const record = { status: 500, body: error, at: new Date().toISOString(), turnId };
    await mkdir(jobDir, { recursive: true });
    await writeFile(join(jobDir, `chatgpt-${turnId}.error.json`), JSON.stringify(record, null, 2), 'utf8');
    await appendPipelineLog(logFile, `submit-error 500 ${error}`);
    return { ok: false, status: 500, error };
  } catch (error) {
    if (error && error.code !== 'ENOENT') throw error;
  }

  const payload = String(text || '');
  await mkdir(jobDir, { recursive: true });
  await writeFile(join(jobDir, `chatgpt-${turnId}.txt`), payload, 'utf8');
  await appendPipelineLog(logFile, `receive turn ${turnId} ${payload.length} characters`);
  return { ok: true, status: 200, bytes: payload.length };
}
