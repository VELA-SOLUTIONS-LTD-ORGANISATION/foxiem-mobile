/**
 * App Store Connect JWT (ES256) helper. Reads IAP or App Manager .p8 from disk.
 * Does not print the key. Used to inspect version, screenshots, and submit review.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';

const KEY_ID = process.env.ASC_KEY_ID ?? '359Z68CNMD';
const ISSUER = process.env.ASC_ISSUER_ID ?? 'a04d5b3c-3ea9-430b-bcf7-bba45bb29099';
const APP_ID = process.env.ASC_APP_ID ?? '6811348160';
const KEY_PATHS = [
  process.env.ASC_KEY_PATH,
  'C:/Users/hkuzudisli/.credentials/AuthKey_359Z68CNMD.p8',
  'C:/Users/hkuzudisli/.credentials/SubscriptionKey_FTPY7BM4TP.p8',
].filter(Boolean);

function jwtFromP8(pem, keyId) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ iss: ISSUER, iat: now, exp: now + 12 * 60, aud: 'appstoreconnect-v1' }),
  ).toString('base64url');
  const sign = crypto.createSign('SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign({ key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${header}.${payload}.${sig}`;
}

async function asc(token, method, path, json) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: json ? JSON.stringify(json) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  let pem;
  let used;
  for (const file of KEY_PATHS) {
    if (fs.existsSync(file)) {
      pem = fs.readFileSync(file, 'utf8');
      used = file;
      break;
    }
  }
  if (!pem) {
    console.log('NO_LOCAL_ASC_KEY');
    process.exit(2);
  }
  const keyId = used.includes('FTPY7BM4TP') ? 'FTPY7BM4TP' : KEY_ID;
  console.log('USING_KEY', keyId, used.replace(/\\/g, '/').split('/').pop());
  const token = jwtFromP8(pem, keyId);

  const app = await asc(token, 'GET', `/v1/apps/${APP_ID}`);
  console.log('APP', app.status, app.data?.data?.attributes?.name ?? app.data?.errors?.[0]?.detail);

  const versions = await asc(
    token,
    'GET',
    `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`,
  );
  const versionRows = versions.data?.data ?? [];
  console.log(
    'VERSIONS',
    versions.status,
    versionRows.map((v) => ({
      id: v.id,
      version: v.attributes?.versionString,
      state: v.attributes?.appStoreState,
      releaseType: v.attributes?.releaseType,
    })),
  );

  const shots = await asc(token, 'GET', `/v1/apps/${APP_ID}/appStoreVersions`);
  if (versionRows[0]) {
    const vId = versionRows[0].id;
    const localizations = await asc(token, 'GET', `/v1/appStoreVersions/${vId}/appStoreVersionLocalizations`);
    console.log(
      'LOCS',
      (localizations.data?.data ?? []).map((l) => l.attributes?.locale),
    );
    const reviewDetail = await asc(token, 'GET', `/v1/appStoreVersions/${vId}/appStoreReviewDetail`);
    console.log('REVIEW_DETAIL', reviewDetail.status, reviewDetail.data?.data?.id ?? reviewDetail.data?.errors?.[0]?.detail);

    const builds = await asc(token, 'GET', `/v1/appStoreVersions/${vId}/build`);
    console.log('ATTACHED_BUILD', builds.status, builds.data?.data?.attributes?.version ?? builds.data?.errors?.[0]?.detail);

    if (process.env.ASC_SUBMIT === '1' && versionRows[0].attributes?.appStoreState === 'PREPARE_FOR_SUBMISSION') {
      const created = await asc(token, 'POST', '/v1/reviewSubmissions', {
        data: {
          type: 'reviewSubmissions',
          attributes: { platform: 'IOS' },
          relationships: {
            app: { data: { type: 'apps', id: APP_ID } },
          },
        },
      });
      console.log('REVIEW_CREATE', created.status, JSON.stringify(created.data?.errors ?? created.data?.data?.id));
      const subId = created.data?.data?.id;
      if (subId) {
        const items = await asc(token, 'POST', '/v1/reviewSubmissionItems', {
          data: {
            type: 'reviewSubmissionItems',
            relationships: {
              reviewSubmission: { data: { type: 'reviewSubmissions', id: subId } },
              appStoreVersion: { data: { type: 'appStoreVersions', id: vId } },
            },
          },
        });
        console.log('REVIEW_ITEM', items.status, items.data?.errors?.[0]?.detail ?? items.data?.data?.id);
        const submitted = await asc(token, 'PATCH', `/v1/reviewSubmissions/${subId}`, {
          data: {
            type: 'reviewSubmissions',
            id: subId,
            attributes: { submitted: true },
          },
        });
        console.log('REVIEW_SUBMIT', submitted.status, submitted.data?.data?.attributes?.state ?? submitted.data?.errors?.[0]?.detail);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
