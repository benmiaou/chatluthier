/**
 * Soundboard component tests
 */

// Mock all dependencies
jest.mock('../../../src/contexts/SocketContext', () => ({
  useSocket: () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'test', isAdmin: false },
    isSignedIn: true,
  }),
}));

jest.mock('react-dnd', () => ({
  useDrag: () => [{}, jest.fn()],
  useDrop: () => [{}, jest.fn()],
  DndProvider: ({ children }: any) => children,
}));

jest.mock('react-dnd-html5-backend', () => ({}));

jest.mock('../../../src/services/api');

describe('Soundboard', () => {
  it('should import without errors', () => {
    expect(() => {
      // eslint-disable-next-line
      require('../../../src/components/audio/Soundboard');
    }).not.toThrow();
  });

  it('should be a valid React component', () => {
    // eslint-disable-next-line
    const Soundboard = require('../../../src/components/audio/Soundboard').default;
    expect(Soundboard).toBeTruthy();
    expect(typeof Soundboard).toBe('function');
  });
});
