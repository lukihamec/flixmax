
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import AdminPanel from './pages/AdminPanel';
import UserPinModal from './components/UserPinModal';
import ProfileSelector from './components/ProfileSelector';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';
import LiveTVPage from './pages/LiveTVPage';
import VideoPlayer from './components/VideoPlayer'; // Switched to VideoPlayer
import DetailsModal from './components/DetailsModal';
import LoginPage from './components/LoginPage';
import AdBanner from './components/AdBanner'; 
import { IServerConfig, IContentData, IPlayableItem, MediaType, IWatchHistoryItem, IUIConfig, IUserProfile, IAdsConfig } from './types';
import { getServerConfig, getUserSettings, getResumeTime, trackView, getWatchHistory, getFavorites, subscribeToAuth, checkIsAdmin, getUIConfig, logoutUser } from './services/storage';
import { fetchAllData, getStreamUrl } from './services/api';
import { User } from 'firebase/auth';

// Componente interno para as linhas estilo Netflix
const ContentRow: React.FC<{ title: string; items: any[]; type: MediaType; onPlay: (item: any) => void }> = ({ title, items, type, onPlay }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="py-6 animate-fade-in relative z-20 px-4">
        <h3 className="text-lg md:text-xl font-bold text-white mb-3 hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-2">
            {title}
            <span className="text-xs font-normal text-gray-500 ml-2 bg-gray-800 px-2 py-0.5 rounded-full">{items.length}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </h3>
        <div className="group relative">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x px-1">
                {items.map((item, idx) => (
                    <div 
                        key={`${item.stream_id || item.series_id}-${idx}`}
                        onClick={() => onPlay(item)}
                        className="flex-shrink-0 w-32 md:w-48 cursor-pointer transition-all duration-300 hover:scale-105 hover:z-30 snap-start"
                    >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden relative bg-gray-800 shadow-lg border border-transparent hover:border-white/20">
                            <img 
                                src={item.stream_icon || item.cover} 
                                alt={item.name}
                                className="w-full h-full object-cover" 
                                loading="lazy"
                            />
                            {/* Overlay on Hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <h4 className="text-white text-xs font-bold line-clamp-2 drop-shadow-md">{item.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-white text-black px-1 rounded font-bold">HD</span>
                                    {item.rating_5based && <span className="text-[10px] text-green-400 font-bold">★ {item.rating_5based}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Gradient Fade for scrolling indication */}
            <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-[#0f0f1a] to-transparent pointer-events-none md:block hidden"></div>
        </div>
    </div>
  );
};

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'pending' | 'expired'>('active');
  
  // Profile State
  const [currentProfile, setCurrentProfile] = useState<IUserProfile | null>(null);

  // Configs
  const [serverConfig, setServerConfig] = useState<IServerConfig | null>(null);
  const [uiConfig, setUiConfig] = useState<IUIConfig | null>(null);
  const [userPin, setUserPin] = useState<string | undefined>(undefined);
  
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [content, setContent] = useState<IContentData>({
    liveStreams: [],
    vodStreams: [],
    series: [],
    liveCategories: [],
    vodCategories: [],
    seriesCategories: [],
    loading: false,
    error: null,
  });

  const [activeTab, setActiveTab] = useState('home'); 
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Pin Modal States
  const [showPinModal, setShowPinModal] = useState(false);
  const [isPinMandatory, setIsPinMandatory] = useState(false);
  
  const [playerConfig, setPlayerConfig] = useState<IPlayableItem & { originalItem?: any } | null>(null);
  const [homeCategoryTab, setHomeCategoryTab] = useState('trending');
  
  // Playlist State for Series
  const [seriesQueue, setSeriesQueue] = useState<any[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [seriesContext, setSeriesContext] = useState<any>(null); 
  
  // Hero Carousel State
  const [heroIndex, setHeroIndex] = useState(0);

  // New state for details modal
  const [selectedContent, setSelectedContent] = useState<{item: any, type: MediaType} | null>(null);

  // Feature: Global Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Feature: Continue Watching & Favorites
  const [watchHistory, setWatchHistory] = useState<IWatchHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  // Feature: Parental Control
  const [isAdultUnlocked, setIsAdultUnlocked] = useState(false); 
  const [pinPrompt, setPinPrompt] = useState<{ visible: boolean, callback?: () => void, targetName: string } | null>(null);
  const [pinInput, setPinInput] = useState('');

  // 1. Monitor Auth State
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
        setCurrentUser(user);
        if (user) {
            // Check Admin Role
            const adminStatus = await checkIsAdmin(user.uid);
            setIsAdmin(adminStatus);
            
            // Check Subscription Status (Skip check for Admins)
            if (!adminStatus) {
                const settings = await getUserSettings();
                const sub = settings?.subscription;
                
                if (!sub || sub.expiresAt === 0) {
                    setSubscriptionStatus('pending');
                } else if (sub.expiresAt < Date.now()) {
                    setSubscriptionStatus('expired');
                } else {
                    setSubscriptionStatus('active');
                }
            } else {
                setSubscriptionStatus('active');
            }
            
            // Don't initialize app data here immediately, wait for Profile Selection
            const config = await getServerConfig();
            const ui = await getUIConfig();
            
            if (config && config.isConfigured) {
              setServerConfig(config);
              setUiConfig(ui);
              loadContent(config);
            }
            
            // Check global PIN
            const userSettings = await getUserSettings();
            if (userSettings && userSettings.parentalPin) {
                setUserPin(userSettings.parentalPin);
                setIsPinMandatory(false);
            } else {
                setUserPin(undefined);
                setIsPinMandatory(true);
                setShowPinModal(true);
            }

            setIsConfigLoaded(true);
        } else {
            // Logout cleanup
            setServerConfig(null);
            setCurrentProfile(null);
            setContent(prev => ({ ...prev, loading: false }));
        }
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // When Profile Changes, load user-specific data
  useEffect(() => {
      if (currentProfile) {
          const loadProfileData = async () => {
              const history = await getWatchHistory(currentProfile.id);
              setWatchHistory(history);
              const favs = await getFavorites(currentProfile.id);
              setFavorites(favs);
          };
          loadProfileData();
          setActiveTab('home');
      }
  }, [currentProfile, playerConfig]); 

  const loadContent = async (settings: IServerConfig) => {
    setContent(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAllData(settings);
      setContent({
        ...data,
        loading: false,
        error: null
      });
    } catch (err) {
      setContent(prev => ({ 
        ...prev, 
        loading: false, 
        error: "Falha ao carregar dados do IPTV. Verifique a configuração do servidor." 
      }));
    }
  };

  const handleAdminSaveServer = (settings: IServerConfig) => {
    setServerConfig(settings);
    loadContent(settings);
  };

  const handleAdminSaveUI = (ui: IUIConfig) => {
      setUiConfig(ui);
  };

  // --- Content Filtering Logic ---

  // Helper: Find Category Name by ID
  const getCategoryName = (catId: string, type: 'live' | 'movie' | 'series') => {
      let cats: any[] = [];
      if (type === 'live') cats = content.liveCategories;
      else if (type === 'movie') cats = content.vodCategories;
      else cats = content.seriesCategories;

      const cat = cats.find(c => String(c.category_id) === String(catId));
      return cat ? cat.category_name.toUpperCase() : "";
  };

  // 1. Check if content is strictly FOR KIDS (Whitelist)
  const isKidsContent = (item: any, type: 'live' | 'movie' | 'series') => {
      const catId = item.category_id || "";
      const catName = getCategoryName(catId, type);
      const name = item.name ? item.name.toUpperCase() : "";
      
      const adultKeywords = ["XXX", "ADULT", "PORN", "+18", "SEX", "EROTIC", "HENTAI", "SEXO", "NUDE", "HOT", "AMATEUR", "SWINGER", "18+"];
      if (adultKeywords.some(k => catName.includes(k) || name.includes(k))) return false;

      const kidsKeywords = [
          "KIDS", "INFANTIL", "CRIANÇA", "CRIANCA", "DESENHO", "ANIMACAO", "ANIMAÇÃO", 
          "CARTOON", "DISNEY", "NICK", "GLOOB", "FAMILY", "FAMILIA", "JUNIOR", "BABY",
          "TOON", "ANIMATED", "PIXAR", "DREAMWORKS", "DISCOVERY KIDS"
      ];

      if (name.includes("FAMILY GUY") || name.includes("SOUTH PARK") || name.includes("RICK AND MORTY") || name.includes("AMERICAN DAD")) return false;

      if (kidsKeywords.some(k => catName.includes(k))) return true;
      return kidsKeywords.some(k => name.includes(k));
  };

  // 2. Check if content is ADULT (Blacklist) for Standard Profiles
  const isAdultContent = (item: any, type: 'live' | 'movie' | 'series') => {
      const catId = item.category_id || "";
      const catName = getCategoryName(catId, type);
      const keywords = ["XXX", "ADULT", "PORN", "+18", "SEX", "EROTIC", "ADULTOS", "HENTAI", "SEXO", "NUDE"];
      return keywords.some(k => catName.includes(k));
  };

  const filteredContent = useMemo(() => {
      if (currentProfile?.isKids) {
          return {
              ...content,
              vodStreams: content.vodStreams.filter(i => isKidsContent(i, 'movie')),
              series: content.series.filter(i => isKidsContent(i, 'series')),
              liveStreams: content.liveStreams.filter(i => isKidsContent(i, 'live'))
          };
      }

      const shouldFilterAdult = userPin && !isAdultUnlocked;

      if (!shouldFilterAdult) return content;
      
      return {
          ...content,
          vodStreams: content.vodStreams.filter(i => !isAdultContent(i, 'movie')),
          series: content.series.filter(i => !isAdultContent(i, 'series')),
          liveStreams: content.liveStreams.filter(i => !isAdultContent(i, 'live'))
      };
  }, [content, isAdultUnlocked, userPin, currentProfile]);

  // --- FILTER WATCH HISTORY ---
  const filteredWatchHistory = useMemo(() => {
      return watchHistory.filter(item => {
          const mockItem = { 
              category_id: item.streamData?.category_id || "", 
              name: item.title || ""
          };

          if (currentProfile?.isKids) {
              return isKidsContent(mockItem, item.type);
          }

          const shouldFilterAdult = userPin && !isAdultUnlocked;
          if (shouldFilterAdult && isAdultContent(mockItem, item.type)) {
              return false; 
          }

          return true; 
      });
  }, [watchHistory, currentProfile, userPin, isAdultUnlocked, content.liveCategories, content.vodCategories, content.seriesCategories]);


  const handleToggleLock = () => {
      if (isAdultUnlocked) setIsAdultUnlocked(false);
      else setPinPrompt({ visible: true, targetName: "Conteúdo Adulto", callback: () => setIsAdultUnlocked(true) });
  };

  const handlePinSubmit = () => {
      if (pinPrompt && pinInput === userPin) {
          if (pinPrompt.callback) pinPrompt.callback();
          setPinPrompt(null);
          setPinInput('');
      } else {
          alert("PIN Incorreto");
          setPinInput('');
      }
  };

  const openDetails = (item: any, type: MediaType) => {
      setSelectedContent({ item, type });
      setSearchQuery(''); 
      setIsSearching(false);
  };

  const startPlayback = async (item: any, type: MediaType, urlOverride?: string, context?: any) => {
    // 1. BLOCK LIVE TV FOR NON-ADMINS
    if (type === 'live' && !isAdmin) {
        setActiveTab('live'); 
        setSearchQuery('');
        setIsSearching(false);
        return;
    }

    if (!serverConfig || !currentProfile) return;
    setSelectedContent(null);
    setSearchQuery(''); 
    setIsSearching(false);

    if (context && context.seasonEpisodes) {
        setSeriesQueue(context.seasonEpisodes);
        setCurrentQueueIndex(context.episodeIndex || 0);
        setSeriesContext(item); 
    } else if (type !== 'series') {
        setSeriesQueue([]);
        setCurrentQueueIndex(0);
    }

    let id, title, icon, url;
    let resume = 0;
    let subtitle = '';
    let nextItem = null;

    try {
        if (type === 'live') {
            id = item.stream_id;
            title = typeof item.name === 'string' ? item.name : 'Canal Ao Vivo';
            icon = item.stream_icon;
            url = getStreamUrl(serverConfig, 'live', id);
            subtitle = 'Ao Vivo Agora';
        } else if (type === 'movie') {
            id = item.stream_id;
            title = typeof item.name === 'string' ? item.name : 'Filme';
            icon = item.stream_icon;
            url = getStreamUrl(serverConfig, 'movie', id, item.container_extension);
            resume = await getResumeTime(id.toString(), 'movie', currentProfile.id);
            subtitle = 'Filme';
        } else {
            id = item.stream_id; 
            title = item.name;
            icon = item.cover; 
            const ext = item.container_extension || 'mp4';
            url = getStreamUrl(serverConfig, 'series', id, ext);
            subtitle = 'Série';
            const queue = context?.seasonEpisodes || seriesQueue;
            const idx = context !== undefined ? context.episodeIndex : currentQueueIndex;
            if (queue && queue.length > idx + 1) {
                const nextEp = queue[idx + 1];
                nextItem = { id: nextEp.id, title: `E${nextEp.episode_num} - ${nextEp.title}`, url: '', originalItem: nextEp };
            }
        }
        trackView(id, title, type);
        setPlayerConfig({ id, url, title, type, icon, resumeTime: resume, description: subtitle, originalItem: item, nextItem });
    } catch (e) { console.error("Error starting playback:", e); }
  };

  const handleNextEpisode = () => {
      if (seriesQueue.length > currentQueueIndex + 1 && serverConfig) {
          const nextIdx = currentQueueIndex + 1;
          const nextEp = seriesQueue[nextIdx];
          let seriesName = seriesContext?.name || "";
          if (playerConfig?.title && !seriesName) seriesName = playerConfig.title.split(" - S")[0];
          const ext = nextEp.container_extension || 'mp4';
          const enrichedItem = { ...nextEp, name: `${seriesName} - S?E${nextEp.episode_num} - ${nextEp.title}`, stream_id: nextEp.id, cover: seriesContext?.cover || seriesContext?.stream_icon || playerConfig?.icon, container_extension: ext };
          setCurrentQueueIndex(nextIdx);
          startPlayback(enrichedItem, 'series', undefined, { seasonEpisodes: seriesQueue, episodeIndex: nextIdx });
      }
  };

  // Helper to shuffle array
  const shuffleArray = (array: any[]) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  // --- DATA PROCESSING FOR SECTIONS ---
  const homeData = useMemo(() => {
    if (filteredContent.loading) return null;

    // 1. HERO SLIDER
    let heroItems = [];
    if (uiConfig?.heroItems && uiConfig.heroItems.length > 0) {
        heroItems = uiConfig.heroItems.map(h => {
             let fullObj;
             if (h.type === 'movie') fullObj = filteredContent.vodStreams.find(m => String(m.stream_id) === String(h.id));
             else if (h.type === 'series') fullObj = filteredContent.series.find(s => String(s.series_id) === String(h.id));
             if (!fullObj) return null;
             return { ...h, ...(fullObj || {}), mediaType: h.type };
        }).filter(Boolean); 
    } else {
        const allMovies = filteredContent.vodStreams.map(m => ({ ...m, mediaType: 'movie' as MediaType }));
        const allSeries = filteredContent.series.map(s => ({ ...s, mediaType: 'series' as MediaType }));
        const randomSeries = shuffleArray(allSeries).slice(0, 3);
        const randomMovies = shuffleArray(allMovies).slice(0, 2);
        heroItems = shuffleArray([...randomSeries, ...randomMovies]);
        if (heroItems.length === 0 && allSeries.length > 0) heroItems = [allSeries[0]];
    }

    // 2. NETFLIX STYLE ROWS GENERATION
    // Helper to get content by multiple keywords
    const getByKeywords = (keywords: string[], type: 'movie' | 'series', limit = 50) => {
         const list = type === 'movie' ? filteredContent.vodStreams : filteredContent.series;
         const matches = list.filter(item => {
             const catName = getCategoryName(item.category_id, type);
             return keywords.some(k => catName.includes(k));
         });
         return shuffleArray(matches).slice(0, limit);
    };

    const actionMovies = getByKeywords(['AÇÃO', 'ACTION', 'AVENTURA', 'ADVENTURE', 'POLICIAL'], 'movie');
    const comedyMovies = getByKeywords(['COMEDIA', 'COMÉDIA', 'COMEDY', 'HUMOR', 'SITCOM'], 'movie');
    const horrorMovies = getByKeywords(['TERROR', 'HORROR', 'SUSPENSE', 'MEDO'], 'movie');
    const romanceMovies = getByKeywords(['ROMANCE', 'LOVE', 'AMOR', 'DRAMA ROMANTICO'], 'movie');
    const dramaSeries = getByKeywords(['DRAMA', 'MELODRAMA'], 'series');
    const actionSeries = getByKeywords(['AÇÃO', 'ACTION', 'AVENTURA', 'GUERRA'], 'series');
    const scifiMovies = getByKeywords(['FICÇÃO', 'SCI', 'FANTASIA'], 'movie');
    
    const animationMovies = getByKeywords(['ANIMACAO', 'ANIMAÇÃO', 'DESENHO', 'KIDS', 'INFANTIL', 'ANIME', 'CARTOON', 'DISNEY', 'PIXAR'], 'movie');
    const animationSeries = getByKeywords(['ANIMACAO', 'ANIMAÇÃO', 'DESENHO', 'KIDS', 'INFANTIL', 'ANIME', 'CARTOON'], 'series');
    const animationContent = shuffleArray([...animationMovies, ...animationSeries]).slice(0, 60);

    const newReleases = filteredContent.vodStreams.slice(0, 50); // Usually API returns sorted by ID/Date

    const popularContent = shuffleArray([
        ...filteredContent.vodStreams.filter(m => (m.rating_5based && m.rating_5based >= 4.0)),
        ...filteredContent.series.filter(s => (s.rating_5based && s.rating_5based >= 4.0))
    ]).slice(0, 50);
    // Fallback if no ratings
    if (popularContent.length < 10) {
        popularContent.push(...shuffleArray([...filteredContent.vodStreams, ...filteredContent.series]).slice(0, 40));
    }

    const weeklyHighlights = shuffleArray([...filteredContent.vodStreams, ...filteredContent.series]).slice(0, 20);

    // 3. TAB CONTENT
    let tabContent: any[] = [];
    let tabType: MediaType = 'movie'; 

    if (homeCategoryTab === 'trending') {
        const movies = filteredContent.vodStreams.map(m => ({ ...m, mediaType: 'movie' as MediaType }));
        const series = filteredContent.series.map(s => ({ ...s, mediaType: 'series' as MediaType }));
        tabContent = shuffleArray([...movies, ...series]).slice(0, 10);
    } else if (homeCategoryTab === 'movies') {
        tabContent = shuffleArray([...filteredContent.vodStreams]).slice(0, 10);
        tabType = 'movie';
    } else if (homeCategoryTab === 'series') {
        tabContent = shuffleArray([...filteredContent.series]).slice(0, 10);
        tabType = 'series';
    } else if (homeCategoryTab === 'tv') {
        tabContent = shuffleArray([...filteredContent.liveStreams]).slice(0, 10);
        tabType = 'live';
    } else if (homeCategoryTab === 'news') {
        const newsChannels = filteredContent.liveStreams.filter(c => 
            (c.name && (c.name.toLowerCase().includes('news') || c.name.toLowerCase().includes('noticias')))
        );
        tabContent = newsChannels.length ? newsChannels : filteredContent.liveStreams.slice(0, 10);
        tabType = 'live';
    }

    const popularSeries = filteredContent.series.slice(0, 4);
    const tvChannels = filteredContent.liveStreams.slice(0, 6);

    return { 
        heroItems: heroItems.length > 0 ? heroItems : (filteredContent.series.length > 0 ? [{...filteredContent.series[0], mediaType: 'series'}] : []), 
        tv: tvChannels, 
        series: popularSeries, 
        tabContent, 
        tabType,
        // New Rows
        rows: {
            action: actionMovies,
            comedy: comedyMovies,
            horror: horrorMovies,
            scifi: scifiMovies,
            romance: romanceMovies,
            drama: dramaSeries,
            actionSeries: actionSeries,
            animation: animationContent,
            newReleases: newReleases,
            popular: popularContent,
            highlights: weeklyHighlights
        }
    };
  }, [filteredContent, homeCategoryTab, uiConfig]); 

  const searchResults = useMemo(() => {
      if (!searchQuery || searchQuery.length < 2) return null;
      const term = searchQuery.toLowerCase();
      const movies = filteredContent.vodStreams.filter(i => i.name.toLowerCase().includes(term)).slice(0, 10);
      const series = filteredContent.series.filter(i => i.name.toLowerCase().includes(term)).slice(0, 10);
      const tv = filteredContent.liveStreams.filter(i => i.name.toLowerCase().includes(term)).slice(0, 10);
      return { movies, series, tv };
  }, [searchQuery, filteredContent]);

  useEffect(() => {
    if (!homeData?.heroItems || homeData.heroItems.length <= 1) return;
    const interval = setInterval(() => { setHeroIndex(prev => (prev + 1) % homeData.heroItems.length); }, 5000);
    return () => clearInterval(interval);
  }, [homeData?.heroItems]);

  const currentHeroItem = homeData?.heroItems[heroIndex];

  const handleSeeMore = () => {
      if (homeCategoryTab === 'series') setActiveTab('series');
      else if (homeCategoryTab === 'tv' || homeCategoryTab === 'news') setActiveTab('live');
      else setActiveTab('movies');
      window.scrollTo(0, 0);
  };

  // Helper to get ad codes if enabled
  const ads: IAdsConfig = (uiConfig?.ads && uiConfig.ads.enabled) ? uiConfig.ads : { enabled: false };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen bg-[#0f0f1a]"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!currentUser) return <LoginPage onLoginSuccess={() => {}} />;
  
  // --- BLOCKED SCREENS ---
  if (subscriptionStatus === 'pending' && !isAdmin) {
      return (
          <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl animate-fade-in">
                  <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">Aguardando Aprovação</h1>
                  <p className="text-gray-400 mb-6">Sua conta foi criada com sucesso! Aguarde a liberação do administrador para começar a assistir.</p>
                  <button onClick={() => logoutUser()} className="text-indigo-400 hover:text-white font-medium underline">Sair da conta</button>
              </div>
          </div>
      );
  }

  if (subscriptionStatus === 'expired' && !isAdmin) {
      return (
          <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-gray-800 p-8 rounded-2xl max-w-md w-full border border-gray-700 shadow-2xl animate-fade-in">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">Acesso Expirado</h1>
                  <p className="text-gray-400 mb-6">Seu período de acesso encerrou. Entre em contato com o administrador para renovar sua assinatura.</p>
                  <button onClick={() => logoutUser()} className="text-indigo-400 hover:text-white font-medium underline">Sair da conta</button>
              </div>
          </div>
      );
  }

  if (!isConfigLoaded) return <div className="flex items-center justify-center min-h-screen bg-[#0f0f1a]"><div className="text-center"><div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-400">Carregando sistema...</p></div></div>;
  if (!currentProfile) return <ProfileSelector onSelectProfile={(profile) => setCurrentProfile(profile)} />;

  return (
    <>
      <Navbar 
        onSearch={(term) => { setSearchQuery(term); setIsSearching(!!term); }} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onAdminClick={() => setShowAdmin(true)} 
        onPinClick={() => { setShowPinModal(true); setIsPinMandatory(false); }} 
        isConfigured={!!serverConfig} 
        isUnlocked={isAdultUnlocked} 
        onToggleLock={handleToggleLock} 
        hasPinConfigured={!!userPin} 
        isAdmin={isAdmin}
        logoUrl={uiConfig?.logoUrl} 
        appTitle={uiConfig?.appTitle}
        currentProfile={currentProfile}
        onChangeProfile={() => setCurrentProfile(null)}
      />

      {isSearching && searchResults && (
          <div className="fixed inset-0 z-40 bg-black/95 pt-24 overflow-y-auto px-4 animate-fade-in">
              <div className="container mx-auto pb-20">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-white">Resultados para "{searchQuery}"</h2>
                      <button onClick={() => { setSearchQuery(''); setIsSearching(false); }} className="text-gray-400 hover:text-white">Fechar Busca</button>
                  </div>
                   {searchResults.movies.length > 0 && <div className="mb-8"><h3 className="text-xl font-bold text-purple-400 mb-4">Filmes</h3><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{searchResults.movies.map(m => (<div key={m.stream_id} onClick={() => openDetails(m, 'movie')} className="cursor-pointer group"><img src={m.stream_icon} className="rounded-lg aspect-[2/3] object-cover" /><p className="text-sm mt-2 truncate group-hover:text-purple-400">{m.name}</p></div>))}</div></div>}
                   {searchResults.series.length > 0 && <div className="mb-8"><h3 className="text-xl font-bold text-pink-400 mb-4">Séries</h3><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{searchResults.series.map(s => (<div key={s.series_id} onClick={() => openDetails(s, 'series')} className="cursor-pointer group"><img src={s.cover} className="rounded-lg aspect-[2/3] object-cover" /><p className="text-sm mt-2 truncate group-hover:text-pink-400">{s.name}</p></div>))}</div></div>}
                   {searchResults.tv.length > 0 && <div className="mb-8"><h3 className="text-xl font-bold text-blue-400 mb-4">TV</h3><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{searchResults.tv.map(t => (<div key={t.stream_id} onClick={() => startPlayback(t, 'live')} className="cursor-pointer group"><div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center p-4"><img src={t.stream_icon} className="max-w-full max-h-full" onError={(e) => e.currentTarget.style.display='none'} /></div><p className="text-sm mt-2 truncate group-hover:text-blue-400">{t.name}</p></div>))}</div></div>}
              </div>
          </div>
      )}

      {!isSearching && activeTab === 'movies' && <MoviesPage movies={filteredContent.vodStreams} categories={content.vodCategories} onPlay={(i) => openDetails(i, 'movie')} onBack={() => setActiveTab('home')} />}
      {!isSearching && activeTab === 'series' && <SeriesPage series={filteredContent.series} categories={content.seriesCategories} onPlay={(i) => openDetails(i, 'series')} onBack={() => setActiveTab('home')} />}
      {!isSearching && activeTab === 'live' && (
        <LiveTVPage 
            channels={filteredContent.liveStreams} 
            categories={content.liveCategories} 
            onPlay={(i) => startPlayback(i, 'live')} 
            onBack={() => setActiveTab('home')}
            isAdmin={isAdmin}
        />
      )}

      {!isSearching && activeTab === 'home' && (
        <>
            <section className="relative pt-24 pb-8 md:pb-12 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-90"></div>
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs><pattern id="hero-pattern" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"></circle></pattern></defs>
                        <rect width="100%" height="100%" fill="url(#hero-pattern)"></rect>
                    </svg>
                </div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col-reverse md:flex-row items-center gap-8 md:gap-0">
                        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
                            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6 leading-tight">
                                <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                                    {uiConfig?.appTitle ? uiConfig.appTitle.split(' ')[0] : 'Streaming'}
                                </span> 
                                <span className="block">
                                    {uiConfig?.appTitle ? uiConfig.appTitle.split(' ').slice(1).join(' ') : 'sem limites'}
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-gray-300 mb-6 md:mb-8 max-w-md md:max-w-none">
                                {currentProfile?.isKids ? "Desenhos, filmes e diversão para você!" : "Filmes, séries e TV online. Tudo em um só lugar, quando e onde quiser."}
                            </p>
                            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                                <button onClick={() => currentHeroItem && openDetails(currentHeroItem, (currentHeroItem as any).mediaType)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 md:py-4 rounded-full font-medium hover:opacity-90 transition-all pulse-animation w-full sm:w-auto">
                                    Começar agora
                                </button>
                                <button className="bg-gray-800/80 text-white px-8 py-3 md:py-4 rounded-full font-medium hover:bg-gray-700/80 transition-all flex items-center justify-center w-full sm:w-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Ver trailer
                                </button>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 relative">
                            <div className="relative w-full aspect-video md:h-[400px] rounded-2xl overflow-hidden shadow-2xl floating">
                                {currentHeroItem ? (
                                    <>
                                        <img src={(currentHeroItem as any).cover || (currentHeroItem as any).stream_icon} className="absolute inset-0 w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg onClick={() => openDetails(currentHeroItem, (currentHeroItem as any).mediaType)} xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 md:h-20 md:w-20 text-white opacity-80 hover:opacity-100 transition-all cursor-pointer" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                                            <h3 className="text-xl md:text-2xl font-bold truncate">{currentHeroItem.title || (currentHeroItem as any).name}</h3>
                                            <p className="text-gray-300 text-sm md:text-base hidden sm:block">Assista quando quiser, onde quiser</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500 bg-gray-900/50">
                                        {currentProfile?.isKids ? "Carregando desenhos..." : "Carregando destaques..."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AD BANNER 1 (After Hero) */}
            <AdBanner format="horizontal" code={ads.bannerTop} />

            {/* CONTINUE WATCHING */}
            {filteredWatchHistory.length > 0 && (
                <section className="py-8 relative z-20 px-4">
                    <div className="container mx-auto">
                        <h2 className="text-xl md:text-2xl font-bold mb-4 text-white drop-shadow-md flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Continuar Assistindo
                        </h2>
                        <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                            {filteredWatchHistory.map((item) => {
                                const percent = Math.min(100, Math.max(0, (item.progress / item.duration) * 100));
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => {
                                            if (item.streamData) startPlayback(item.streamData, item.type);
                                        }}
                                        className="flex-shrink-0 w-60 md:w-72 bg-gray-900 rounded-lg overflow-hidden cursor-pointer group relative hover:scale-105 transition-transform border border-gray-800 hover:border-indigo-500/50 shadow-lg snap-start"
                                    >
                                        <div className="aspect-video relative">
                                            <img src={item.streamData?.backdrop_path?.[0] || item.icon} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                                                <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-bold text-sm text-gray-200 truncate">{item.title}</h4>
                                            <p className="text-xs text-gray-500 mt-1 capitalize">{item.type === 'movie' ? 'Filme' : item.type === 'series' ? 'Série' : 'TV'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* TAB CATEGORIES & FEATURED */}
            <section className="py-8 md:py-12 relative">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center mb-8 md:mb-10 overflow-x-auto pb-2 scrollbar-hide">
                        <div className="inline-flex bg-gray-800/50 p-1 rounded-xl whitespace-nowrap">
                            <button onClick={() => setHomeCategoryTab('trending')} className={`category-tab px-4 py-2 md:px-6 md:py-3 rounded-lg text-xs md:text-sm font-medium ${homeCategoryTab === 'trending' ? 'active' : ''}`}>Em Alta</button>
                            <button onClick={() => setHomeCategoryTab('movies')} className={`category-tab px-4 py-2 md:px-6 md:py-3 rounded-lg text-xs md:text-sm font-medium ${homeCategoryTab === 'movies' ? 'active' : ''}`}>Filmes</button>
                            <button onClick={() => setHomeCategoryTab('series')} className={`category-tab px-4 py-2 md:px-6 md:py-3 rounded-lg text-xs md:text-sm font-medium ${homeCategoryTab === 'series' ? 'active' : ''}`}>Séries</button>
                            <button onClick={() => setHomeCategoryTab('tv')} className={`category-tab px-4 py-2 md:px-6 md:py-3 rounded-lg text-xs md:text-sm font-medium ${homeCategoryTab === 'tv' ? 'active' : ''}`}>TV Online</button>
                            <button onClick={() => setHomeCategoryTab('news')} className={`category-tab px-4 py-2 md:px-6 md:py-3 rounded-lg text-xs md:text-sm font-medium ${homeCategoryTab === 'news' ? 'active' : ''}`}>Notícias</button>
                        </div>
                    </div>

                    <div className="category-content">
                        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">
                            {homeCategoryTab === 'trending' ? 'Em Alta Agora' : 
                            homeCategoryTab === 'movies' ? 'Filmes em Destaque' : 
                            homeCategoryTab === 'series' ? 'Séries em Destaque' : 
                            homeCategoryTab === 'tv' ? 'Canais em Destaque' : 'Notícias em Destaque'}
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                            {homeData?.tabContent.map((item: any, idx: number) => (
                                <div key={idx} onClick={() => openDetails(item, item.mediaType || homeData.tabType)} className="card-hover rounded-xl overflow-hidden bg-gray-800/50 relative cursor-pointer group">
                                    <div className="aspect-[2/3] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 relative">
                                        <img src={item.stream_icon || item.cover} className="absolute inset-0 w-full h-full object-cover" alt={item.name} loading="lazy" />
                                        
                                        {!isAdmin && (item.stream_type === 'live' || homeData.tabType === 'live') && (
                                            <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg z-10">
                                                EM BREVE
                                            </div>
                                        )}

                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                                            <div className="flex items-center mb-1">
                                                <span className="text-yellow-400 mr-1">★</span>
                                                <span className="text-sm">{item.rating_5based || 'N/A'}</span>
                                            </div>
                                            <h3 className="font-bold line-clamp-1 text-sm">{item.name}</h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-10 flex justify-center">
                            <button 
                                onClick={handleSeeMore}
                                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-bold transition-all shadow-lg hover:shadow-xl flex items-center group"
                            >
                                Ver Mais
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- NETFLIX STYLE ROWS --- */}
            <section className="container mx-auto pb-12">
                <ContentRow title="Destaques da Semana" items={homeData?.rows.highlights} type="movie" onPlay={(i) => openDetails(i, (i.series_id ? 'series' : 'movie'))} />

                <ContentRow title="Populares no FlixMax" items={homeData?.rows.popular} type="movie" onPlay={(i) => openDetails(i, (i.series_id ? 'series' : 'movie'))} />
                
                <ContentRow title="Adicionados Recentemente" items={homeData?.rows.newReleases} type="movie" onPlay={(i) => openDetails(i, 'movie')} />
                
                <ContentRow title="Filmes de Ação e Aventura" items={homeData?.rows.action} type="movie" onPlay={(i) => openDetails(i, 'movie')} />
                
                {/* AD BANNER 2 (Middle) */}
                <AdBanner format="horizontal" code={ads.bannerMiddle} />

                <ContentRow title="Para Morrer de Rir" items={homeData?.rows.comedy} type="movie" onPlay={(i) => openDetails(i, 'movie')} />
                
                <ContentRow title="Terror e Suspense" items={homeData?.rows.horror} type="movie" onPlay={(i) => openDetails(i, 'movie')} />
                
                <ContentRow title="Ficção Científica e Fantasia" items={homeData?.rows.scifi} type="movie" onPlay={(i) => openDetails(i, 'movie')} />
                
                <ContentRow title="Filmes de Romance" items={homeData?.rows.romance} type="movie" onPlay={(i) => openDetails(i, 'movie')} />

                <ContentRow title="Séries de Ação" items={homeData?.rows.actionSeries} type="series" onPlay={(i) => openDetails(i, 'series')} />
                
                <ContentRow title="Séries de Drama" items={homeData?.rows.drama} type="series" onPlay={(i) => openDetails(i, 'series')} />
                
                <ContentRow title="Animações e Desenhos" items={homeData?.rows.animation} type="movie" onPlay={(i) => openDetails(i, (i.series_id ? 'series' : 'movie'))} />
            </section>

            {/* FEATURED BIG HIGHLIGHT */}
            <section className="py-8 md:py-12 relative">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Destaques da Semana</h2>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                        <div className="aspect-[16/9] md:aspect-[21/9] bg-gradient-to-r from-indigo-900/50 to-purple-900/50 relative">
                            {currentHeroItem && <img src={(currentHeroItem as any).backdrop_path?.[0] || (currentHeroItem as any).cover} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <button onClick={() => currentHeroItem && openDetails(currentHeroItem, (currentHeroItem as any).mediaType)} className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 md:p-8">
                                <div className="max-w-3xl">
                                    <span className="inline-block bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-md text-xs md:text-sm font-medium mb-2 md:mb-4">ESTREIA EXCLUSIVA</span>
                                    <h3 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">{currentHeroItem ? (currentHeroItem.title || (currentHeroItem as any).name) : "Mundos Paralelos"}</h3>
                                    <p className="text-gray-300 mb-4 md:mb-6 text-sm md:text-lg line-clamp-2">{(currentHeroItem as any)?.plot || "Uma jornada épica através de dimensões desconhecidas, onde a realidade se dobra e o impossível se torna possível."}</p>
                                    <div className="flex flex-wrap gap-4">
                                        <button onClick={() => currentHeroItem && openDetails(currentHeroItem, (currentHeroItem as any).mediaType)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 md:py-3 rounded-lg font-medium hover:opacity-90 transition-all flex items-center text-sm md:text-base">
                                            Assistir agora
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* AD BANNER 3 (Bottom) */}
            <AdBanner format="horizontal" code={ads.bannerBottom} />

            {/* TV Channels Section (VISIBLE BUT RESTRICTED) */}
            <section className="py-8 md:py-12 relative">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 flex items-center gap-3">
                        TV Online
                        {!isAdmin && <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded uppercase font-bold tracking-wider">Em Breve</span>}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                        {homeData?.tv.map((channel, i) => (
                            <div key={i} onClick={() => startPlayback(channel, 'live')} className="bg-gray-800/50 rounded-xl p-3 md:p-4 text-center hover:bg-gray-700/50 transition-all cursor-pointer relative group">
                                {!isAdmin && (
                                    <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow z-10">
                                        BREVE
                                    </div>
                                )}
                                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mb-2 md:mb-3 overflow-hidden group-hover:scale-105 transition-transform">
                                    {channel.stream_icon ? <img src={channel.stream_icon} className="w-full h-full object-cover" /> : <span className="text-xl font-bold">TV</span>}
                                </div>
                                <h3 className="font-medium truncate text-sm md:text-base">{channel.name}</h3>
                                <p className="text-[10px] md:text-xs text-gray-400">Ao vivo agora</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Popular Series Section */}
            <section className="py-8 md:py-12 relative">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Séries Populares</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {homeData?.series.map((item, i) => (
                            <div key={i} className="card-hover rounded-xl overflow-hidden bg-gray-800/50 relative">
                                <div className="aspect-[16/9] bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <svg className="w-10 h-10 md:w-12 md:h-12 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-base md:text-lg truncate">{item.name}</h3>
                                        <span className="text-yellow-400 text-sm">★ {item.rating_5based || 'N/A'}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs md:text-sm mb-3">Drama, Sci-Fi</p>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] md:text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">ASSISTIR</span>
                                        <button onClick={() => openDetails(item, 'series')} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 z-0"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">Pronto para uma experiência incrível?</h2>
                        <p className="text-lg md:text-xl text-gray-300 mb-6 md:mb-8">Assista a filmes, séries e TV online em qualquer dispositivo, quando e onde quiser.</p>
                        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 md:py-4 rounded-full font-medium hover:opacity-90 transition-all pulse-animation text-lg">
                            Começar agora
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black/80 py-12">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="col-span-2 md:col-span-1">
                            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                                {uiConfig?.appTitle || "FlixMax"}
                            </h3>
                            <p className="text-gray-400 text-sm">Sua plataforma de streaming favorita com o melhor conteúdo.</p>
                        </div>
                        <div>
                            <h4 className="text-lg font-medium mb-4">Navegação</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Início</button></li>
                                <li><button onClick={() => setActiveTab('movies')} className="hover:text-white transition-colors">Filmes</button></li>
                                <li><button onClick={() => setActiveTab('series')} className="hover:text-white transition-colors">Séries</button></li>
                                <li><button onClick={() => setActiveTab('live')} className="hover:text-white transition-colors">TV Online</button></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-medium mb-4">Suporte</h4>
                            <ul className="space-y-2 text-sm text-gray-400">
                                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-medium mb-4">Redes Sociais</h4>
                            <div className="flex space-x-4">
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                                    </svg>
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-indigo-600 transition-colors">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
                        <p>&copy; 2023 FlixMax. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </>
      )}

      {/* ADMIN PANEL (Protected in Component) */}
      {showAdmin && (
        <AdminPanel 
          currentSettings={serverConfig}
          currentUI={uiConfig}
          contentData={content} // Pass content for picker
          onSaveServer={handleAdminSaveServer} 
          onSaveUI={handleAdminSaveUI}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* USER PIN MODAL */}
      {showPinModal && (
        <UserPinModal
            onClose={() => {
                if (!isPinMandatory) setShowPinModal(false);
            }}
            onUpdate={(newPin) => {
                setUserPin(newPin);
                if (newPin) setIsPinMandatory(false);
            }}
            isMandatory={isPinMandatory}
        />
      )}

      {/* PIN PROMPT (For accessing Adult Content) */}
      {pinPrompt && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-fade-in px-4">
              <div className="bg-gray-800 p-8 rounded-xl max-w-sm w-full border border-gray-700 shadow-2xl">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                      </div>
                      <h3 className="text-xl font-bold text-white">Conteúdo Bloqueado</h3>
                      <p className="text-gray-400 text-sm mt-2">Digite o PIN para liberar: <span className="text-white font-bold block mt-1">{pinPrompt.targetName}</span></p>
                  </div>
                  <input 
                      type="password" 
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-3xl tracking-[1em] bg-gray-900 border border-gray-600 rounded-lg py-4 mb-6 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                      placeholder="••••"
                  />
                  <div className="flex gap-4">
                      <button onClick={() => setPinPrompt(null)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium">Cancelar</button>
                      <button onClick={handlePinSubmit} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold">Acessar</button>
                  </div>
              </div>
          </div>
      )}

      {/* Details & Player */}
      {selectedContent && (
          <DetailsModal 
            item={selectedContent.item} 
            type={selectedContent.type} 
            allContent={filteredContent.series}
            settings={serverConfig}
            onPlay={startPlayback}
            onClose={() => setSelectedContent(null)}
            profileId={currentProfile?.id}
          />
      )}

      {playerConfig && currentProfile && (
        <VideoPlayer 
          source={playerConfig.url} 
          title={playerConfig.title}
          subtitle={playerConfig.description}
          startFrom={playerConfig.resumeTime}
          id={playerConfig.id}
          mediaType={playerConfig.type}
          originalItem={playerConfig.originalItem}
          nextItem={playerConfig.nextItem}
          onNext={handleNextEpisode}
          onClose={() => setPlayerConfig(null)}
          profileId={currentProfile.id}
          adUrl={uiConfig?.ads?.enabled ? uiConfig.ads.prerollUrl : undefined}
        />
      )}
    </>
  );
};

export default App;
