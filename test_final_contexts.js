// Test final context format
const soundController = require('./srv/controllers/soundController.sql');

async function testFinalContexts() {
    try {
        console.log('Testing final context format...');
        
        // Test background music
        const backgroundData = await soundController.getData(null, 'backgroundMusic');
        
        // Find a sound with multiple context pairs
        const testSound = backgroundData.find(s => s.filename === 'Gr├®goire_Lourme_-_Ambiance_Medievale_Theme_A.mp3');
        
        if (testSound) {
            console.log('\nTest sound:');
            console.log(JSON.stringify(testSound, null, 2));
            
            console.log('\nContext analysis:');
            console.log('Type:', typeof testSound.contexts);
            console.log('Is array:', Array.isArray(testSound.contexts));
            
            if (Array.isArray(testSound.contexts) && testSound.contexts.length > 0) {
                console.log('First context type:', typeof testSound.contexts[0]);
                console.log('First context is array:', Array.isArray(testSound.contexts[0]));
                
                if (Array.isArray(testSound.contexts[0])) {
                    console.log('✅ Context pairs preserved!');
                    console.log('Context pairs:');
                    testSound.contexts.forEach((pair, idx) => {
                        console.log(`  ${idx+1}. ["${pair[0]}", "${pair[1]}"]`);
                    });
                }
            }
        }
        
        console.log('\n✅ Final context test completed!');
        
    } catch (error) {
        console.error('Test error:', error);
    }
}

testFinalContexts();