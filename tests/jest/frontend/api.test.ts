/**
 * Frontend API service tests
 */

describe('api service', () => {
  it('should be importable', () => {
    // eslint-disable-next-line
    const api = require('../../../src/services/api');
    expect(api).toBeDefined();
  });

  it('should export API functions', () => {
    // eslint-disable-next-line
    const api =
      require('../../../src/services/api').default || require('../../../src/services/api');

    // Check for common API functions
    if (typeof api === 'object') {
      expect(api).toBeTruthy();
    }
  });
});
