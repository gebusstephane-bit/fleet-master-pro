#!/usr/bin/env node
/**
 * fix-manifests.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Workaround for Next.js 14 bug:
 *   "page_client-reference-manifest.js" is referenced in page.js.nft.json
 *   but not generated for "use client" pages that are the ROOT of a route group
 *   (e.g. (onboarding)/page.tsx). Vercel's deployment infra calls lstat() on
 *   every file listed in .nft.json → ENOENT → deployment fails.
 *
 * Fix: after `next build`, scan every page directory. If page.js exists but
 *      page_client-reference-manifest.js is absent, create a minimal valid
 *      manifest. For fully-client pages the manifest is legitimately empty
 *      (no RSC→Client boundaries to document).
 *
 * Run: node scripts/fix-manifests.js  (called automatically by "build" script)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const appServerDir = path.join(process.cwd(), '.next', 'server', 'app');

let fixed = 0;

function walkAndFix(dir) {
  if (!fs.existsSync(dir)) return;

  const pageJs     = path.join(dir, 'page.js');
  const manifestJs = path.join(dir, 'page_client-reference-manifest.js');

  if (fs.existsSync(pageJs) && !fs.existsSync(manifestJs)) {
    // Derive the RSC manifest key: relative path from appServerDir, forward slashes
    const relPath = path.relative(appServerDir, dir).replace(/\\/g, '/');
    const pageKey = '/' + relPath + '/page';

    // Minimal valid ClientReferenceManifest (empty — correct for "use client" root pages)
    const manifest = {
      moduleLoading:      { prefix: '/_next/', crossOrigin: null },
      ssrModuleMapping:   {},
      edgeSSRModuleMapping: {},
      clientModules:      {},
      entryCSSFiles:      {},
    };

    const content =
      'globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});' +
      `globalThis.__RSC_MANIFEST[${JSON.stringify(pageKey)}]=${JSON.stringify(manifest)};`;

    fs.writeFileSync(manifestJs, content, 'utf8');
    console.log(`[fix-manifests] ✓ Created missing manifest → ${pageKey}`);
    fixed++;
  }

  // Recurse into sub-directories
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walkAndFix(full);
  }
}

walkAndFix(appServerDir);

if (fixed === 0) {
  console.log('[fix-manifests] ✓ All page_client-reference-manifest.js files are present.');
} else {
  console.log(`[fix-manifests] ✓ Fixed ${fixed} missing manifest(s).`);
}
