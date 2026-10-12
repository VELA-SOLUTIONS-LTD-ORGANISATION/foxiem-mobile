import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function run(script) {
  const result = spawnSync(process.execPath, [path.join(here, script)], {
    stdio: 'inherit',
    env: process.env,
  });
  return result.status ?? 1;
}

const ios = process.platform === 'darwin' ? run('ios.mjs') : run('web.mjs');
const android = run('android.mjs');
const validate = run('validate.mjs');
if (ios !== 0 || android !== 0 || validate !== 0) {
  process.exit(ios || android || validate);
}
