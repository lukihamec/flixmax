
export interface IServerConfig {
  serverUrl: string;
  username: string;
  password: string;
  isConfigured: boolean;
  // Proxy do Player (Stream)
  proxyUrl?: string; 
  // Proxy da API (Listas/JSON)
  useApiProxy?: boolean; 
  apiProxyUrl?: string; 
}

export interface IAdsConfig {
    enabled: boolean;
    bannerTop?: string; // HTML Code
    bannerMiddle?: string; // HTML Code
    bannerBottom?: string; // HTML Code
    prerollUrl?: string; // Video URL (MP4/WebM)
}

export interface IUIConfig {
  appTitle: string;
  logoUrl: string;
  heroItems: {
    id: string | number;
    type: MediaType;
    title: string;
    cover: string;
    backdrop?: string;
    description?: string;
  }[];
  ads?: IAdsConfig;
}

export interface ISubscription {
    status: 'active' | 'inactive' | 'trial';
    plan: 'monthly' | 'yearly' | 'trial' | null;
    expiresAt: number; // Timestamp
}

export interface IUserSettings {
  parentalPin?: string; // 4 digit pin
  role?: 'admin' | 'user';
  subscription?: ISubscription;
}

export interface IUserProfile {
    id: string;
    name: string;
    avatarUrl: string;
    isKids?: boolean;
}

export interface IXtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface ILiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface IVODStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface ISeries {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface IContentData {
  liveStreams: ILiveStream[];
  vodStreams: IVODStream[];
  series: ISeries[];
  liveCategories: IXtreamCategory[];
  vodCategories: IXtreamCategory[];
  seriesCategories: IXtreamCategory[];
  loading: boolean;
  error: string | null;
}

export type MediaType = 'live' | 'movie' | 'series';

export interface IPlayableItem {
  id: number | string;
  url: string;
  title: string;
  type: MediaType;
  description?: string;
  icon?: string;
  resumeTime?: number;
  // For Series next episode
  nextItem?: {
    id: number | string;
    title: string;
    url: string;
    icon?: string;
    description?: string;
    originalItem: any;
  } | null;
}

export interface IWatchHistoryItem {
  id: string | number;
  type: MediaType;
  title: string;
  icon: string;
  progress: number; // Seconds watched
  duration: number; // Total duration in seconds
  lastWatched: number; // Timestamp
  streamData?: any; // Store basic data to relaunch without fetch
}
