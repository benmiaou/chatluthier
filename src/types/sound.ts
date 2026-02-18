export interface Sound {
  id: string;
  name: string;
  filename: string;
  category: string;
  credit?: string;
  creditUrl?: string;
  contexts?: string[];
  isEnabled?: boolean;
}

export type SoundCategory = 'background' | 'ambiance' | 'soundboard';

export type BackgroundMusicCategory = 'calm' | 'dynamic' | 'intense' | 'all';
