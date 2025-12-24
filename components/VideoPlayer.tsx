
import React, { useEffect, useRef, useState } from 'react';
import { saveWatchProgress } from '../services/storage';
import { MediaType } from '../types';

declare global {
  interface Window {
    Hls: any;
  }
}

interface VideoPlayerProps {
  source: string;
  poster?: string;
  startFrom?: number;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  id?: string | number;
  mediaType?: MediaType;
  originalItem?: any; 
  nextItem?: {
      id: string | number;
      title: string;
      url: string;
  } | null;
  onNext?: () => void;
  profileId: string;
  adUrl?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
    source, poster, startFrom = 0, onClose, title, subtitle,
    id, mediaType, originalItem, nextItem, onNext, profileId, adUrl
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  // Refs for tracking callback data
  const originalItemRef = useRef(originalItem);
  const idRef = useRef(id);
  const mediaTypeRef = useRef(mediaType);
  const titleRef = useRef(title);
  const posterRef = useRef(poster);
  const profileIdRef = useRef(profileId);

  // State
  const [currentSrc, setCurrentSrc] = useState(source);
  const [isUsingProxy, setIsUsingProxy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Ad State
  const [isPlayingAd, setIsPlayingAd] = useState(!!adUrl);
  const [adTimer, setAdTimer] = useState(5);
  const [canSkipAd, setCanSkipAd] = useState(false);

  // Update refs on prop change
  useEffect(() => {
    originalItemRef.current = originalItem;
    idRef.current = id;
    mediaTypeRef.current = mediaType;
    titleRef.current = title;
    posterRef.current = poster;
    profileIdRef.current = profileId;
  }, [originalItem, id, mediaType, title, poster, profileId]);

  // Reset player state when source/ID changes (e.g. Next Episode)
  useEffect(() => {
      setCurrentSrc(source);
      setIsUsingProxy(false);
      setRetryCount(0);
      setError(null);
      setShowNextButton(false);
      // Reset Ad state if configured
      if (adUrl) {
          setIsPlayingAd(true);
          setAdTimer(5);
          setCanSkipAd(false);
      }
  }, [source, id, adUrl]);

  // AD Logic
  useEffect(() => {
      let interval: any;
      if (adUrl && isPlayingAd && adVideoRef.current) {
          // Handled by video tag events
      } else if (isPlayingAd) {
          if (adTimer > 0) {
              interval = setInterval(() => {
                  setAdTimer((prev) => prev - 1);
              }, 1000);
          } else if (adTimer === 0) {
              setCanSkipAd(true);
          }
      }
      return () => clearInterval(interval);
  }, [isPlayingAd, adTimer, adUrl]);

  const handleSkipAd = () => {
      setIsPlayingAd(false);
  };

  const handleRetry = (errMsg: string) => {
       console.warn("Video Error:", errMsg);
        
        // Avoid infinite loops
        if (retryCount >= 2) {
             setError(`Erro fatal: ${errMsg}`);
             return;
        }

        // If direct link failed and we haven't tried proxy yet
        if (!isUsingProxy) {
            console.log("Direct link failed. Switching to CORS Proxy...");
            // Use corsproxy.io as primary fallback
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(source)}`;
            setIsUsingProxy(true);
            setCurrentSrc(proxyUrl);
            setRetryCount(prev => prev + 1);
        } else {
            // Try secondary fallback (AllOrigins)
            if (retryCount === 1) {
                 console.log("Primary proxy failed. Switching to AllOrigins...");
                 const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source)}`;
                 setCurrentSrc(fallbackUrl);
                 setRetryCount(prev => prev + 1);
            } else {
                setError("Todas as tentativas de conexão falharam.");
            }
        }
  };

  // --- NATIVE PLAYER INITIALIZATION ---
  useEffect(() => {
    if (isPlayingAd) return;
    
    // Clean up previous HLS instance
    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    const video = videoRef.current;
    if (!video) return;

    setError(null);
    video.src = ""; // Clear
    
    const isHls = currentSrc.includes('.m3u8') || mediaType === 'live';

    if (isHls && window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hls.loadSource(currentSrc);
        hls.attachMedia(video);
        
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            if (startFrom > 0) video.currentTime = startFrom;
            video.play().catch(e => console.log("Autoplay blocked (HLS)", e));
        });

        hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
                switch (data.type) {
                case window.Hls.ErrorTypes.NETWORK_ERROR:
                    console.log("fatal network error encountered, trying to recover");
                    hls.startLoad();
                    handleRetry("Erro de rede (HLS)");
                    break;
                case window.Hls.ErrorTypes.MEDIA_ERROR:
                    console.log("fatal media error encountered, trying to recover");
                    hls.recoverMediaError();
                    break;
                default:
                    handleRetry(`Erro fatal HLS: ${data.details}`);
                    break;
                }
            }
        });
        
        hlsRef.current = hls;

    } else {
        // Native HLS (Safari) or standard MP4/MKV
        video.src = currentSrc;
        video.addEventListener('loadedmetadata', () => {
             if (startFrom > 0) video.currentTime = startFrom;
             video.play().catch(e => console.log("Autoplay blocked (Native)", e));
        });
        
        // Native Error Handling
        const onNativeError = (e: any) => {
             const code = video.error?.code;
             const msg = video.error?.message || "Erro desconhecido";
             handleRetry(`Erro Nativo: ${code} - ${msg}`);
        };
        
        video.addEventListener('error', onNativeError);
        
        return () => {
            video.removeEventListener('error', onNativeError);
        }
    }

    return () => {
        if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [currentSrc, isPlayingAd, retryCount]);

  // --- TIME UPDATE (HISTORY & NEXT BTN) ---
  const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;

        const currentTime = video.currentTime;
        const duration = video.duration;
        const remaining = duration - currentTime;

        // Next button logic
        if (nextItem && onNext && remaining <= 60 && remaining > 0) {
            setShowNextButton(true);
        } else {
            setShowNextButton(false);
        }

        // Save Progress every 5s
        if (currentTime > 5 && idRef.current && profileIdRef.current) {
             const originalVal = originalItemRef.current || {};
             
             // Ensure data is simple JSON for Firestore
             const safeStreamData = {
                 stream_id: String(originalVal.stream_id || originalVal.id || idRef.current),
                 name: String(originalVal.name || titleRef.current || "Unknown"),
                 stream_icon: String(originalVal.stream_icon || originalVal.cover || posterRef.current || ""),
                 cover: String(originalVal.cover || originalVal.stream_icon || ""),
                 backdrop_path: Array.isArray(originalVal.backdrop_path) ? originalVal.backdrop_path : [],
                 container_extension: String(originalVal.container_extension || "mp4"),
                 category_id: String(originalVal.category_id || ""),
                 rating_5based: originalVal.rating_5based || 0,
                 series_id: originalVal.series_id || null,
                 stream_type: mediaTypeRef.current
             };

             // Debounce logic is implicit here as this runs on every frame/second
             // But we only want to write occasionally. 
             // Ideally we check if Math.floor(currentTime) % 5 === 0
             if (Math.floor(currentTime) % 10 === 0) {
                 saveWatchProgress({
                     id: String(idRef.current),
                     type: mediaTypeRef.current || 'movie',
                     title: String(titleRef.current || originalVal.name),
                     icon: String(posterRef.current || originalVal.stream_icon),
                     progress: currentTime,
                     duration: duration || 0,
                     lastWatched: Date.now(),
                     streamData: safeStreamData
                 }, profileIdRef.current);
             }
        }
  };

  const handleEnded = () => {
      setShowNextButton(true);
      if (nextItem && onNext) {
          // Optional: Auto-play next after delay?
          // For now, just show the button clearly
      }
  };

  return (
    <div 
        id="videoModal" 
        className="fixed inset-0 bg-black z-[100] flex flex-col animate-fade-in"
    >
        {/* Header Overlay - Always visible on top (z-20) over Native Player */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-center pointer-events-none">
             <div className="flex items-center pointer-events-auto">
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
            {isUsingProxy && <div className="text-[10px] bg-yellow-600 px-2 rounded text-black font-bold pointer-events-auto">PROXY {retryCount}</div>}
        </div>

        {/* --- AD PRE-ROLL --- */}
        {isPlayingAd && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
                <div className="w-full max-w-4xl aspect-video bg-[#111] relative border border-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {adUrl ? (
                        <video 
                            ref={adVideoRef}
                            src={adUrl} 
                            className="w-full h-full object-cover" 
                            autoPlay 
                            playsInline 
                            onTimeUpdate={(e: any) => {
                                const left = Math.ceil(5 - e.target.currentTime);
                                if (left > 0) setAdTimer(left);
                                else { setAdTimer(0); setCanSkipAd(true); }
                            }}
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
                            <button onClick={handleSkipAd} className="bg-white text-black px-6 py-3 rounded font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                                Pular Anúncio
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

        {/* --- NATIVE VIDEO PLAYER --- */}
        <div className="flex-grow relative bg-black w-full h-full flex items-center justify-center">
            {!isPlayingAd && (
                <video 
                    ref={videoRef}
                    className="w-full h-full"
                    controls
                    playsInline
                    poster={poster}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    style={{ maxHeight: '100vh', maxWidth: '100vw' }}
                />
            )}

            {error && !isPlayingAd && (
                 <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
                     <div className="max-w-md text-center">
                         <div className="w-16 h-16 mx-auto bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                         </div>
                         <h3 className="text-xl font-bold text-white mb-2">Erro de Reprodução</h3>
                         <p className="text-gray-300 mb-6">{error}</p>
                         <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Fechar Player</button>
                     </div>
                 </div>
            )}

            {!isPlayingAd && showNextButton && nextItem && onNext && !error && (
                <div className="absolute bottom-20 right-8 z-[30] animate-fade-in pointer-events-auto">
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

export default VideoPlayer;
