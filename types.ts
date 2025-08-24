
export interface Track {
  id: number | string;
  name: string;
  url: string;
  file?: File;
  type: 'file' | 'stream';
  artist?: string;
  isCustom?: boolean;
  coverArt?: string;
}

export interface SavedStory {
  id: string;
  story: string;
  trackId: number | string;
  trackName: string;
  artist?: string;
  createdAt: number;
}

export enum View {
  Library,
  Favorites,
  Radio,
  EQ,
}