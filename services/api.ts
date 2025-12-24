
import { IServerConfig } from "../types";

// Helper to construct the API Base URL
const getApiBase = (settings: IServerConfig) => {
  const url = settings.serverUrl.replace(/\/$/, "");
  return `${url}/player_api.php?username=${settings.username}&password=${settings.password}`;
};

// List of fallback proxies to try if the primary fails
const FALLBACK_PROXIES = [
    (target: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    (target: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(target)}`,
    (target: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`
];

// Helper to parse response safely
async function parseResponse(res: Response) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch(e) {
        // Xtream codes sometimes returns empty body on failure, or HTML error pages
        if (text.trim().startsWith('<') || text.trim().length === 0) {
            throw new Error("Invalid JSON response (Server returned HTML or empty)");
        }
        return text; 
    }
}

// Modified fetchData with Multi-Proxy Rotation
const fetchData = async (actionUrl: string, settings: IServerConfig) => {
    
    // 1. Direct Connection (If Proxy is DISABLED)
    if (!settings.useApiProxy) {
        try {
            const res = await fetch(actionUrl, {
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await parseResponse(res);
        } catch (e: any) {
            console.warn(`Direct fetch failed: ${e.message}. Enable API Proxy in settings if this is a CORS issue.`);
            throw new Error("Falha na conexão direta. Ative o 'Proxy da API' no painel Admin.");
        }
    }

    // 2. Primary Proxy (User Configured or Default corsproxy.io)
    let primaryUrl = '';
    const userProxy = settings.apiProxyUrl && settings.apiProxyUrl.trim() !== '' 
        ? settings.apiProxyUrl 
        : 'https://corsproxy.io/?';

    if (userProxy.includes('corsproxy.io') && !userProxy.includes('?')) {
        primaryUrl = `${userProxy}?${encodeURIComponent(actionUrl)}`;
    } else if (userProxy.endsWith('=') || userProxy.endsWith('?')) {
        primaryUrl = `${userProxy}${encodeURIComponent(actionUrl)}`;
    } else {
        primaryUrl = `${userProxy}${encodeURIComponent(actionUrl)}`;
    }

    // Try Primary Proxy
    try {
        const res = await fetch(primaryUrl);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return await parseResponse(res);
    } catch (e) {
        console.warn("Primary proxy failed, attempting rotation...", e);
    }

    // 3. Fallback Rotation (Try others if primary fails)
    for (const buildProxy of FALLBACK_PROXIES) {
        try {
            const fallbackUrl = buildProxy(actionUrl);
            // console.log("Trying fallback:", fallbackUrl);
            const res = await fetch(fallbackUrl);
            if (res.ok) {
                return await parseResponse(res);
            }
        } catch (e) {
            continue; // Try next proxy
        }
    }

    throw new Error("Falha ao carregar dados. Todos os proxies falharam. Verifique se o servidor IPTV está online.");
};

export const fetchAllData = async (settings: IServerConfig) => {
  const base = getApiBase(settings);

  try {
    const [live, vod, series, liveCats, vodCats, seriesCats] = await Promise.all([
      fetchData(`${base}&action=get_live_streams`, settings),
      fetchData(`${base}&action=get_vod_streams`, settings),
      fetchData(`${base}&action=get_series`, settings),
      fetchData(`${base}&action=get_live_categories`, settings),
      fetchData(`${base}&action=get_vod_categories`, settings),
      fetchData(`${base}&action=get_series_categories`, settings),
    ]);

    // Validate Authentication
    if (live && live.user_info && live.user_info.auth === 0) {
       throw new Error("Autenticação falhou. Verifique usuário e senha.");
    }
    
    // Ensure we always return arrays, even if API fails partially
    const processContent = (items: any[], categories: any[]) => {
        const safeItems = Array.isArray(items) ? items : [];
        const safeCats = Array.isArray(categories) ? categories : [];
        return { items: safeItems, cats: safeCats };
    };

    const liveData = processContent(live, liveCats);
    const vodData = processContent(vod, vodCats);
    const seriesData = processContent(series, seriesCats);

    return {
      liveStreams: liveData.items,
      vodStreams: vodData.items,
      series: seriesData.items,
      liveCategories: liveData.cats,
      vodCategories: vodData.cats,
      seriesCategories: seriesData.cats,
    };
  } catch (err: any) {
    console.error("API Fetch Error Details:", err);
    throw new Error(err.message || "Erro ao carregar dados do servidor.");
  }
};

export const fetchSeriesInfo = async (settings: IServerConfig, seriesId: number) => {
    const base = getApiBase(settings);
    try {
        const data = await fetchData(`${base}&action=get_series_info&series_id=${seriesId}`, settings);
        return data;
    } catch (e) {
        console.error("Failed to fetch series info", e);
        return null;
    }
}

export const fetchVodInfo = async (settings: IServerConfig, vodId: number) => {
    const base = getApiBase(settings);
    try {
        const data = await fetchData(`${base}&action=get_vod_info&vod_id=${vodId}`, settings);
        return data;
    } catch (e) {
        console.error("Failed to fetch vod info", e);
        return null;
    }
}

export const getStreamUrl = (
  settings: IServerConfig,
  type: "live" | "movie" | "series",
  id: string | number,
  extension: string = "mp4" 
) => {
    const url = settings.serverUrl.replace(/\/$/, "");
    let finalUrl = '';

    if (type === "live") {
        finalUrl = `${url}/live/${settings.username}/${settings.password}/${id}.m3u8`;
    } else if (type === "movie") {
        finalUrl = `${url}/movie/${settings.username}/${settings.password}/${id}.${extension}`;
    } else {
        finalUrl = `${url}/series/${settings.username}/${settings.password}/${id}.${extension}`;
    }

    // 1. User configured Proxy for STREAM (Player) - Explicit Override
    if (settings.proxyUrl && settings.proxyUrl.trim() !== '') {
        return `${settings.proxyUrl}${encodeURIComponent(finalUrl)}`;
    }

    // REMOVED: Automatic https fallback. 
    // The player component will handle the retry logic if direct connection fails.
    
    return finalUrl;
};
