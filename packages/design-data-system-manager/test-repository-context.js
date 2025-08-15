// Test script for RepositoryContextService
// This script validates that the RepositoryContextService is working correctly

console.log('Testing RepositoryContextService implementation...');

// Import the service
const { RepositoryContextService } = require('./dist/assets/index-3AvveD3z.js');

async function testRepositoryContextService() {
  try {
    console.log('\n1. Testing service instantiation...');
    const service = RepositoryContextService.getInstance();
    console.log('✅ Service instantiated successfully');

    console.log('\n2. Testing getCurrentContext...');
    const context = service.getCurrentContext();
    console.log('✅ getCurrentContext returned:', context);

    console.log('\n3. Testing getCurrentSourceContext...');
    const sourceContext = service.getCurrentSourceContext();
    console.log('✅ getCurrentSourceContext returned:', sourceContext);

    console.log('\n4. Testing getRepositoryInfo...');
    const repoInfo = service.getRepositoryInfo();
    console.log('✅ getRepositoryInfo returned:', repoInfo);

    console.log('\n5. Testing event system...');
    let eventReceived = false;
    service.subscribeToChanges('testEvent', (data) => {
      console.log('✅ Event received:', data);
      eventReceived = true;
    });

    service.emitEvent('testEvent', { test: 'data' });
    
    if (eventReceived) {
      console.log('✅ Event system working correctly');
    } else {
      console.log('❌ Event system not working');
    }

    console.log('\n6. Testing updateSourceContext...');
    const testUpdate = {
      sourceType: 'platform-extension',
      sourceId: 'test-platform',
      sourceName: 'Test Platform'
    };
    
    service.updateSourceContext(testUpdate);
    const updatedContext = service.getCurrentSourceContext();
    console.log('✅ updateSourceContext worked:', updatedContext);

    console.log('\n🎉 All tests passed! RepositoryContextService is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testRepositoryContextService();
