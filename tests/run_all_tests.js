/**
 * Test runner for all authentication system tests
 * Runs Jest suite with coverage and Node.js integration tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runAllTests() {
  console.log('🧪 Running ChatLuthier test suite...\n');

  // Run Jest tests first (with coverage)
  console.log('🔵 Running Jest tests with coverage...');
  try {
    execSync('npm run test:jest -- --coverage', {
      stdio: 'inherit',
      encoding: 'utf-8',
    });
    console.log('✅ Jest tests: PASSED\n');
  } catch (error) {
    console.log('❌ Jest tests: FAILED\n');
    console.log('💡 Run `npm run test:jest -- --coverage` for details\n');
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
    console.log('ℹ️  No Node.js integration test files found');
    console.log('\n📊 Test Summary:');
    console.log('   Jest: ✅ PASSED (check coverage/index.html for details)');
    console.log('   Integration: ℹ️  None configured');
    return;
  }

  console.log(`\n🔵 Running ${testFiles.length} integration test(s)...\n`);

  let passedTests = 0;
  let failedTests = 0;

  for (const testFile of testFiles) {
    const testName = testFile.replace('test_', '').replace('.js', '').replace(/_/g, ' ');
    console.log(`  🔵 ${testName}`);

    try {
      execSync(`node ${path.join(__dirname, testFile)}`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      console.log(`  ✅ PASSED\n`);
      passedTests++;
    } catch (error) {
      console.log(`  ❌ FAILED\n`);
      failedTests++;
    }
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log('   Jest tests: ✅ PASSED');
  console.log(`   Integration tests: ${passedTests}/${testFiles.length} passed`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!\n');
  } else {
    console.log(`\n⚠️  ${failedTests} integration test(s) failed.`);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
