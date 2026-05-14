import { execFileSync } from 'node:child_process';

function exec(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function killPid(pid) {
  if (!isAlive(pid)) return;

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return;
  }

  for (let i = 0; i < 10; i += 1) {
    if (!isAlive(pid)) return;
    // eslint-disable-next-line no-await-in-loop
    await sleep(100);
  }

  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // ignore
  }
}

function parsePorts(argv) {
  const ports = new Set();
  for (const raw of argv) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0 || n > 65535) continue;
    ports.add(n);
  }
  return [...ports];
}

async function main() {
  const ports = parsePorts(process.argv.slice(2));
  if (ports.length === 0) {
    console.error('Usage: node scripts/kill-ports.mjs <port> [port...]');
    process.exit(2);
  }

  // This is intentionally lightweight and macOS/Linux oriented.
  // For this repo we primarily use macOS (darwin).
  if (process.platform === 'win32') {
    console.warn('kill-ports: windows is not supported by this script.');
    process.exit(0);
  }

  const pidsToKill = new Set();

  for (const port of ports) {
    let out = '';
    try {
      out = exec('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
    } catch {
      out = '';
    }

    for (const line of out.split('\n')) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) {
        pidsToKill.add(pid);
      }
    }
  }

  if (pidsToKill.size === 0) return;

  await Promise.all([...pidsToKill].map(killPid));
}

main().catch((err) => {
  console.error('kill-ports failed:', err);
  process.exit(1);
});
