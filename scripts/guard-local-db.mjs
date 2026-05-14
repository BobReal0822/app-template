#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';

const workspaceRoot = process.cwd();

function loadEnvFile(relativePath) {
  const fullPath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(fullPath)) return;
  const parsed = dotenv.parse(fs.readFileSync(fullPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
}

function parseHost(rawUrl) {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).host;
  } catch {
    return null;
  }
}

function readBlockedHosts() {
  const raw = process.env.DB_GUARD_BLOCKED_HOSTS ?? '';
  const configured = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return new Set(configured);
}

// Align with @repo/db: only canonical names, no Marketplace `DB_*` fallback.
loadEnvFile('.env.development.local');
loadEnvFile('.env.local');

const pooledUrl = process.env.POSTGRES_URL;
const directUrl = process.env.POSTGRES_URL_NON_POOLING;

const pooledHost = parseHost(pooledUrl);
const directHost = parseHost(directUrl);
const blockedHosts = readBlockedHosts();

const hitBlocked = [pooledHost, directHost].some(
  (host) => host && blockedHosts.has(host),
);

if (hitBlocked) {
  console.error('\n[guard:db:local] Blocked: local run is pointing to a protected DB host.');
  console.error(`[guard:db:local] pooled host: ${pooledHost ?? 'N/A'}`);
  console.error(`[guard:db:local] direct host: ${directHost ?? 'N/A'}`);
  console.error('[guard:db:local] Update .env.local to your dev Neon branch before continuing.\n');
  process.exit(1);
}

console.log(
  `[guard:db:local] OK pooled=${pooledHost ?? 'N/A'} direct=${directHost ?? 'N/A'}`,
);
