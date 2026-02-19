#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const EVENT_NAME = 'QUARANTINE_LOCAL_SOURCE_GUARD';
const USAGE_PATHS_MAX = 50;
const VALID_MODES = new Set(['alert', 'forbidden']);
const FRONTEND_SCAN_ROOT = path.join('frontend', 'src');
const EXCLUDED_PATHS = new Set([
  path.normalize(path.join('frontend', 'src', 'config', 'quarantine.ts')),
]);
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set(['.git', 'dist', 'node_modules']);

function utcNowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function parseArgs(argv) {
  const out = {
    mode: process.env.QUARANTINE_LOCAL_SOURCE || 'alert',
    receiptOut: path.join('artifacts', 'quarantine_local_source_guard_receipt.json'),
    repoRoot: process.cwd(),
    scanRoot: FRONTEND_SCAN_ROOT,
    repo: process.env.GITHUB_REPOSITORY || 'UNKNOWN',
    workflow: process.env.GITHUB_WORKFLOW || 'UNKNOWN',
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') {
      i += 1;
      out.mode = argv[i] || out.mode;
      continue;
    }
    if (arg === '--receipt-out') {
      i += 1;
      out.receiptOut = argv[i] || out.receiptOut;
      continue;
    }
    if (arg === '--repo-root') {
      i += 1;
      out.repoRoot = argv[i] || out.repoRoot;
      continue;
    }
    if (arg === '--scan-root') {
      i += 1;
      out.scanRoot = argv[i] || out.scanRoot;
      continue;
    }
    if (arg === '--repo') {
      i += 1;
      out.repo = argv[i] || out.repo;
      continue;
    }
    if (arg === '--workflow') {
      i += 1;
      out.workflow = argv[i] || out.workflow;
      continue;
    }
    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
  }

  out.mode = String(out.mode || '').trim().toLowerCase();
  return out;
}

function listFilesRecursively(rootDir) {
  const out = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (_err) {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }
      out.push(fullPath);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

const IMPORT_PATTERNS = [
  /\bfrom\s+['"][^'"]*config\/quarantine['"]/,
  /\bimport\s+['"][^'"]*config\/quarantine['"]/,
  /\bimport\s*\(\s*['"][^'"]*config\/quarantine['"]\s*\)/,
];

function findLocalSourceUsages({ repoRoot, scanRoot }) {
  const absRepoRoot = path.resolve(repoRoot);
  const absScanRoot = path.resolve(absRepoRoot, scanRoot);
  if (!fs.existsSync(absScanRoot)) {
    return [];
  }

  const files = listFilesRecursively(absScanRoot);
  const usages = [];

  for (const file of files) {
    const ext = path.extname(file);
    if (!SCAN_EXTENSIONS.has(ext) || file.endsWith('.d.ts')) {
      continue;
    }

    const relPath = path.relative(absRepoRoot, file);
    if (EXCLUDED_PATHS.has(path.normalize(relPath))) {
      continue;
    }

    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
      const line = lines[lineNo];
      if (!IMPORT_PATTERNS.some((pattern) => pattern.test(line))) {
        continue;
      }
      usages.push({
        path: normalizePath(relPath),
        line: lineNo + 1,
        snippet: line.trim().slice(0, 240),
      });
    }
  }

  usages.sort((a, b) => {
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path);
    }
    return a.line - b.line;
  });

  return usages;
}

function buildReceipt({ mode, usages, status, repo, workflow, error }) {
  const usagePaths = Array.from(new Set(usages.map((u) => u.path))).sort();
  const usagePathsTruncated = usagePaths.length > USAGE_PATHS_MAX;
  return {
    event: EVENT_NAME,
    level: mode === 'forbidden' ? 'L2' : 'L1',
    mode,
    status,
    usage_count: usages.length,
    usage_paths_count: usagePaths.length,
    usage_paths: usagePaths.slice(0, USAGE_PATHS_MAX),
    usage_paths_truncated: usagePathsTruncated,
    findings: usages.slice(0, USAGE_PATHS_MAX),
    repo,
    workflow,
    error: error || null,
    ts_utc: utcNowIso(),
  };
}

function writeReceipt(receiptOut, receipt) {
  const outPath = path.resolve(receiptOut);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function runGuard(options) {
  const mode = String(options.mode || '').trim().toLowerCase();
  const base = {
    mode,
    repo: options.repo || 'UNKNOWN',
    workflow: options.workflow || 'UNKNOWN',
  };

  if (!VALID_MODES.has(mode)) {
    const receipt = buildReceipt({
      ...base,
      usages: [],
      status: 'invalid_mode',
      error: `invalid_mode:${mode}`,
    });
    if (!options.dryRun) {
      writeReceipt(options.receiptOut, receipt);
    }
    return { exitCode: 2, receipt };
  }

  let usages = [];
  try {
    usages = findLocalSourceUsages({
      repoRoot: options.repoRoot,
      scanRoot: options.scanRoot,
    });
  } catch (err) {
    const receipt = buildReceipt({
      ...base,
      usages: [],
      status: 'scan_error',
      error: String(err && err.message ? err.message : err),
    });
    if (!options.dryRun) {
      writeReceipt(options.receiptOut, receipt);
    }
    return { exitCode: 2, receipt };
  }

  const hasUsage = usages.length > 0;
  const status = hasUsage ? 'local_source_usage_detected' : 'clean';
  const exitCode = hasUsage && mode === 'forbidden' ? 1 : 0;
  const receipt = buildReceipt({
    ...base,
    usages,
    status,
    error: null,
  });
  if (!options.dryRun) {
    writeReceipt(options.receiptOut, receipt);
  }
  return { exitCode, receipt };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { exitCode, receipt } = runGuard(options);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = {
  EVENT_NAME,
  parseArgs,
  findLocalSourceUsages,
  buildReceipt,
  runGuard,
};
