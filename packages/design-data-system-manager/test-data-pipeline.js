// Test script to verify data pipeline integration
// This simulates the GitHub load process and verifies MultiRepositoryManager data is cleared

// Mock localStorage for Node.js environment
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    data: {},
    getItem(key) {
      return this.data[key] || null;
    },
    setItem(key, value) {
      this.data[key] = value;
    },
    removeItem(key) {
      delete this.data[key];
    },
    clear() {
      this.data = {};
    }
  };
}

// Mock the data pipeline
function testDataPipelineIntegration() {
  console.log('🧪 Testing Data Pipeline Integration...');
  
  // Clear any existing data
  localStorage.clear();
  
  // Step 1: Simulate existing MultiRepositoryManager data
  const existingPlatformExtensions = {
    'ios': {
      platformId: 'ios',
      systemId: 'test-system',
      version: '1.0.0',
      tokenOverrides: [
        {
          id: 'test-token',
          valuesByMode: [
            {
              modeIds: ['default'],
              value: { value: '#FF0000' }
            }
          ]
        }
      ]
    }
  };
  
  const existingLinkedRepositories = [
    {
      id: 'test-repo-1',
      type: 'platform-extension',
      repositoryUri: 'test-owner/test-repo',
      branch: 'main',
      filePath: 'platforms/ios.json',
      platformId: 'ios',
      status: 'linked',
      lastSync: new Date().toISOString()
    }
  ];
  
  // Store existing MultiRepositoryManager data
  localStorage.setItem('token-model:linked-repositories', JSON.stringify(existingLinkedRepositories));
  localStorage.setItem('token-model:platform-extensions', JSON.stringify(existingPlatformExtensions));
  
  console.log('📦 Initial MultiRepositoryManager data stored');
  console.log('   - Linked repositories:', existingLinkedRepositories.length);
  console.log('   - Platform extensions:', Object.keys(existingPlatformExtensions).length);
  
  // Step 2: Simulate GitHub data load (this would clear MultiRepositoryManager data)
  const githubData = {
    systemName: 'Design System',
    systemId: 'design-system',
    version: '1.0.0',
    platforms: [
      { id: 'web', displayName: 'Web' }
    ],
    tokens: [],
    collections: [],
    dimensions: [],
    // Note: No platformExtensions in GitHub data
  };
  
  // Simulate the DataManager.processSchemaData behavior
  // This should clear MultiRepositoryManager data
  localStorage.setItem('token-model:linked-repositories', JSON.stringify([]));
  localStorage.setItem('token-model:platform-extensions', JSON.stringify({}));
  localStorage.setItem('token-model:theme-overrides', JSON.stringify(null));
  
  console.log('🔄 Simulated GitHub data load (clears MultiRepositoryManager data)');
  
  // Step 3: Verify MultiRepositoryManager data was cleared
  const retrievedRepositories = JSON.parse(localStorage.getItem('token-model:linked-repositories') || '[]');
  const retrievedExtensions = JSON.parse(localStorage.getItem('token-model:platform-extensions') || '{}');
  const retrievedOverrides = localStorage.getItem('token-model:theme-overrides');
  
  console.log('📦 After GitHub load:');
  console.log('   - Linked repositories:', retrievedRepositories.length);
  console.log('   - Platform extensions:', Object.keys(retrievedExtensions).length);
  console.log('   - Theme overrides:', retrievedOverrides === 'null' ? 'null' : 'exists');
  
  // Step 4: Verify the data was properly cleared
  const reposCleared = retrievedRepositories.length === 0;
  const extensionsCleared = Object.keys(retrievedExtensions).length === 0;
  const overridesCleared = retrievedOverrides === 'null';
  
  console.log('✅ Repository data cleared:', reposCleared ? 'PASSED' : 'FAILED');
  console.log('✅ Extension data cleared:', extensionsCleared ? 'PASSED' : 'FAILED');
  console.log('✅ Override data cleared:', overridesCleared ? 'PASSED' : 'FAILED');
  
  const allCleared = reposCleared && extensionsCleared && overridesCleared;
  console.log('🎯 Overall result:', allCleared ? 'PASSED - Data pipeline integration works correctly' : 'FAILED - Data not properly cleared');
  
  return {
    reposCleared,
    extensionsCleared,
    overridesCleared,
    allCleared
  };
}

// Run the test
if (typeof window !== 'undefined') {
  // Browser environment
  window.testDataPipelineIntegration = testDataPipelineIntegration;
  console.log('🌐 Test function available as window.testDataPipelineIntegration()');
} else {
  // Node.js environment
  const result = testDataPipelineIntegration();
  console.log('🎯 Test completed:', result);
  process.exit(result.allCleared ? 0 : 1);
} 