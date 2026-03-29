import { renderHook, act } from '@testing-library/react';
import { useBackgroundMusic } from '../../../src/hooks/useBackgroundMusic';
import { BackgroundMusicCategories } from '../../../src/types/sound';
import { AudioPlayer } from '../../../src/hooks/useAudioPlayer';

// Mock the AudioPlayer
jest.mock('../../../src/hooks/useAudioPlayer', () => ({
  AudioPlayer: jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    setVolume: jest.fn(),
    getElement: jest.fn().mockReturnValue({
      currentTime: 0,
      duration: 180,
      paused: true,
      src: '',
    }),
    currentTime: 0,
    duration: 180,
  })),
  precacheAudio: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock sounds data
const mockSounds = [
  {
    id: '1',
    filename: 'calm1.mp3',
    name: 'Calm Sound 1',
    category: 'calm',
    isEnabled: true,
    isExternal: false,
  },
  {
    id: '2',
    filename: 'calm2.mp3',
    name: 'Calm Sound 2',
    category: 'calm',
    isEnabled: true,
    isExternal: false,
  },
  {
    id: '3',
    filename: 'dynamic1.mp3',
    name: 'Dynamic Sound 1',
    category: 'dynamic',
    isEnabled: true,
    isExternal: false,
  },
];

describe('BackgroundMusic Synchronization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockSounds),
    });
  });

  test('should play specific sound and advance to next on ended', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Mock onended handler
    const _mockOnEnded = jest.fn();
    const audioPlayer = new AudioPlayer();
    (audioPlayer.play as jest.Mock).mockImplementation((url, volume, startTime, onended) => {
      if (onended) {
        setTimeout(onended, 10); // Simulate track ending
      }
      return Promise.resolve();
    });

    // Play first sound
    await act(async () => {
      await result.current.playSpecificSound(mockSounds[0]);
    });

    expect(result.current.currentSound?.filename).toBe('calm1.mp3');
    expect(result.current.isPlaying).toBe(true);

    // Wait for onended to fire and advance to next sound
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have advanced to next sound in category
    expect(result.current.currentSound?.filename).not.toBe('calm1.mp3');
  });

  test('should handle duplicate play requests gracefully', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Play a sound
    await act(async () => {
      await result.current.playSpecificSound(mockSounds[0]);
    });

    const initialPlayCount = (audioPlayer.play as jest.Mock).mock.calls.length;

    // Try to play the same sound again
    await act(async () => {
      await result.current.playSpecificSound(mockSounds[0]);
    });

    // Should not have called play again for the same sound
    expect((audioPlayer.play as jest.Mock).mock.calls.length).toBe(initialPlayCount);
  });

  test('should handle category playback and advancement', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Play calm category
    await act(async () => {
      await result.current.playCategory(BackgroundMusicCategories.CALM);
    });

    expect(result.current.activeCategory).toBe('calm');
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentSound?.category).toBe('calm');

    // Mock onended to advance
    const audioPlayer = new AudioPlayer();
    (audioPlayer.play as jest.Mock).mockImplementationOnce((url, volume, startTime, onended) => {
      if (onended) {
        setTimeout(onended, 10);
      }
      return Promise.resolve();
    });

    // Wait for advancement
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should still be in calm category
    expect(result.current.activeCategory).toBe('calm');
  });

  test('should handle external sound playback', async () => {
    const mockExternalSound = {
      id: 'ext-1',
      filename: null,
      name: 'External Sound',
      category: 'background',
      isExternal: true,
      provider: 'spotify' as const,
      providerTrackId: 'spotify-track-1',
      artist: 'Test Artist',
      title: 'Test Title',
    };

    const mockPlayExternal = jest.fn();

    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), mockPlayExternal, jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Add external sound to sounds list
    await act(() => {
      result.current.sounds.push(mockExternalSound);
    });

    // Play external sound
    await act(async () => {
      await result.current.playSpecificSound(mockExternalSound);
    });

    // Should have called external play handler
    expect(mockPlayExternal).toHaveBeenCalledWith(mockExternalSound);
    expect(result.current.isPlaying).toBe(true);
  });

  test('should handle playback interruption gracefully', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Mock audio player to simulate interruption
    const audioPlayer = new AudioPlayer();
    let callCount = 0;
    (audioPlayer.play as jest.Mock).mockImplementation((_url, _volume, _startTime, _onended) => {
      callCount++;
      if (callCount === 1) {
        // First call gets interrupted
        return Promise.reject(
          new Error('AbortError: The play() request was interrupted by a new load request.')
        );
      }
      return Promise.resolve();
    });

    // First play attempt (will be interrupted)
    await act(async () => {
      try {
        await result.current.playSpecificSound(mockSounds[0]);
      } catch (_error) {
        // Expected to fail
      }
    });

    // Second play attempt (should succeed)
    await act(async () => {
      await result.current.playSpecificSound(mockSounds[1]);
    });

    // Should be playing the second sound
    expect(result.current.currentSound?.filename).toBe('calm2.mp3');
    expect(result.current.isPlaying).toBe(true);
  });

  test('should handle participant join synchronization', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Simulate receiving a sync message when already playing the same sound
    await act(async () => {
      await result.current.playSpecificSound(mockSounds[0]);
    });

    const initialPlayCount = (audioPlayer.play as jest.Mock).mock.calls.length;

    // Simulate receiving the same sound via socket (duplicate)
    await act(async () => {
      await result.current.playSpecificSound(mockSounds[0]);
    });

    // Should not have played again
    expect((audioPlayer.play as jest.Mock).mock.calls.length).toBe(initialPlayCount);
  });

  test('should handle volume changes during playback', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Start playback
    await act(async () => {
      await result.current.playSpecificSound(mockSounds[0]);
    });

    // Change volume
    await act(() => {
      result.current.setVolume(0.8);
    });

    expect(result.current.volume).toBe(0.8);

    // Audio player should have setVolume called
    const audioPlayer = new AudioPlayer();
    expect(audioPlayer.setVolume).toHaveBeenCalledWith(0.8);
  });

  test('should handle next button functionality', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
      await result.current.playCategory(BackgroundMusicCategories.CALM);
    });

    const initialSound = result.current.currentSound;

    // Click next
    await act(() => {
      result.current.next();
    });

    // Should have advanced to next sound in category
    expect(result.current.currentSound?.filename).not.toBe(initialSound?.filename);
    expect(result.current.currentSound?.category).toBe('calm');
  });

  test('should handle stop functionality', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
      await result.current.playSpecificSound(mockSounds[0]);
    });

    // Stop playback
    await act(() => {
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentSound).toBe(null);

    const audioPlayer = new AudioPlayer();
    expect(audioPlayer.stop).toHaveBeenCalled();
  });
});

describe('BackgroundMusic Edge Cases', () => {
  test('should handle empty sounds list', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue([]),
    });

    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    expect(result.current.sounds.length).toBe(0);

    // Should handle play attempts gracefully
    await act(async () => {
      await result.current.playCategory(BackgroundMusicCategories.CALM);
    });

    expect(result.current.isPlaying).toBe(false);
  });

  test('should handle disabled sounds filtering', async () => {
    const mixedSounds = [
      ...mockSounds,
      {
        id: 'disabled-1',
        filename: 'disabled.mp3',
        name: 'Disabled Sound',
        category: 'calm',
        isEnabled: false,
        isExternal: false,
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue(mixedSounds),
    });

    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Should not include disabled sounds
    expect(result.current.sounds.some((s) => s.id === 'disabled-1')).toBe(false);
  });

  test('should handle context filtering', async () => {
    const { result } = renderHook(() =>
      useBackgroundMusic('test-user', jest.fn(), jest.fn(), jest.fn(), jest.fn())
    );

    await act(async () => {
      await result.current.loadSounds();
    });

    // Set context
    await act(() => {
      result.current.handleSetContext('specific-context');
    });

    expect(result.current.context).toBe('specific-context');

    // Play category with context
    await act(async () => {
      await result.current.playCategory(BackgroundMusicCategories.CALM);
    });

    // Should play sound matching context
    expect(result.current.currentSound).toBeDefined();
  });
});
