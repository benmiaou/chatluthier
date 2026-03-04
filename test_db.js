const db = require('./srv/database/db');

async function testDatabase() {
  try {
    await db.initialize();

    // Test ambiance sounds
    const ambianceCount = await db.query('SELECT COUNT(*) as count FROM ambiance_sounds');
    console.log('Ambiance sounds count:', ambianceCount[0].count);

    // Test background sounds
    const backgroundCount = await db.query('SELECT COUNT(*) as count FROM background_sounds');
    console.log('Background sounds count:', backgroundCount[0].count);

    // Test soundboard
    const soundboardCount = await db.query('SELECT COUNT(*) as count FROM soundboard');
    console.log('Soundboard count:', soundboardCount[0].count);

    // Try to get some sample data
    const sampleAmbiance = await db.query('SELECT * FROM ambiance_sounds LIMIT 3');
    console.log('Sample ambiance sounds:', sampleAmbiance);

    await db.close();
  } catch (error) {
    console.error('Database test failed:', error.message);
  }
}

testDatabase();
