// Simple test to verify Jest setup works
describe('Jest Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to globals', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
  });
});