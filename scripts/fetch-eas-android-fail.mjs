import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const result = spawnSync(
  'npx',
  ['eas', 'build:list', '--platform', 'android', '--limit', '1', '--json', '--non-interactive'],
  { cwd: process.cwd(), env: { ...process.env, CI: '1' }, encoding: 'utf8', shell: true },
);
const start = result.stdout.indexOf('[');
const end = result.stdout.lastIndexOf(']');
const builds = JSON.parse(result.stdout.slice(start, end + 1));
const build = builds[0];
console.log(build.status, build.error?.message ?? '');
const logUrl = build.logFiles?.[0];
if (!logUrl) {
  process.exit(1);
}
const log = await fetch(logUrl);
const text = await log.text();
const logPath = `${process.env.TEMP || '/tmp'}/eas-android-fail.log`;
fs.writeFileSync(logPath, text);
console.log('log', logPath);
const lines = text.split('\n').filter((line) => /FAILURE|What went wrong|Execution failed|error:|FAILED|Caused by/i.test(line));
console.log(lines.slice(-50).join('\n'));
