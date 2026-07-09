import { useState, useMemo, useEffect, useReducer } from 'react';
import { notifications } from '@mantine/notifications';
import type React from 'react';
import type { SoundCategory } from '../types/sound';
import {
  mapBackendSound,
  getSoundAssetUrl,
  type SoundEdit,
  type BackendSound,
} from '../components/modals/editSoundsShared';
import { useAudioPlayer } from './useAudioPlayer';

// ── Reducer for batch-resettable edits state ──────────────────────────────────

interface EditsState {
  edits: Record<string, boolean>;
  contextEdits: Record<string, string[]>;
  creditEdits: Record<string, string>;
  editingSoundId: string | null;
  loading: boolean;
}

const INITIAL_STATE: EditsState = {
  edits: {},
  contextEdits: {},
  creditEdits: {},
  editingSoundId: null,
  loading: false,
};

type EditsAction =
  | { type: 'RESET_AND_LOAD' }
  | { type: 'LOADED' }
  | { type: 'SET_TOGGLE'; filename: string; enabled: boolean }
  | { type: 'SET_EDITING'; id: string | null }
  | { type: 'SET_CONTEXT_ARRAY'; filename: string; contexts: string[] }
  | { type: 'SET_CREDIT'; filename: string; credit: string };

function editsReducer(state: EditsState, action: EditsAction): EditsState {
  switch (action.type) {
    case 'RESET_AND_LOAD':
      return { ...INITIAL_STATE, loading: true };
    case 'LOADED':
      return { ...state, loading: false };
    case 'SET_TOGGLE':
      return { ...state, edits: { ...state.edits, [action.filename]: action.enabled } };
    case 'SET_EDITING':
      return { ...state, editingSoundId: action.id };
    case 'SET_CONTEXT_ARRAY':
      return {
        ...state,
        contextEdits: { ...state.contextEdits, [action.filename]: action.contexts },
      };
    case 'SET_CREDIT':
      return { ...state, creditEdits: { ...state.creditEdits, [action.filename]: action.credit } };
    default:
      return state;
  }
}

// ── Hook interface ────────────────────────────────────────────────────────────

interface UseEditSoundsBaseOptions {
  opened: boolean;
  initialCategory: SoundCategory;
  /** Given the selected category, return the URL to fetch sounds from */
  buildFetchUrl: (category: SoundCategory) => string;
  /** Optional post-processing after raw sounds are loaded */
  onSoundsLoaded?: (sounds: SoundEdit[], rawData: BackendSound[]) => void;
}

export interface EditSoundsBaseReturn {
  // State
  sounds: SoundEdit[];
  setSounds: React.Dispatch<React.SetStateAction<SoundEdit[]>>;
  edits: Record<string, boolean>;
  contextEdits: Record<string, string[]>;
  dispatch: React.Dispatch<EditsAction>;
  creditEdits: Record<string, string>;
  setCreditEdits: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  selectedCategory: SoundCategory;
  setSelectedCategory: React.Dispatch<React.SetStateAction<SoundCategory>>;
  loading: boolean;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  editingSoundId: string | null;
  setEditingSoundId: (id: string | null) => void;
  currentlyPlaying: string | null;
  isPlaying: boolean;
  // Derived
  filteredSounds: SoundEdit[];
  // Handlers
  handleToggle: (filename: string, enabled: boolean) => void;
  handlePlayPause: (filename: string) => Promise<void>;
  handleStop: (filename: string) => void;
  handleContextChange: (filename: string, contexts: string[]) => void;
}

export function useEditSoundsBase({
  opened,
  initialCategory,
  buildFetchUrl,
  onSoundsLoaded,
}: UseEditSoundsBaseOptions): EditSoundsBaseReturn {
  const [editsState, dispatch] = useReducer(editsReducer, INITIAL_STATE);
  const [sounds, setSounds] = useState<SoundEdit[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SoundCategory>(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { play, stop, player } = useAudioPlayer();

  const filteredSounds = useMemo(
    () =>
      sounds.filter(
        (sound) =>
          !sound.isExternal &&
          sound.filename !== null &&
          (sound.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sound.filename.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [sounds, searchTerm]
  );

  useEffect(() => {
    if (!opened) {
      return;
    }

    // Single dispatch resets all edits state and sets loading atomically — no cascading renders
    dispatch({ type: 'RESET_AND_LOAD' });

    const url = buildFetchUrl(selectedCategory);

    fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json() as Promise<BackendSound[]>;
      })
      .then((data) => {
        const mapped = data.map((s) => mapBackendSound(s, selectedCategory));
        setSounds(mapped);
        onSoundsLoaded?.(mapped, data);
      })
      .catch((error: unknown) => {
        notifications.show({
          message: `Failed to load sounds: ${error instanceof Error ? error.message : 'Unknown error'}`,
          color: 'red',
        });
      })
      .finally(() => dispatch({ type: 'LOADED' }));
  }, [opened, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (filename: string, enabled: boolean) => {
    dispatch({ type: 'SET_TOGGLE', filename, enabled });
  };

  const handlePlayPause = async (filename: string) => {
    try {
      const url = getSoundAssetUrl(filename, selectedCategory);
      if (currentlyPlaying === filename && isPlaying) {
        player.current?.pause();
        setIsPlaying(false);
      } else {
        if (currentlyPlaying && currentlyPlaying !== filename) {
          stop();
        }
        await play(url, 0.5);
        setCurrentlyPlaying(filename);
        setIsPlaying(true);
      }
    } catch (error: unknown) {
      notifications.show({
        message: `Failed to play sound: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
    }
  };

  const handleStop = (filename: string) => {
    if (currentlyPlaying === filename) {
      stop();
      setCurrentlyPlaying(null);
      setIsPlaying(false);
    }
  };

  const handleContextChange = (filename: string, contexts: string[]) => {
    dispatch({ type: 'SET_CONTEXT_ARRAY', filename, contexts });
  };

  // Wrapper so consumers can call setCreditEdits((prev) => ...) without accessing dispatch directly
  const setCreditEdits = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    const next = updater(editsState.creditEdits);
    Object.entries(next).forEach(([filename, credit]) => {
      if (editsState.creditEdits[filename] !== credit) {
        dispatch({ type: 'SET_CREDIT', filename, credit });
      }
    });
  };

  return {
    sounds,
    setSounds,
    edits: editsState.edits,
    contextEdits: editsState.contextEdits,
    dispatch,
    creditEdits: editsState.creditEdits,
    setCreditEdits,
    selectedCategory,
    setSelectedCategory,
    loading: editsState.loading,
    searchTerm,
    setSearchTerm,
    editingSoundId: editsState.editingSoundId,
    setEditingSoundId: (id) => dispatch({ type: 'SET_EDITING', id }),
    currentlyPlaying,
    isPlaying,
    filteredSounds,
    handleToggle,
    handlePlayPause,
    handleStop,
    handleContextChange,
  };
}
