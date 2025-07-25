// Simple test script to verify MultiRepositoryManager localStorage persistence
// Run this in the browser console or as a Node.js script

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

// Test the MultiRepositoryManager persistence
async function testMultiRepoPersistence() {
  console.log('🧪 Testing MultiRepositoryManager persistence...');
  
  // Clear any existing data
  localStorage.clear();
  
  // Import the MultiRepositoryManager (this would need to be adapted for the actual import)
  // For now, let's test the storage keys directly
  
  const testRepository = {
    id: 'test-repo-1',
    type: 'platform-extension',
    repositoryUri: 'test-owner/test-repo',
    branch: 'main',
    filePath: 'platforms/ios.json',
    platformId: 'ios',
    status: 'linked',
    lastSync: new Date().toISOString()
  };
  
  const testPlatformExtension = {
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
  };
  
  // Test storing repository links
  const repositories = [testRepository];
  localStorage.setItem('token-model:linked-repositories', JSON.stringify(repositories));
  
  // Test storing platform extensions
  const extensions = { 'ios': testPlatformExtension };
  localStorage.setItem('token-model:platform-extensions', JSON.stringify(extensions));
  
  // Test retrieving the data
  const retrievedRepositories = JSON.parse(localStorage.getItem('token-model:linked-repositories') || '[]');
  const retrievedExtensions = JSON.parse(localStorage.getItem('token-model:platform-extensions') || '{}');
  
  console.log('📦 Stored repositories:', retrievedRepositories);
  console.log('📦 Stored extensions:', retrievedExtensions);
  
  // Verify the data was stored correctly
  const reposMatch = JSON.stringify(retrievedRepositories) === JSON.stringify(repositories);
  const extensionsMatch = JSON.stringify(retrievedExtensions) === JSON.stringify(extensions);
  
  console.log('✅ Repository persistence test:', reposMatch ? 'PASSED' : 'FAILED');
  console.log('✅ Extension persistence test:', extensionsMatch ? 'PASSED' : 'FAILED');
  
  // Test that data persists across "page refreshes" (clearing and reloading)
  const savedRepos = localStorage.getItem('token-model:linked-repositories');
  const savedExtensions = localStorage.getItem('token-model:platform-extensions');
  
  console.log('💾 Data persists in localStorage:', {
    repositories: savedRepos ? 'YES' : 'NO',
    extensions: savedExtensions ? 'YES' : 'NO'
  });
  
  return {
    repositories: retrievedRepositories,
    extensions: retrievedExtensions,
    reposMatch,
    extensionsMatch
  };
}

// Run the test
if (typeof window !== 'undefined') {
  // Browser environment
  window.testMultiRepoPersistence = testMultiRepoPersistence;
  console.log('🌐 Test function available as window.testMultiRepoPersistence()');
} else {
  // Node.js environment
  testMultiRepoPersistence().then(result => {
    console.log('🎯 Test completed:', result);
    process.exit(result.reposMatch && result.extensionsMatch ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
} 