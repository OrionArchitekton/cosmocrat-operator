'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { runGuard } = require('./check-quarantine-local-source');

function withTempRepo(callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quarantine-guard-'));
  try {
    return callback(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('alert mode reports usage but stays non-blocking', () => {
  withTempRepo((repoRoot) => {
    writeFile(
      path.join(repoRoot, 'frontend', 'src', 'components', 'Panel.tsx'),
      "import { QUARANTINE_CONFIG } from '@/config/quarantine';\n",
    );

    const receiptOut = path.join(repoRoot, 'artifacts', 'receipt.json');
    const result = runGuard({
      mode: 'alert',
      receiptOut,
      repoRoot,
      scanRoot: path.join('frontend', 'src'),
      repo: 'org/repo',
      workflow: 'guard',
      dryRun: false,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.receipt.status, 'local_source_usage_detected');
    assert.equal(result.receipt.usage_count, 1);
    assert.equal(result.receipt.usage_paths_count, 1);
    assert.ok(fs.existsSync(receiptOut));
  });
});

test('forbidden mode blocks when usage exists', () => {
  withTempRepo((repoRoot) => {
    writeFile(
      path.join(repoRoot, 'frontend', 'src', 'components', 'Panel.tsx'),
      "import { isExecutorEnabled } from '../config/quarantine';\n",
    );

    const result = runGuard({
      mode: 'forbidden',
      receiptOut: path.join(repoRoot, 'artifacts', 'receipt.json'),
      repoRoot,
      scanRoot: path.join('frontend', 'src'),
      repo: 'org/repo',
      workflow: 'guard',
      dryRun: true,
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.receipt.level, 'L2');
    assert.equal(result.receipt.status, 'local_source_usage_detected');
    assert.equal(result.receipt.usage_count, 1);
  });
});

test('clean scan passes in forbidden mode', () => {
  withTempRepo((repoRoot) => {
    writeFile(
      path.join(repoRoot, 'frontend', 'src', 'components', 'Panel.tsx'),
      "export const panel = 'ok';\n",
    );

    const result = runGuard({
      mode: 'forbidden',
      receiptOut: path.join(repoRoot, 'artifacts', 'receipt.json'),
      repoRoot,
      scanRoot: path.join('frontend', 'src'),
      repo: 'org/repo',
      workflow: 'guard',
      dryRun: true,
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.receipt.status, 'clean');
    assert.equal(result.receipt.usage_count, 0);
  });
});

test('invalid mode returns deterministic fail-closed code', () => {
  withTempRepo((repoRoot) => {
    const result = runGuard({
      mode: 'unknown',
      receiptOut: path.join(repoRoot, 'artifacts', 'receipt.json'),
      repoRoot,
      scanRoot: path.join('frontend', 'src'),
      repo: 'org/repo',
      workflow: 'guard',
      dryRun: true,
    });

    assert.equal(result.exitCode, 2);
    assert.equal(result.receipt.status, 'invalid_mode');
  });
});
