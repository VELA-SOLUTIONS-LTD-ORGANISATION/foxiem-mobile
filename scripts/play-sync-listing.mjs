/**
 * Syncs Play listing copy + phone screenshots from the repo, then reports IAP prices.
 * Credentials stay on disk; never logged. Set PLAY_COMMIT=1 to commit the edit (starts review
 * when managed publishing is off).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { ANDROID_SIZE, PACKAGE_ID, ROOT, SCENE_FILES, STORE_LOCALES, pngInfo, writeStorePng } from './store-screenshots/common.mjs';

const PACKAGE = PACKAGE_ID;
const SA_PATH = process.env.PLAY_SERVICE_ACCOUNT_JSON ?? 'C:/Users/hkuzudisli/.credentials/play-service-account.json';
const COMMIT = process.env.PLAY_COMMIT === '1';
const IMAGE_TYPE = 'phoneScreenshots';
const SCENE_ORDER = ['home', 'tracker', 'insights', 'reminders', 'widgets', 'paywall'];

function listingDir(locale) {
  return path.join(ROOT, 'store', 'google-play', locale);
}

function readListing(locale) {
  const dir = listingDir(locale);
  const title = fs.readFileSync(path.join(dir, 'title.txt'), 'utf8').trim();
  const shortDescription = fs.readFileSync(path.join(dir, 'short-description.txt'), 'utf8').trim();
  const fullDescription = fs.readFileSync(path.join(dir, 'full-description.txt'), 'utf8').trim();
  if (title.length > 30) throw new Error(`${locale} title ${title.length} > 30`);
  if (shortDescription.length > 80) throw new Error(`${locale} short ${shortDescription.length} > 80`);
  if (fullDescription.length > 4000) throw new Error(`${locale} full ${fullDescription.length} > 4000`);
  return { language: locale, title, shortDescription, fullDescription };
}

function screenshotPath(locale, scene) {
  return path.join(ROOT, 'store-assets', 'raw', locale, 'android', 'phone', SCENE_FILES[scene]);
}

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
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signJwt(sa),
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`OAuth failed: ${json.error ?? res.status}`);
  }
  return json.access_token;
}

async function api(token, method, urlPath, { json, bytes, contentType } = {}) {
  const url = urlPath.startsWith('https://')
    ? urlPath
    : `https://androidpublisher.googleapis.com/androidpublisher/v3${urlPath}`;
  const headers = { Authorization: `Bearer ${token}` };
  const init = { method, headers };
  if (bytes) {
    headers['Content-Type'] = contentType ?? 'image/png';
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
      data = { raw: text.slice(0, 200) };
    }
  }
  if (!res.ok) {
    const message = data?.error?.message ?? data?.error ?? text.slice(0, 400);
    throw new Error(`${method} ${urlPath} ${res.status}: ${message}`);
  }
  return data;
}

function preparePng(file) {
  const info = pngInfo(file);
  if (info.width !== ANDROID_SIZE.width || info.height !== ANDROID_SIZE.height) {
    throw new Error(`${file} is ${info.width}x${info.height}, need ${ANDROID_SIZE.width}x${ANDROID_SIZE.height}`);
  }
  if (info.colorType === 2 && info.bitDepth === 8) {
    return file;
  }
  writeStorePng(file, ANDROID_SIZE.width, ANDROID_SIZE.height);
  return file;
}

function priceOf(regional, code) {
  const row = regional.find((item) => item.regionCode === code);
  if (!row?.price) {
    return null;
  }
  const units = row.price.units ?? '0';
  const nanos = row.price.nanos ?? 0;
  return `${row.price.currencyCode} ${units}.${String(Math.round(nanos / 1e7)).padStart(2, '0')}`;
}

function summarizePrices(product) {
  const plans = product?.basePlans ?? [];
  return plans.map((plan) => {
    const regional = plan.regionalConfigs ?? [];
    return {
      basePlanId: plan.basePlanId,
      state: plan.state,
      autoRenewing: Boolean(plan.autoRenewingBasePlanType),
      regionalCount: regional.length,
      GB: priceOf(regional, 'GB'),
      US: priceOf(regional, 'US'),
      TR: priceOf(regional, 'TR'),
    };
  });
}

async function main() {
  if (!fs.existsSync(SA_PATH)) {
    throw new Error('Play service account JSON is missing on disk');
  }
  const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  const email = sa.client_email;
  const token = await accessToken(sa);
  console.log('Auth ok');

  const listings = STORE_LOCALES.map(readListing);
  for (const locale of STORE_LOCALES) {
    for (const scene of SCENE_ORDER) {
      preparePng(screenshotPath(locale, scene));
    }
  }

  const edit = await api(token, 'POST', `/applications/${PACKAGE}/edits`, { json: {} });
  const editId = edit.id;
  console.log(`Edit ${editId}`);

  try {
    const existing = await api(token, 'GET', `/applications/${PACKAGE}/edits/${editId}/listings`);
    console.log(
      'Existing listings:',
      (existing.listings ?? []).map((item) => item.language).join(', ') || '(none)',
    );

    for (const listing of listings) {
      await api(token, 'PUT', `/applications/${PACKAGE}/edits/${editId}/listings/${listing.language}`, {
        json: listing,
      });
      console.log(`Listing ${listing.language}: title ${listing.title.length} short ${listing.shortDescription.length} full ${listing.fullDescription.length}`);

      await api(
        token,
        'DELETE',
        `/applications/${PACKAGE}/edits/${editId}/listings/${listing.language}/${IMAGE_TYPE}`,
      ).catch((error) => {
        if (!String(error.message).includes(' 404')) {
          throw error;
        }
      });

      for (const scene of SCENE_ORDER) {
        const file = screenshotPath(listing.language, scene);
        const bytes = fs.readFileSync(file);
        await api(
          token,
          'POST',
          `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${editId}/listings/${listing.language}/${IMAGE_TYPE}?uploadType=media`,
          { bytes, contentType: 'image/png' },
        );
        console.log(`  ${listing.language} ${path.basename(file)} ${bytes.length}b`);
      }
    }

    const monthly = await api(token, 'GET', `/applications/${PACKAGE}/subscriptions/foxiem_pro_monthly`);
    const yearly = await api(token, 'GET', `/applications/${PACKAGE}/subscriptions/foxiem_pro_yearly`);
    let lifetime = null;
    try {
      lifetime = await api(token, 'GET', `/applications/${PACKAGE}/oneTimeProducts/foxiem_pro_lifetime`);
    } catch (error) {
      console.log(`Lifetime GET: ${error.message}`);
    }
    console.log('Monthly', JSON.stringify(summarizePrices(monthly)));
    console.log('Yearly', JSON.stringify(summarizePrices(yearly)));
    if (lifetime) {
      const purchaseOptions = lifetime.purchaseOptions ?? lifetime.skuDetails ?? lifetime.defaultPrice ?? lifetime;
      const keys = Object.keys(lifetime);
      console.log('Lifetime keys', keys.join(','));
      if (lifetime.defaultPrice) {
        console.log('Lifetime defaultPrice', JSON.stringify(lifetime.defaultPrice));
      }
      if (lifetime.prices) {
        console.log('Lifetime price regions', Object.keys(lifetime.prices).length);
      }
      if (purchaseOptions && lifetime.purchaseOptions) {
        console.log(
          'Lifetime options',
          JSON.stringify(
            lifetime.purchaseOptions.map((option) => ({
              id: option.purchaseOptionId,
              state: option.state,
              regions: (option.regionalPricingAndAvailabilityConfigs ?? []).length,
            })),
          ),
        );
      }
    }

    if (!COMMIT) {
      console.log('PLAY_COMMIT not set; deleting uncommitted edit');
      await api(token, 'DELETE', `/applications/${PACKAGE}/edits/${editId}`);
      return;
    }
    const committed = await api(token, 'POST', `/applications/${PACKAGE}/edits/${editId}:commit`, { json: {} });
    console.log(`Committed ${committed.id ?? editId}`);
  } catch (error) {
    try {
      await api(token, 'DELETE', `/applications/${PACKAGE}/edits/${editId}`);
    } catch {
      // Keep the original error.
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
