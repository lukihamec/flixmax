
import React, { useEffect, useState } from 'react';
import { MediaType, IServerConfig } from '../types';
import { fetchSeriesInfo, fetchVodInfo } from '../services/api';
import { toggleFavorite, isFavorite } from '../services/storage';

interface DetailsModalProps {
  item: any;
  type: MediaType;
  allContent: any[]; // To find recommendations
  settings: IServerConfig | null;
  onPlay: (item: any, type: MediaType, urlOverride?: string, context?: any) => void;
  onClose: () => void;
  profileId?: string; // Add profileId prop
}

const DetailsModal: React.FC<DetailsModalProps> = ({ item, type, allContent, settings, onPlay, onClose, profileId }) => {
  // 'details' holds the merged data (basic item + fetched info)
  const [details, setDetails] = useState<any>(item);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<any>({}); // Store all seasons data here
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState("1");
  const [seasons, setSeasons] = useState<string[]>([]);
  
  // Favorites State
  const [isFav, setIsFav] = useState(false);
  
  useEffect(() => {
      // Check if favorite on mount (ASYNC)
      const checkFav = async () => {
          if (!profileId) return;
          const id = item.stream_id || item.series_id;
          const status = await isFavorite(id, type, profileId);
          setIsFav(status);
      };
      checkFav();
  }, [item, type, profileId]);

  const handleToggleFavorite = async () => {
      if (!profileId) return;
      // Optimistic update
      const prev = isFav;
      setIsFav(!prev);
      
      const added = await toggleFavorite(details, type, profileId);
      setIsFav(added);
  };
  
  // Find recommendations based on category_id
  const recommendations = allContent
    .filter(c => c.category_id === item.category_id && c.stream_id !== item.stream_id && c.series_id !== item.series_id)
    .slice(0, 5);

  useEffect(() => {
    let isMounted = true;

    const loadFullDetails = async () => {
        if (!settings) return;

        if (type === 'series') {
            setLoadingEpisodes(true);
            const data = await fetchSeriesInfo(settings, item.series_id);
            if (isMounted && data) {
                // XTream returns 'info' object with rich details
                if (data.info) {
                    setDetails((prev: any) => ({ ...prev, ...data.info }));
                }
                
                if (data.episodes) {
                    // Store all episodes in state to avoid re-fetching
                    setAllEpisodes(data.episodes);
                    
                    const seasonKeys = Object.keys(data.episodes);
                    // Sort seasons numerically (1, 2, 10) instead of alphabetically (1, 10, 2)
                    seasonKeys.sort((a, b) => parseInt(a) - parseInt(b));
                    
                    setSeasons(seasonKeys);
                    
                    if (seasonKeys.length > 0) {
                        // Select the first available season
                        const firstSeason = seasonKeys[0];
                        setSelectedSeason(firstSeason);
                        setEpisodes(data.episodes[firstSeason] || []);
                    }
                }
            }
            if (isMounted) setLoadingEpisodes(false);
        } else if (type === 'movie') {
            // Fetch rich info for movies
            const data = await fetchVodInfo(settings, item.stream_id);
            if (isMounted && data && data.info) {
                setDetails((prev: any) => ({ ...prev, ...data.info }));
            }
        }
    };

    loadFullDetails();

    return () => { isMounted = false; };
  }, [item, type, settings]);

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value;
    setSelectedSeason(s);
    
    // Retrieve from local state instead of fetching
    if (allEpisodes[s]) {
        setEpisodes(allEpisodes[s]);
    } else {
        setEpisodes([]);
    }
  }

  const handlePlayClick = () => {
    if (type === 'series') {
        if (episodes.length > 0) {
            const firstEp = episodes[0];
            onPlay({
                ...details, 
                name: `${details.name} - S${selectedSeason}E${firstEp.episode_num}`,
                stream_id: firstEp.id, 
                container_extension: firstEp.container_extension
            }, 'series', undefined, { seasonEpisodes: episodes, episodeIndex: 0, seasonName: selectedSeason });
        }
    } else {
        onPlay(details, type);
    }
  };

  const backdrop = details.backdrop_path ? details.backdrop_path[0] : (details.movie_image || details.stream_icon || details.cover);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 md:bg-black/80 backdrop-blur-sm animate-fade-in flex items-center justify-center">
      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-xl overflow-y-auto bg-[#181818] shadow-2xl flex flex-col md:block">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-30 bg-black/50 p-2 rounded-full text-white hover:bg-white/20 transition-all"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        {/* Hero / Backdrop */}
        <div className="relative h-[40vh] md:h-[400px] w-full flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/50 to-transparent z-10"></div>
            <img 
                src={backdrop || "https://picsum.photos/800/400"} 
                className="w-full h-full object-cover" 
                alt={details.name}
            />
            <div className="absolute bottom-0 left-0 p-4 md:p-8 z-20 w-full">
                <h2 className="text-2xl md:text-5xl font-bold text-white mb-2 md:mb-4 drop-shadow-lg line-clamp-2">{details.name}</h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2 md:mb-6">
                    <button 
                        onClick={handlePlayClick}
                        className="bg-white text-black px-4 py-2 md:px-8 md:py-3 rounded-md font-bold text-sm md:text-lg flex items-center hover:bg-gray-200 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        {type === 'series' ? 'Assistir Temp. ' + selectedSeason : 'Assistir'}
                    </button>

                    {/* Favorites Button */}
                    <button 
                        onClick={handleToggleFavorite}
                        className={`p-2 md:p-3 rounded-full border border-gray-500 transition-all ${isFav ? 'bg-pink-600 border-pink-600 text-white' : 'text-white hover:bg-white/10'}`}
                        title={isFav ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill={isFav ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                    
                    {details.rating_5based && (
                         <span className="text-green-400 font-bold border border-green-400 px-2 py-1 rounded text-xs md:text-sm">
                             {details.rating_5based} / 5
                         </span>
                    )}
                </div>
            </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 overflow-y-auto">
            <div className="md:col-span-2 space-y-4 md:space-y-6">
                <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-400">
                    <span>{details.releaseDate || details.releasedate || "N/A"}</span>
                    {type === 'series' && <span>{seasons.length} Temporadas</span>}
                    <span className="border border-gray-600 px-1 rounded uppercase">{details.stream_type || type}</span>
                </div>
                
                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                    {details.plot || details.description || "Carregando sinopse..."}
                </p>

                {/* Series Episodes List */}
                {type === 'series' && (
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg md:text-xl font-bold">Episódios</h3>
                            <select 
                                value={selectedSeason}
                                onChange={handleSeasonChange}
                                className="bg-gray-800 border border-gray-700 text-white rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 max-w-[120px]"
                            >
                                {seasons.map(s => <option key={s} value={s}>Temp {s}</option>)}
                            </select>
                        </div>
                        
                        {loadingEpisodes ? (
                            <div className="text-center py-4 text-gray-500">Carregando episódios...</div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {episodes && episodes.length > 0 ? (
                                    episodes.map((ep: any, idx: number) => (
                                    <div 
                                        key={ep.id} 
                                        onClick={() => onPlay({
                                            ...details, 
                                            name: `${details.name} - S${selectedSeason}E${ep.episode_num} - ${ep.title}`,
                                            stream_id: ep.id, 
                                            container_extension: ep.container_extension
                                        }, 'series', undefined, { seasonEpisodes: episodes, episodeIndex: idx, seasonName: selectedSeason })}
                                        className="flex items-center p-2 md:p-3 hover:bg-gray-800 rounded cursor-pointer transition-colors group"
                                    >
                                        <div className="text-gray-400 w-6 md:w-8 font-bold text-sm">{ep.episode_num}</div>
                                        <div className="h-12 w-20 md:h-16 md:w-28 bg-gray-700 mr-3 md:mr-4 rounded overflow-hidden flex-shrink-0 relative">
                                            {ep.info?.movie_image ? (
                                                <img src={ep.info.movie_image} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-white text-sm md:text-base group-hover:text-indigo-400 transition-colors truncate">{ep.title}</h4>
                                            <p className="text-xs text-gray-500 line-clamp-1">{ep.info?.plot || "..."}</p>
                                        </div>
                                    </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 text-center py-4">Nenhum episódio encontrado para esta temporada.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4 md:space-y-6">
                <div>
                    <span className="text-gray-500 block text-xs md:text-sm">Elenco:</span>
                    <span className="text-gray-300 text-sm">{details.cast || "Carregando..."}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs md:text-sm">Gênero:</span>
                    <span className="text-gray-300 text-sm">{details.genre || "Variados"}</span>
                </div>
                <div>
                    <span className="text-gray-500 block text-xs md:text-sm">Diretor:</span>
                    <span className="text-gray-300 text-sm">{details.director || "N/A"}</span>
                </div>
            </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
            <div className="p-4 md:p-8 border-t border-gray-800 bg-[#141414] flex-shrink-0">
                <h3 className="text-lg md:text-xl font-bold mb-4">Recomendados</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                    {recommendations.map((rec: any) => (
                         <div key={rec.stream_id || rec.series_id} className="cursor-pointer group" onClick={() => { /* Navigation logic handled via parent usually, or needs refetch */ }}>
                            <div className="aspect-[2/3] rounded-lg overflow-hidden relative">
                                <img src={rec.stream_icon || rec.cover} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
                            </div>
                            <p className="mt-2 text-xs md:text-sm text-gray-400 truncate group-hover:text-white">{rec.name}</p>
                         </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DetailsModal;
