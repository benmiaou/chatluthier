/**
 * Test runner for all authentication system tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runAllTests() {
  console.log('🧪 Running all authentication system tests...\n');

  // Get all test files
  const testFiles = fs
    .readdirSync(__dirname)
    .filter(
      (file) => file.startsWith('test_') && file.endsWith('.js') && file !== 'run_all_tests.js'
    )
    .sort();

  if (testFiles.length === 0) {
    console.log('❌ No test files found!');
    return;
  }

  console.log(`Found ${testFiles.length} test(s) to run:\n`);

  let passedTests = 0;
  let failedTests = 0;

  for (const testFile of testFiles) {
    const testName = testFile.replace('test_', '').replace('.js', '').replace(/_/g, ' ');
    console.log(`🔵 Running: ${testName}`);

    try {
      // Run the test file
      execSync(`node ${path.join(__dirname, testFile)}`, {
        stdio: 'inherit',
        encoding: 'utf-8',
      });
      console.log(`✅ ${testName}: PASSED\n`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${testName}: FAILED\n`);
      failedTests++;
    }
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Total tests: ${testFiles.length}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed.`);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
