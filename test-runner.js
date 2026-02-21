#!/usr/bin/env node

/**
 * FreeLang v4 Test Runner
 *
 * Runs all test files in dist/ directory
 * Aggregates results and reports final summary
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, 'dist');
const testFiles = fs.readdirSync(DIST_DIR)
  .filter(f => f.endsWith('.test.js'))
  .sort();

console.log('🧪 FreeLang v4 Test Runner\n');
console.log(`📁 Running ${testFiles.length} test files...\n`);

let totalPassed = 0;
let totalFailed = 0;
let failedTests = [];

testFiles.forEach(testFile => {
  const testPath = path.join(DIST_DIR, testFile);
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📝 ${testFile}`);
  console.log('━'.repeat(60));

  try {
    const output = execSync(`node "${testPath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    console.log(output);

    // Parse results from output (handles Korean and English formats)
    const passMatch = output.match(/(\d+)\s*passed/i);
    const failMatch = output.match(/(\d+)\s*failed/i);

    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;

    totalPassed += passed;
    totalFailed += failed;

    if (failed > 0) {
      failedTests.push(testFile);
    }
  } catch (error) {
    console.error(`❌ Error running ${testFile}:`);
    console.error(error.message.split('\n').slice(0, 5).join('\n'));
    totalFailed++;
    failedTests.push(testFile);
  }
});

// Final summary
console.log(`\n${'━'.repeat(60)}`);
console.log('📊 Test Summary');
console.log('━'.repeat(60));
console.log(`✅ Passed: ${totalPassed}`);
console.log(`❌ Failed: ${totalFailed}`);
console.log(`📝 Total:  ${totalPassed + totalFailed}`);

if (failedTests.length > 0) {
  console.log(`\n⚠️  Failed Tests:`);
  failedTests.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log(`\n✨ All tests passed!`);
  process.exit(0);
}
