/**
 * Inspect Play tracks / latest edit, then optionally upload a 2.0 AAB.
 * PLAY_UPLOAD=1 writes the bundle and commits. PLAY_TRACK=internal|production.
 * PLAY_CHANGES_NOT_SENT_FOR_REVIEW=1 defers Console review when Play requires it.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PACKAGE = 'co.uk.solutionvela.foxiem';
const SA_PATH = process.env.PLAY_SERVICE_ACCOUNT_JSON ?? 'C:/Users/hkuzudisli/.credentials/play-service-account.json';
const AAB_URL =
  process.env.PLAY_AAB_URL ??
  'https://expo.dev/artifacts/eas/ueTv3G3fPTXM0E5YH38mIqgZFsSZLXPFYfFS535D9Xs.aab';
const AAB_PATH = process.env.PLAY_AAB_PATH ?? path.join(process.env.TEMP || '/tmp', 'foxiem-2.0.0-vc15.aab');
const TRACK = process.env.PLAY_TRACK ?? 'internal';
const UPLOAD = process.env.PLAY_UPLOAD === '1';
const STATUS = process.env.PLAY_RELEASE_STATUS ?? 'completed';
const NOTES = fs.readFileSync(new URL('../store/google-play/reviewer-notes.md', import.meta.url), 'utf8')
  .replace(/^#.*\n+/, '')
  .trim()
  .slice(0, 500);

function signJwt(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${signer.sign(sa.private_key, 'base64url')}`;
}

async function accessToken(sa) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signJwt(sa),
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`OAuth failed: ${json.error ?? res.status}`);
  return json.access_token;
}

async function api(token, method, urlPath, { json, bytes, contentType, query } = {}) {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  const url = urlPath.startsWith('https://')
    ? `${urlPath}${qs}`
    : `https://androidpublisher.googleapis.com/androidpublisher/v3${urlPath}${qs}`;
  const headers = { Authorization: `Bearer ${token}` };
  const init = { method, headers };
  if (bytes) {
    headers['Content-Type'] = contentType ?? 'application/octet-stream';
    init.body = bytes;
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(json);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} ${res.status}: ${JSON.stringify(data?.error ?? data)}`);
  }
  return data;
}

function summarizeTrack(track) {
  const releases = track.releases ?? [];
  return {
    track: track.track,
    releases: releases.map((rel) => ({
      name: rel.name,
      status: rel.status,
      versionCodes: rel.versionCodes,
      userFraction: rel.userFraction,
    })),
  };
}

async function main() {
  const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  const token = await accessToken(sa);
  const base = `/applications/${PACKAGE}`;

  const inspectEdit = await api(token, 'POST', `${base}/edits`, { json: {} });
  const inspectId = inspectEdit.id;
  const tracks = await api(token, 'GET', `${base}/edits/${inspectId}/tracks`);
  console.log('TRACKS', JSON.stringify((tracks.tracks ?? []).map(summarizeTrack), null, 2));
  await api(token, 'DELETE', `${base}/edits/${inspectId}`);

  try {
    const inapp = await api(token, 'GET', `${base}/inappproducts`);
    console.log(
      'IAP',
      (inapp.inappproduct ?? []).map((p) => ({ sku: p.sku, status: p.status, purchaseType: p.purchaseType })),
    );
  } catch (error) {
    console.log('IAP_ERR', String(error.message).slice(0, 300));
  }

  try {
    const subs = await api(token, 'GET', `${base}/subscriptions`);
    console.log(
      'SUBS',
      (subs.subscriptions ?? []).map((p) => ({ productId: p.productId, archived: p.archived })),
    );
  } catch (error) {
    console.log('SUBS_ERR', String(error.message).slice(0, 300));
  }

  if (!UPLOAD) {
    return;
  }

  const reuseCode = process.env.PLAY_VERSION_CODE;
  if (!reuseCode) {
    if (!fs.existsSync(AAB_PATH) || fs.statSync(AAB_PATH).size < 1_000_000) {
      console.log('Downloading AAB…');
      const res = await fetch(AAB_URL);
      if (!res.ok) throw new Error(`AAB download ${res.status}`);
      fs.writeFileSync(AAB_PATH, Buffer.from(await res.arrayBuffer()));
    }
    console.log('AAB_BYTES', fs.statSync(AAB_PATH).size);
  }

  const edit = await api(token, 'POST', `${base}/edits`, { json: {} });
  const editId = edit.id;
  console.log('EDIT', editId);

  try {
    let versionCode = process.env.PLAY_VERSION_CODE;
    if (!versionCode) {
      const uploadUrl = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${editId}/bundles?uploadType=media`;
      const bytes = fs.readFileSync(AAB_PATH);
      const bundle = await api(token, 'POST', uploadUrl, {
        bytes,
        contentType: 'application/octet-stream',
      });
      versionCode = String(bundle.versionCode);
      console.log('BUNDLE', { versionCode: bundle.versionCode, sha256: bundle.sha256 });
    } else {
      console.log('REUSING_VERSION', versionCode);
    }

    await api(token, 'PUT', `${base}/edits/${editId}/tracks/${TRACK}`, {
      json: {
        track: TRACK,
        releases: [
          {
            name: '2.0.0 (15)',
            status: STATUS,
            versionCodes: [String(versionCode)],
            releaseNotes: [{ language: 'en-GB', text: NOTES }],
          },
        ],
      },
    });

    const query = {};
    if (process.env.PLAY_CHANGES_NOT_SENT_FOR_REVIEW === '1') {
      query.changesNotSentForReview = 'true';
    }
    const committed = await api(token, 'POST', `${base}/edits/${editId}:commit`, { query });
    console.log('COMMITTED', committed.id);
  } catch (error) {
    try {
      await api(token, 'DELETE', `${base}/edits/${editId}`);
    } catch {
      // ignore
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
