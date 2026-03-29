/**
 * Test runner for all authentication system tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runAllTests() {
  console.log('🧪 Running all ChatLuthier tests...\n');

  // Run Jest tests first
  console.log('🔵 Running Jest tests...');
  try {
    execSync('npm run test:jest', {
      stdio: 'inherit',
      encoding: 'utf-8',
    });
    console.log('✅ Jest tests: PASSED\n');
  } catch (error) {
    console.log('❌ Jest tests: FAILED\n');
    process.exit(1);
  }

  // Get all Node.js test files
  const testFiles = fs
    .readdirSync(__dirname)
    .filter(
      (file) => file.startsWith('test_') && file.endsWith('.js') && file !== 'run_all_tests.js'
    )
    .sort();

  if (testFiles.length === 0) {
    console.log('ℹ️  No Node.js test files found!');
    return;
  }

  console.log(`Found ${testFiles.length} Node.js test(s) to run:\n`);

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
  console.log(`   Jest tests: Running via npm run test:jest`);
  console.log(`   Node.js tests: ${testFiles.length}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 All Node.js tests passed!');
    console.log('📝 Check Jest test results above for full coverage.');
  } else {
    console.log(`\n⚠️  ${failedTests} Node.js test(s) failed.`);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
