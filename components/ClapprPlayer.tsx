
import React, { useEffect, useRef, useState } from 'react';
import { saveWatchProgress } from '../services/storage';
import { MediaType } from '../types';

declare global {
  interface Window {
    Clappr: any;
    HlsjsPlayback: any;
  }
}

interface ClapprPlayerProps {
  source: string;
  poster?: string;
  startFrom?: number;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  // New props for history
  id?: string | number;
  mediaType?: MediaType;
  originalItem?: any; 
  // For Series next episode
  nextItem?: {
      id: string | number;
      title: string;
      url: string;
  } | null;
  onNext?: () => void;
  profileId: string;
  adUrl?: string; // Custom Ad URL
}

const ClapprPlayer: React.FC<ClapprPlayerProps> = ({ 
    source, poster, startFrom = 0, onClose, title, subtitle,
    id, mediaType, originalItem, nextItem, onNext, profileId, adUrl
}) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<any>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  
  // Refs for callback data
  const originalItemRef = useRef(originalItem);
  const idRef = useRef(id);
  const mediaTypeRef = useRef(mediaType);
  const titleRef = useRef(title);
  const posterRef = useRef(poster);
  const nextItemRef = useRef(nextItem);
  const onNextRef = useRef(onNext);
  const profileIdRef = useRef(profileId);

  // --- ERROR STATE ---
  const [error, setError] = useState<string | null>(null);

  // --- AD STATE ---
  const [isPlayingAd, setIsPlayingAd] = useState(true);
  const [adTimer, setAdTimer] = useState(5);
  const [canSkipAd, setCanSkipAd] = useState(false);

  useEffect(() => {
    originalItemRef.current = originalItem;
    idRef.current = id;
    mediaTypeRef.current = mediaType;
    titleRef.current = title;
    posterRef.current = poster;
    nextItemRef.current = nextItem;
    onNextRef.current = onNext;
    profileIdRef.current = profileId;
  }, [originalItem, id, mediaType, title, poster, nextItem, onNext, profileId]);
  
  const [showControls, setShowControls] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- AD LOGIC ---
  useEffect(() => {
      let interval: any;
      if (adUrl && adVideoRef.current) {
          // Logic handled by onTimeUpdate in video tag
      } else {
          if (isPlayingAd && adTimer > 0) {
              interval = setInterval(() => {
                  setAdTimer((prev) => prev - 1);
              }, 1000);
          } else if (adTimer === 0) {
              setCanSkipAd(true);
          }
      }
      return () => clearInterval(interval);
  }, [isPlayingAd, adTimer, adUrl]);

  const handleAdTimeUpdate = (e: any) => {
      const vid = e.target;
      const left = Math.ceil(5 - vid.currentTime);
      if (left > 0) setAdTimer(left);
      else {
          setAdTimer(0);
          setCanSkipAd(true);
      }
  };

  const handleSkipAd = () => {
      setIsPlayingAd(false);
  };

  const customStyles = `
    .media-control-center-panel .play-wrapper .play-button svg path { fill: #8b5cf6 !important; }
    .media-control-layer .bar-background .bar-fill-1 { background-color: #8b5cf6 !important; }
    .media-control-layer .bar-background .bar-fill-2 { background-color: #6366f1 !important; }
    .media-control-layer .bar-scrubber .bar-scrubber-icon { border-color: #8b5cf6 !important; background-color: #fff !important; }
    .volume-bar .bar-fill-1 { background-color: #8b5cf6 !important; }
    .spinner-three-bounce > div { background-color: #8b5cf6 !important; }
    .player-poster[data-poster] .poster-background-container { background-color: #000; }
  `;

  const handleActivity = () => {
    if (!showControls) setShowControls(true);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (playerInstanceRef.current && playerInstanceRef.current.isPlaying()) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.id = 'clappr-custom-style';
    styleTag.textContent = customStyles;
    document.head.appendChild(styleTag);
    return () => {
        const existingStyle = document.getElementById('clappr-custom-style');
        if (existingStyle) existingStyle.remove();
    }
  }, []);

  useEffect(() => {
    if (isPlayingAd) return;

    setError(null);
    handleActivity();

    const loadPlayer = () => {
      if (!window.Clappr || !playerRef.current) return;

      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
        playerRef.current.innerHTML = "";
      }

      const isHls = mediaType === 'live' || source.includes('.m3u8') || source.includes('corsproxy');

      const plugins = [];
      if (window.HlsjsPlayback) plugins.push(window.HlsjsPlayback);

      const player = new window.Clappr.Player({
        source: source,
        mimeType: isHls ? 'application/x-mpegURL' : undefined,
        parentId: `#${playerRef.current.id}`,
        width: "100%",
        height: "100%",
        autoPlay: true,
        poster: poster,
        plugins: plugins,
        mediacontrol: { seekbar: "#8b5cf6", buttons: "#ffffff" },
        disableVideoTagContextMenu: true,
        playback: {
            playInline: true,
            recycleVideo: true,
            hlsjsConfig: {
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                enableWorker: true,
                liveSyncDurationCount: 3,
                manifestLoadingTimeOut: 20000,
                manifestLoadingMaxRetry: 6,
                manifestLoadingRetryDelay: 500,
                levelLoadingTimeOut: 20000,
                levelLoadingMaxRetry: 6,
                fragLoadingTimeOut: 30000,
                fragLoadingMaxRetry: 6,
                xhrSetup: function(xhr: any, url: string) {
                    xhr.withCredentials = false;
                }
            }
        },
        events: {
            onPlay: () => {
                handleActivity();
                setError(null);
            },
            onPause: () => setShowControls(true),
            onError: (e: any) => {
                // Safe logging for error objects to avoid [object Object]
                try {
                    console.error("Clappr Error Debug:", JSON.stringify(e, (key, value) => {
                        if (key === 'player' || key === 'core' || key === 'container') return '[Circular]';
                        return value;
                    }, 2));
                } catch (err) {
                    console.error("Clappr Error (Unparseable):", e);
                }

                let msg = "Falha na reprodução.";
                
                if (typeof e === 'object') {
                    if (e.code && e.description) msg = `${e.code}: ${e.description}`;
                    else if (e.raw && e.raw.details) msg = `HLS: ${e.raw.details}`;
                    else if (e.type) msg = `Erro: ${e.type}`;
                    // Fallback for generic objects
                    else if (Object.keys(e).length > 0) msg = "Erro desconhecido do player.";
                }

                if (window.location.protocol === 'https:' && source.startsWith('http:')) {
                    msg = "Bloqueio de Segurança: O navegador bloqueou o vídeo (HTTP). Tente recarregar ou usar um proxy.";
                }

                setError(msg);
                setShowControls(true);
            }
        }
      });

      playerInstanceRef.current = player;

      player.on(window.Clappr.Events.PLAYER_READY, function () {
        if (startFrom > 0) player.seek(startFrom);
      });

      player.on(window.Clappr.Events.PLAYER_TIMEUPDATE, function (time: any) {
        const currentTime = time.current;
        const totalTime = time.total;
        const remaining = totalTime - currentTime;

        const nextItemVal = nextItemRef.current;
        const onNextVal = onNextRef.current;
        
        if (nextItemVal && onNextVal && remaining <= 60 && remaining > 0) {
            setShowNextButton(true);
        } else {
            setShowNextButton(false);
        }

        const idVal = idRef.current;
        const mediaTypeVal = mediaTypeRef.current;
        const originalItemVal = originalItemRef.current;
        const titleVal = titleRef.current;
        const posterVal = posterRef.current;
        const pId = profileIdRef.current;

        // Save progress every 5 seconds, avoiding circular references
        if (idVal && mediaTypeVal && originalItemVal && currentTime > 5 && pId) {
             
             // STRICTLY construct a clean object to avoid 'circular structure' errors
             // Do NOT pass originalItemVal directly as it might contain Player/Loader references from Clappr events
             const safeStreamData = {
                 stream_id: String(originalItemVal.stream_id || originalItemVal.id || idVal),
                 name: String(originalItemVal.name || titleVal || "Unknown"),
                 stream_icon: String(originalItemVal.stream_icon || originalItemVal.cover || posterVal || ""),
                 cover: String(originalItemVal.cover || originalItemVal.stream_icon || ""),
                 backdrop_path: Array.isArray(originalItemVal.backdrop_path) ? originalItemVal.backdrop_path : [],
                 container_extension: String(originalItemVal.container_extension || "mp4"),
                 category_id: String(originalItemVal.category_id || ""),
                 rating_5based: originalItemVal.rating_5based || 0,
                 series_id: originalItemVal.series_id || null,
                 stream_type: mediaTypeVal
             };

             saveWatchProgress({
                 id: String(idVal),
                 type: mediaTypeVal,
                 title: String(titleVal || originalItemVal.name),
                 icon: String(posterVal || originalItemVal.stream_icon || originalItemVal.cover),
                 progress: currentTime,
                 duration: totalTime,
                 lastWatched: Date.now(),
                 streamData: safeStreamData
             }, pId);
        }
      });
      
      player.on(window.Clappr.Events.PLAYER_ENDED, function() {
          setShowControls(true);
          setShowNextButton(true);
      });
    };

    const timer = setTimeout(loadPlayer, 100);

    return () => {
      clearTimeout(timer);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
      }
    };
  }, [source, startFrom, isPlayingAd]);

  return (
    <div 
        id="videoModal" 
        className={`fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in ${showControls ? 'cursor-auto' : 'cursor-none'}`}
        onMouseMove={handleActivity}
        onClick={handleActivity}
        onTouchStart={handleActivity}
        onKeyDown={handleActivity}
    >
        {/* Top Overlay Bar */}
        <div 
            className={`absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-center transition-opacity duration-500 ease-in-out ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <div className="flex items-center">
                <button 
                    onClick={onClose} 
                    className="mr-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h3 className="text-white font-bold text-lg drop-shadow-md">{title}</h3>
                    {subtitle && <p className="text-gray-300 text-sm drop-shadow-md">{subtitle}</p>}
                </div>
            </div>
            <div>
               <div className="text-indigo-500 font-bold tracking-widest text-sm opacity-50">FLIXMAX</div>
            </div>
        </div>

        {/* --- AD PRE-ROLL OVERLAY --- */}
        {isPlayingAd && (
            <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl aspect-video bg-[#111] relative border border-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    
                    {adUrl ? (
                        <video 
                            ref={adVideoRef}
                            src={adUrl} 
                            className="w-full h-full object-cover" 
                            autoPlay 
                            playsInline 
                            onTimeUpdate={handleAdTimeUpdate}
                            onEnded={() => setCanSkipAd(true)}
                        />
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-500 font-bold text-2xl uppercase tracking-widest mb-2">Publicidade</p>
                            <p className="text-gray-600 text-sm">O vídeo começará em instantes...</p>
                        </div>
                    )}
                    
                    <div className="absolute bottom-8 right-8">
                        {canSkipAd ? (
                            <button 
                                onClick={handleSkipAd}
                                className="bg-white text-black px-6 py-3 rounded font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                            >
                                Pular Anúncio
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        ) : (
                            <div className="bg-black/50 text-white px-4 py-2 rounded text-sm backdrop-blur-sm border border-white/20">
                                O vídeo começa em {adTimer}s
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Player Container */}
        <div className="flex-grow relative bg-black">
            {!isPlayingAd && (
                <div id="videoPlayer" ref={playerRef} className="w-full h-full absolute inset-0"></div>
            )}
            
            {/* Error Overlay */}
            {error && !isPlayingAd && (
                 <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
                     <div className="max-w-md text-center">
                         <div className="w-16 h-16 mx-auto bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                         </div>
                         <h3 className="text-xl font-bold text-white mb-2">Não foi possível reproduzir</h3>
                         <p className="text-gray-300 mb-6">{error}</p>
                         <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Fechar Player</button>
                     </div>
                 </div>
            )}
            
            {!isPlayingAd && showNextButton && nextItem && onNext && !error && (
                <div className="absolute bottom-20 right-8 z-[60] animate-fade-in">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onNext(); }} 
                        className="bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-xl font-bold shadow-2xl hover:scale-105 transition-all flex items-center gap-3 group"
                    >
                        <div className="text-left">
                            <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Próximo Episódio</span>
                            <span className="block text-sm max-w-[200px] truncate">{nextItem.title}</span>
                        </div>
                        <div className="bg-black text-white p-2 rounded-full group-hover:bg-indigo-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default ClapprPlayer;
