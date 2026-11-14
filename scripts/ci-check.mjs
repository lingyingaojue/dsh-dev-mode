#!/usr/bin/env node
/**
 * Static repository checks for dsh-dev-mode.
 *
 * Node.js built-in modules only: no install step, no network access, and no
 * platform-specific commands. The same script runs for contributors on
 * Windows and in the Ubuntu CI job.
 *
 * Usage:
 *   node scripts/ci-check.mjs
 *
 * Prints one [PASS]/[FAIL] line per check and exits with code 1 when any
 * check fails.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const README_FILES = ['README.md', 'README.zh-CN.md', 'README.zh-TW.md'];

const REQUIRED_FILES = [
  ...README_FILES,
  'CHANGELOG.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'SUPPORT.md',
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/COMPATIBILITY.md',
  'docs/FAQ.md',
  'docs/MAINTAINING.md',
  'docs/TRANSLATIONS.md',
  'docs/DETAIL.md',
  'docs/DETAIL.en.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/workflows/ci.yml',
  'assets/banner.svg',
  'scripts/ci-check.mjs',
];

const PACKAGE_FILE_ENTRIES = ['README.zh-CN.md', 'README.zh-TW.md', 'docs', 'assets', 'locale', 'icon.svg'];

const PATCH_MARKERS = [
  'id: preset-dev',
  'id: preset-dev-worker',
  'id: dev',
  'id: dev-worker',
  'agentPreset: dev-worker',
  'interrupt: true',
];

const SKILL_FILES = [
  'skills/dev-pipeline/SKILL.md',
  'skills/dev-pipeline/references/pipeline.md',
  'skills/dev-pipeline/references/archetypes.md',
  'skills/dev-pipeline/references/artifacts.md',
  'skills/dev-pipeline/references/troubleshooting.md',
];

const README_REQUIRED_LINKS = ['docs/README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'LICENSE'];

const CHAR_LIMIT = 8192;
const MAX_ASSET_BYTES = 256 * 1024;

/** @type {{ kind: 'section' | 'pass' | 'fail', label?: string, detail?: string }[]} */
const results = [];

function section(title) {
  results.push({ kind: 'section', label: title });
}

function pass(label) {
  results.push({ kind: 'pass', label });
}

function fail(label, detail = '') {
  results.push({ kind: 'fail', label, detail: String(detail || '') });
}

function check(ok, label, detail) {
  if (ok) pass(label);
  else fail(label, detail);
}

function summarize(items, max = 6) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const shown = items.slice(0, max).join('; ');
  return items.length > max ? `${shown}; (+${items.length - max} more)` : shown;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function read(relPath) {
  try {
    return readFileSync(join(ROOT, relPath), 'utf8');
  } catch {
    return null;
  }
}

function isFile(relPath) {
  try {
    return statSync(join(ROOT, relPath)).isFile();
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------ */
/* Markdown / link helpers                                                   */
/* ------------------------------------------------------------------------ */

/** Remove fenced code blocks and inline code before looking for links. */
function stripCode(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

/** Extract link/image destinations from Markdown links, HTML href/src, and reference definitions. */
function extractLinkTargets(markdown) {
  const text = stripCode(markdown);
  const targets = [];
  const push = (value) => {
    const target = String(value ?? '').trim();
    if (target) targets.push(target);
  };

  let match;
  const markdownLink = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)/g;
  while ((match = markdownLink.exec(text)) !== null) push(match[1]);

  const htmlAttribute = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  while ((match = htmlAttribute.exec(text)) !== null) push(match[1]);

  const referenceDefinition = /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*(<[^>]*>|\S+)/gm;
  while ((match = referenceDefinition.exec(text)) !== null) push(match[1]);

  return targets;
}

/**
 * Normalize a raw destination. Returns null for links that must be skipped:
 * external URLs (any scheme), protocol-relative URLs, and pure anchors.
 */
function normalizeLinkTarget(rawTarget) {
  let target = rawTarget.trim();
  if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1).trim();
  if (!target) return null;
  if (target.startsWith('#')) return null;
  if (target.startsWith('//')) return null;
  // http:, https:, mailto:, tel:, data:, and any other URI scheme.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) return null;

  const cut = target.search(/[?#]/);
  if (cut !== -1) target = target.slice(0, cut);
  if (!target) return null;

  try {
    target = decodeURIComponent(target);
  } catch {
    // Leave malformed percent-encoding untouched; the existence check reports it.
  }
  return target;
}

function resolveLinkTarget(normalizedTarget, sourceFile) {
  if (normalizedTarget.startsWith('/')) {
    return resolve(ROOT, normalizedTarget.slice(1));
  }
  return resolve(ROOT, dirname(sourceFile), normalizedTarget);
}

function isInsideRepository(targetPath) {
  const rel = relative(ROOT, targetPath);
  if (rel === '') return true;
  if (isAbsolute(rel)) return false;
  return rel !== '..' && !rel.startsWith(`..${sep}`);
}

/**
 * Case-sensitive existence check. On Windows the filesystem is case-insensitive,
 * but CI runs on Ubuntu; resolving each segment against the real directory
 * listings keeps local results aligned with CI.
 */
function existsWithExactCase(targetPath) {
  if (!isInsideRepository(targetPath)) return false;
  const rel = relative(ROOT, targetPath);
  if (rel === '') return true;

  let current = ROOT;
  for (const part of rel.split(sep)) {
    if (!part || part === '.') continue;
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      return false;
    }
    if (!entries.includes(part)) return false;
    current = join(current, part);
  }
  return true;
}

function displayPath(targetPath) {
  const rel = relative(ROOT, targetPath);
  return rel.split(sep).join('/') || '.';
}

function collectMarkdownFiles() {
  const files = README_FILES.filter(isFile);
  let docsEntries = [];
  try {
    docsEntries = readdirSync(join(ROOT, 'docs'))
      .filter((name) => name.endsWith('.md') && isFile(`docs/${name}`))
      .sort()
      .map((name) => `docs/${name}`);
  } catch {
    docsEntries = [];
  }
  return [...files, ...docsEntries];
}

function checkMarkdownFileLinks(fileRel) {
  const markdown = read(fileRel);
  if (markdown === null) return;

  const seen = new Set();
  const broken = [];
  let checked = 0;

  for (const raw of extractLinkTargets(markdown)) {
    const normalized = normalizeLinkTarget(raw);
    if (normalized === null || seen.has(normalized)) continue;
    seen.add(normalized);
    checked += 1;

    const targetPath = resolveLinkTarget(normalized, fileRel);
    if (!isInsideRepository(targetPath)) {
      broken.push(`${raw} (outside the repository)`);
      continue;
    }
    if (!existsWithExactCase(targetPath)) broken.push(raw);
  }

  if (broken.length > 0) {
    fail(`Relative links resolve in ${fileRel}`, `${broken.length} broken of ${checked}: ${summarize(broken)}`);
  } else {
    pass(`Relative links resolve in ${fileRel} (${checked} checked)`);
  }
}

/* ------------------------------------------------------------------------ */
/* README content                                                            */
/* ------------------------------------------------------------------------ */

function checkReadmeContent(fileRel) {
  const markdown = read(fileRel);
  if (markdown === null) return;

  const resolvedTargets = new Set();
  for (const raw of extractLinkTargets(markdown)) {
    const normalized = normalizeLinkTarget(raw);
    if (normalized === null) continue;
    resolvedTargets.add(resolveLinkTarget(normalized, fileRel));
  }

  check(
    resolvedTargets.has(resolve(ROOT, 'assets/banner.svg')),
    `${fileRel} references the banner (assets/banner.svg)`,
  );

  const otherReadmes = README_FILES.filter((file) => file !== fileRel);
  const missingLanguageLinks = otherReadmes.filter((file) => !resolvedTargets.has(resolve(ROOT, file)));
  check(
    missingLanguageLinks.length === 0,
    `${fileRel} language bar links to ${otherReadmes.join(' and ')}`,
    `missing: ${summarize(missingLanguageLinks)}`,
  );

  const missingRequiredLinks = README_REQUIRED_LINKS.filter((file) => !resolvedTargets.has(resolve(ROOT, file)));
  check(
    missingRequiredLinks.length === 0,
    `${fileRel} links to docs/README.md, CONTRIBUTING.md, SECURITY.md and LICENSE`,
    `missing: ${summarize(missingRequiredLinks)}`,
  );
}

/* ------------------------------------------------------------------------ */
/* package.json + version consistency                                        */
/* ------------------------------------------------------------------------ */

function checkPackage() {
  const text = read('package.json');
  if (text === null) {
    fail('package.json exists');
    return null;
  }

  let pkg;
  try {
    pkg = JSON.parse(text);
    pass('package.json is valid JSON');
  } catch (error) {
    fail('package.json is valid JSON', error.message);
    return null;
  }

  if (pkg === null || typeof pkg !== 'object' || Array.isArray(pkg)) {
    fail('package.json contains a JSON object');
    return null;
  }
  pass('package.json contains a JSON object');

  const name = typeof pkg.name === 'string' ? pkg.name.trim() : '';
  check(Boolean(name), `package.json name is set${name ? ` (${name})` : ''}`);

  const version = typeof pkg.version === 'string' ? pkg.version.trim() : '';
  check(
    /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version),
    `package.json version is a semver string${version ? ` (${version})` : ''}`,
  );

  const patch = pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch;
  check(typeof patch === 'string' && patch.trim() !== '', 'package.json dsh.bundle.patch is set');
  if (typeof patch === 'string' && patch.trim() !== '') {
    const patchRel = patch.trim().replace(/^\.\//, '');
    check(isFile(patchRel), `package.json dsh.bundle.patch refers to an existing file (${patchRel})`);
  }

  const bundleFiles = Array.isArray(pkg.files) ? pkg.files : [];
  const missingEntries = PACKAGE_FILE_ENTRIES.filter((entry) => !bundleFiles.includes(entry));
  check(
    missingEntries.length === 0,
    `package.json files includes ${PACKAGE_FILE_ENTRIES.join(', ')}`,
    `missing: ${summarize(missingEntries)}`,
  );

  return pkg;
}

function checkVersionConsistency(pkg) {
  const changelog = read('CHANGELOG.md');
  if (changelog === null) {
    fail('CHANGELOG.md is readable for version consistency checking');
    return;
  }

  const match = changelog.match(/^##[ \t]+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)[ \t]*$/m);
  if (!match) {
    fail('CHANGELOG.md contains a top-level "## x.y.z" version heading');
    return;
  }

  const changelogVersion = match[1];
  const packageVersion = pkg && typeof pkg.version === 'string' ? pkg.version.trim() : '';
  if (!packageVersion) {
    fail('package.json version is available for the CHANGELOG comparison');
    return;
  }

  check(
    packageVersion === changelogVersion,
    `package.json version matches the first CHANGELOG.md version heading (${packageVersion} vs ${changelogVersion})`,
  );
}

/* ------------------------------------------------------------------------ */
/* Preset patch markers                                                      */
/* ------------------------------------------------------------------------ */

function checkCordisPatch() {
  const text = read('cordis.patch.yml');
  if (text === null) {
    fail('cordis.patch.yml exists and is readable');
    return;
  }

  for (const marker of PATCH_MARKERS) {
    // Match whole lines so "id: dev" cannot be satisfied by "id: dev-worker".
    const pattern = new RegExp(`^[ \\t]*(?:-[ \\t]+)?${escapeRegExp(marker)}[ \\t]*$`, 'm');
    check(pattern.test(text), `cordis.patch.yml contains "${marker}"`);
  }
}

/* ------------------------------------------------------------------------ */
/* Skill size limit                                                          */
/* ------------------------------------------------------------------------ */

function checkSkillSizes() {
  for (const fileRel of SKILL_FILES) {
    const text = read(fileRel);
    if (text === null) {
      fail(`Skill file exists: ${fileRel}`);
      continue;
    }
    const characters = Array.from(text).length;
    check(
      characters <= CHAR_LIMIT,
      `${fileRel} is within the ${CHAR_LIMIT}-character limit (${characters})`,
    );
  }
}

/* ------------------------------------------------------------------------ */
/* Locale metadata                                                           */
/* ------------------------------------------------------------------------ */

function checkLocale(lang) {
  const fileRel = `locale/${lang}.json`;
  const text = read(fileRel);
  if (text === null) {
    fail(`Locale file exists: ${fileRel}`);
    return null;
  }

  let data;
  try {
    data = JSON.parse(text);
    pass(`${fileRel} is valid JSON`);
  } catch (error) {
    fail(`${fileRel} is valid JSON`, error.message);
    return null;
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    fail(`${fileRel} contains a JSON object`);
    return null;
  }

  const meta = data.meta;
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) {
    fail(`${fileRel} has a meta object`);
    return null;
  }

  const missingKeys = ['title', 'description', 'detail'].filter(
    (key) => typeof meta[key] !== 'string' || meta[key].trim() === '',
  );
  check(
    missingKeys.length === 0,
    `${fileRel} meta.title, meta.description and meta.detail are set`,
    `missing or empty: ${summarize(missingKeys)}`,
  );

  if (typeof meta.detail === 'string' && meta.detail.trim() !== '') {
    const detailRel = meta.detail.trim().replace(/^\.\//, '');
    check(isFile(detailRel), `${fileRel} meta.detail points to an existing file (${detailRel})`);
  }

  return data;
}

/* ------------------------------------------------------------------------ */
/* SVG assets                                                                */
/* ------------------------------------------------------------------------ */

function checkSvg(fileRel) {
  const text = read(fileRel);
  if (text === null) {
    fail(`SVG asset exists: ${fileRel}`);
    return;
  }
  check(/<svg[\s>]/.test(text), `${fileRel} contains an <svg> element`);

  const bytes = Buffer.byteLength(text, 'utf8');
  check(bytes <= MAX_ASSET_BYTES, `${fileRel} is at most 256 KiB (${bytes} bytes)`);
}

/* ------------------------------------------------------------------------ */
/* skills/ hygiene                                                           */
/* ------------------------------------------------------------------------ */

function findPythonCacheArtifacts(dirRel) {
  const found = [];
  let entries;
  try {
    entries = readdirSync(join(ROOT, dirRel), { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    const childRel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__') found.push(`${childRel}/`);
      else found.push(...findPythonCacheArtifacts(childRel));
    } else if (entry.isFile() && entry.name.endsWith('.pyc')) {
      found.push(childRel);
    }
  }
  return found;
}

function checkSkillsHygiene() {
  if (!existsSync(join(ROOT, 'skills'))) {
    fail('skills/ directory exists');
    return;
  }
  const leftovers = findPythonCacheArtifacts('skills');
  check(
    leftovers.length === 0,
    'No __pycache__ directories or .pyc files under skills/',
    `found: ${summarize(leftovers)}`,
  );
}

/* ------------------------------------------------------------------------ */
/* Run checks                                                                */
/* ------------------------------------------------------------------------ */

section('Required files');
for (const fileRel of REQUIRED_FILES) check(isFile(fileRel), `Required file exists: ${fileRel}`);

section('package.json');
const pkg = checkPackage();

section('Version consistency');
checkVersionConsistency(pkg);

section('Preset patch');
checkCordisPatch();

section('Skill size limits');
checkSkillSizes();

section('Locale metadata');
const enLocale = checkLocale('en');
checkLocale('zh');
if (enLocale && enLocale.meta && typeof enLocale.meta.detail === 'string') {
  const detailRel = enLocale.meta.detail.trim().replace(/^\.\//, '');
  check(detailRel === 'docs/DETAIL.en.md', 'locale/en.json meta.detail points to docs/DETAIL.en.md');
}

section('README content');
for (const fileRel of README_FILES) checkReadmeContent(fileRel);

section('Markdown relative links');
const markdownFiles = collectMarkdownFiles();
for (const fileRel of markdownFiles) checkMarkdownFileLinks(fileRel);

section('SVG assets');
checkSvg('assets/banner.svg');
checkSvg('icon.svg');

section('skills/ hygiene');
checkSkillsHygiene();

/* ------------------------------------------------------------------------ */
/* Report                                                                    */
/* ------------------------------------------------------------------------ */

let passes = 0;
let failures = 0;
const lines = [];

for (const item of results) {
  if (item.kind === 'section') {
    lines.push('');
    lines.push(`== ${item.label} ==`);
    continue;
  }
  const passed = item.kind === 'pass';
  if (passed) passes += 1;
  else failures += 1;
  const detail = !passed && item.detail ? ` — ${item.detail}` : '';
  lines.push(`[${passed ? 'PASS' : 'FAIL'}] ${item.label}${detail}`);
}

console.log(lines.join('\n'));
console.log('');

if (failures > 0) {
  console.log(`ci-check: ${passes} passed, ${failures} failed.`);
  process.exitCode = 1;
} else {
  console.log(`ci-check: all ${passes} checks passed.`);
}
