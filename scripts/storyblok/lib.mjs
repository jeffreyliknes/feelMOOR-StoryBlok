// Shared helpers for Storyblok Management API scripts (EU region).
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

export const SPACE_ID = 293831139348166;
export const MAPI = `https://mapi.storyblok.com/v1/spaces/${SPACE_ID}`;
export const PAT = env.STORYBLOK_PERSONAL_TOKEN;
export const PREVIEW_TOKEN = env.STORYBLOK_PREVIEW_TOKEN;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ponytail: naive global throttle + one retry on 429; fine for a one-off migration
export async function mapi(method, path, body) {
  await sleep(200);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${MAPI}${path}`, {
      method,
      headers: { Authorization: PAT, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { await sleep(2000); continue; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path}: rate-limited after retries`);
}
