
import React, { useState, useMemo, useEffect } from 'react';
import { IServerConfig, IUIConfig, IContentData, MediaType } from '../types';
import { saveServerConfig, saveUIConfig, getAllUsers, updateUserSubscription } from '../services/storage';

interface AdminPanelProps {
  currentSettings: IServerConfig | null;
  currentUI: IUIConfig | null;
  contentData: IContentData; // Need this to select items for Hero
  onSaveServer: (settings: IServerConfig) => void;
  onSaveUI: (ui: IUIConfig) => void;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    currentSettings, currentUI, contentData, onSaveServer, onSaveUI, onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'branding' | 'content' | 'ads' | 'users'>('connection');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- Connection State ---
  const [url, setUrl] = useState(currentSettings?.serverUrl || '');
  const [user, setUser] = useState(currentSettings?.username || '');
  const [pass, setPass] = useState(currentSettings?.password || '');
  
  // Stream Proxy (Player)
  const [proxyUrl, setProxyUrl] = useState(currentSettings?.proxyUrl || '');
  
  // API Proxy (List Loading)
  const [useApiProxy, setUseApiProxy] = useState(currentSettings?.useApiProxy || false);
  const [apiProxyUrl, setApiProxyUrl] = useState(currentSettings?.apiProxyUrl || '');

  // --- Branding State ---
  const [appTitle, setAppTitle] = useState(currentUI?.appTitle || 'FlixMax');
  const [logoUrl, setLogoUrl] = useState(currentUI?.logoUrl || '');

  // --- Content State ---
  const [heroItems, setHeroItems] = useState<any[]>(currentUI?.heroItems || []);
  
  // --- Ads State ---
  const [adsEnabled, setAdsEnabled] = useState(currentUI?.ads?.enabled || false);
  const [adBannerTop, setAdBannerTop] = useState(currentUI?.ads?.bannerTop || '');
  const [adBannerMiddle, setAdBannerMiddle] = useState(currentUI?.ads?.bannerMiddle || '');
  const [adBannerBottom, setAdBannerBottom] = useState(currentUI?.ads?.bannerBottom || '');
  const [adPreroll, setAdPreroll] = useState(currentUI?.ads?.prerollUrl || '');

  // --- Users State ---
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Content Picker Modal State
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerType, setPickerType] = useState<'movie' | 'series'>('movie');

  useEffect(() => {
      if (activeTab === 'users') {
          loadUsers();
      }
  }, [activeTab]);

  const loadUsers = async () => {
      setLoadingUsers(true);
      const data = await getAllUsers();
      // Sort: Pending (0) first, then Expired (small timestamp), then Active (future timestamp)
      const sorted = data.sort((a, b) => {
          const subA = a.settings?.subscription;
          const subB = b.settings?.subscription;
          
          // Treat undefined/null as 0 (Pending)
          const expA = (subA?.expiresAt === undefined || subA?.expiresAt === null) ? 0 : Number(subA.expiresAt);
          const expB = (subB?.expiresAt === undefined || subB?.expiresAt === null) ? 0 : Number(subB.expiresAt);

          return expA - expB; 
      });
      setUsersList(sorted);
      setLoadingUsers(false);
  };

  // --- Handlers ---

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    const settings: IServerConfig = {
      serverUrl: url,
      username: user,
      password: pass,
      proxyUrl: proxyUrl, // Player Proxy
      useApiProxy: useApiProxy, // API Proxy Toggle
      apiProxyUrl: apiProxyUrl, // API Proxy URL
      isConfigured: true
    };
    try {
        await saveServerConfig(settings);
        onSaveServer(settings);
        setSuccessMsg("Conexão salva com sucesso!");
    } catch (e) {
        setError("Erro ao salvar conexão.");
    }
    setIsSaving(false);
  };

  const handleSaveUI = async () => {
      setIsSaving(true);
      setError('');
      const ui: IUIConfig = {
          appTitle,
          logoUrl,
          heroItems,
          ads: {
              enabled: adsEnabled,
              bannerTop: adBannerTop,
              bannerMiddle: adBannerMiddle,
              bannerBottom: adBannerBottom,
              prerollUrl: adPreroll
          }
      };
      try {
          await saveUIConfig(ui);
          onSaveUI(ui);
          setSuccessMsg("Configurações salvas com sucesso!");
      } catch (e) {
          setError("Erro ao salvar configurações.");
      }
      setIsSaving(false);
  };

  const handleUserAction = async (uid: string, action: 'approve' | 'renew' | 'block') => {
      if (!confirm(`Tem certeza que deseja ${action === 'approve' ? 'aprovar' : action === 'renew' ? 'renovar' : 'bloquear'} este usuário?`)) return;
      
      // Optimistic update visual feedback
      setLoadingUsers(true);
      const success = await updateUserSubscription(uid, action);
      
      if (success) {
          await loadUsers(); // Force reload from server to get updated data
          setSuccessMsg(`Usuário ${action === 'block' ? 'bloqueado' : 'atualizado'} com sucesso!`);
      } else {
          setLoadingUsers(false);
          setError("Erro ao atualizar usuário no banco de dados.");
      }
  };

  const addToHero = (item: any, type: MediaType) => {
      // Avoid duplicates
      if (heroItems.some(h => h.id === (item.stream_id || item.series_id))) return;

      const miniItem = {
          id: item.stream_id || item.series_id,
          type: type,
          title: item.name,
          cover: item.stream_icon || item.cover,
          backdrop: item.backdrop_path ? item.backdrop_path[0] : null,
          description: item.plot || item.description || ''
      };
      setHeroItems([...heroItems, miniItem]);
      setShowPicker(false);
  };

  const removeFromHero = (id: string | number) => {
      setHeroItems(heroItems.filter(h => h.id !== id));
  };

  // Filter for the Picker
  const pickerList = useMemo(() => {
      if (!showPicker) return [];
      let list: any[] = [];
      if (pickerType === 'movie') list = contentData.vodStreams;
      else list = contentData.series;

      if (!pickerSearch) return list.slice(0, 20); // Show top 20 if no search
      return list.filter(i => i.name.toLowerCase().includes(pickerSearch.toLowerCase())).slice(0, 20);
  }, [showPicker, pickerType, pickerSearch, contentData]);

  const getUserStatus = (user: any) => {
      if (user.settings?.role === 'admin') return { label: 'ADMIN', color: 'bg-purple-600', textColor: 'text-purple-200' };
      
      const sub = user.settings?.subscription;
      // If subscription or expiresAt is missing, treat as pending
      if (!sub || sub.expiresAt === undefined || sub.expiresAt === 0) {
          return { label: 'PENDENTE', color: 'bg-yellow-600', textColor: 'text-yellow-200' };
      }
      
      if (sub.expiresAt < Date.now()) {
          return { label: 'VENCIDO', color: 'bg-red-600', textColor: 'text-red-200' };
      }
      
      const daysLeft = Math.ceil((sub.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
      return { label: `ATIVO (${daysLeft}d)`, color: 'bg-green-600', textColor: 'text-green-200' };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f0f1a] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="border-b border-gray-800 bg-black/50 backdrop-blur sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Administração do Sistema</h1>
                </div>
                <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
                    Fechar Painel
                </button>
            </div>
        </div>

        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-gray-800/50 rounded-xl p-2 border border-gray-700">
                        <button 
                            onClick={() => setActiveTab('connection')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium mb-1 transition-all ${activeTab === 'connection' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Conexão IPTV
                        </button>
                        <button 
                            onClick={() => setActiveTab('branding')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium mb-1 transition-all ${activeTab === 'branding' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Marca e Logo
                        </button>
                        <button 
                            onClick={() => setActiveTab('content')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium mb-1 transition-all ${activeTab === 'content' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Destaques (Carrossel)
                        </button>
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium mb-1 transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Gerenciar Usuários
                        </button>
                        <button 
                            onClick={() => setActiveTab('ads')}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'ads' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Monetização (Ads)
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {successMsg && (
                        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-200 flex items-center justify-between">
                            <span>{successMsg}</span>
                            <button onClick={() => setSuccessMsg('')}>&times;</button>
                        </div>
                    )}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200">
                            {error}
                        </div>
                    )}

                    {/* TAB: USERS */}
                    {activeTab === 'users' && (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Usuários Cadastrados</h2>
                                <button onClick={loadUsers} className="text-sm text-indigo-400 hover:text-white">Atualizar Lista</button>
                            </div>

                            {loadingUsers ? (
                                <div className="text-center py-10 text-gray-500">Carregando usuários...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-700 text-gray-400 text-sm">
                                                <th className="p-3">Email</th>
                                                <th className="p-3">Status</th>
                                                <th className="p-3">Expiração</th>
                                                <th className="p-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usersList.map(u => {
                                                const status = getUserStatus(u);
                                                const sub = u.settings?.subscription;
                                                const expiresAt = sub?.expiresAt ? Number(sub.expiresAt) : 0;
                                                const isAdminUser = u.settings?.role === 'admin';

                                                const isPending = expiresAt === 0;
                                                const isExpired = expiresAt > 0 && expiresAt < Date.now();
                                                const isActive = expiresAt > Date.now();

                                                return (
                                                    <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                                                        <td className="p-3 font-medium text-white">{u.email}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${status.color} text-white`}>
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-sm text-gray-400">
                                                            {expiresAt === 0 ? '---' : 
                                                             expiresAt > 4000000000000 ? 'Vitalício' : 
                                                             isExpired ? <span className="text-red-400">Vencido em {new Date(expiresAt).toLocaleDateString()}</span> :
                                                             new Date(expiresAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="p-3 text-right space-x-2">
                                                            {!isAdminUser && (
                                                                <>
                                                                    {isPending && (
                                                                        <button 
                                                                            onClick={() => handleUserAction(u.id, 'approve')} 
                                                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded shadow"
                                                                        >
                                                                            Aprovar
                                                                        </button>
                                                                    )}

                                                                    {(isExpired || isActive) && (
                                                                        <button 
                                                                            onClick={() => handleUserAction(u.id, 'renew')} 
                                                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded shadow"
                                                                        >
                                                                            +30 Dias
                                                                        </button>
                                                                    )}

                                                                    {isActive && (
                                                                         <button 
                                                                            onClick={() => handleUserAction(u.id, 'block')} 
                                                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded shadow"
                                                                        >
                                                                            Bloquear
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                            {isAdminUser && <span className="text-xs text-gray-500 italic">Administrador</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: CONNECTION */}
                    {activeTab === 'connection' && (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 animate-fade-in">
                            <h2 className="text-2xl font-bold mb-6">Configuração do Servidor XTream</h2>
                            <form onSubmit={handleSaveConnection} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-400 mb-2">DNS do Servidor</label>
                                        <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://meu-dns.com:80" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Usuário</label>
                                        <input type="text" value={user} onChange={e => setUser(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Senha</label>
                                        <input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" required />
                                    </div>
                                </div>

                                {/* Seção Proxy de API (Conteúdo/Listas) */}
                                <div className="border-t border-gray-700 pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-white">Proxy da API (Carregamento de Listas)</h3>
                                        <label className="flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={useApiProxy} 
                                                onChange={(e) => setUseApiProxy(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 relative"></div>
                                        </label>
                                    </div>
                                    <div className={`space-y-3 transition-opacity ${useApiProxy ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                        <label className="block text-sm font-medium text-gray-400">URL do Proxy de API</label>
                                        <input 
                                            type="text" 
                                            value={apiProxyUrl} 
                                            onChange={e => setApiProxyUrl(e.target.value)} 
                                            placeholder="https://corsproxy.io/? (Padrão)" 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" 
                                        />
                                        <p className="text-xs text-gray-500">
                                            Use isso se o servidor bloquear requisições diretas (CORS). Deixe em branco para usar o padrão <code>corsproxy.io</code>.
                                        </p>
                                    </div>
                                </div>

                                {/* Seção Proxy do Player (Stream) */}
                                <div className="border-t border-gray-700 pt-6">
                                    <h3 className="text-lg font-bold text-white mb-4">Proxy do Player (Reprodução)</h3>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">URL do Proxy Privado para Vídeo</label>
                                    <input 
                                        type="text" 
                                        value={proxyUrl} 
                                        onChange={e => setProxyUrl(e.target.value)} 
                                        placeholder="https://meu-proxy-privado.com/?url=" 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" 
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Use isso para corrigir erros de HTTPS (Mixed Content) ou redirecionar o tráfego de vídeo. O link do vídeo será anexado ao final desta URL.
                                    </p>
                                </div>

                                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-indigo-600 rounded-lg font-bold hover:bg-indigo-700 text-white transition-colors shadow-lg shadow-indigo-500/30">
                                    {isSaving ? 'Salvando...' : 'Salvar Conexão'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB: BRANDING */}
                    {activeTab === 'branding' && (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 animate-fade-in">
                            <h2 className="text-2xl font-bold mb-6">Personalização Visual</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Nome do Aplicativo</label>
                                    <input type="text" value={appTitle} onChange={e => setAppTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">URL do Logo (Imagem)</label>
                                    <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://imgur.com/..." className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                                    <p className="text-xs text-gray-500 mt-2">Recomendado: PNG transparente, altura min 50px.</p>
                                </div>

                                {/* Preview */}
                                <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-700 flex items-center justify-center">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Preview" className="h-16 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                                    ) : (
                                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                                            {appTitle}
                                        </span>
                                    )}
                                </div>

                                <button onClick={handleSaveUI} disabled={isSaving} className="px-6 py-3 bg-purple-600 rounded-lg font-bold hover:bg-purple-700 text-white transition-colors shadow-lg shadow-purple-500/30">
                                    {isSaving ? 'Salvando...' : 'Salvar Aparência'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB: CONTENT / HERO */}
                    {activeTab === 'content' && (
                         <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Destaques da Home (Carrossel)</h2>
                                <button onClick={() => setShowPicker(true)} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-white font-medium flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                    Adicionar Item
                                </button>
                            </div>

                            <div className="grid gap-4">
                                {heroItems.map((item, idx) => (
                                    <div key={item.id} className="flex items-center gap-4 bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                                        <div className="text-gray-500 font-bold w-6">{idx + 1}</div>
                                        <img src={item.cover} className="w-12 h-16 object-cover rounded" />
                                        <div className="flex-1">
                                            <h3 className="font-bold">{item.title}</h3>
                                            <span className="text-xs uppercase bg-gray-700 px-2 py-0.5 rounded text-gray-300">{item.type}</span>
                                        </div>
                                        <button onClick={() => removeFromHero(item.id)} className="text-red-500 hover:text-red-400 p-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                        </button>
                                    </div>
                                ))}
                                {heroItems.length === 0 && (
                                    <div className="text-center py-10 text-gray-500 bg-gray-900/30 rounded-lg border border-dashed border-gray-700">
                                        Nenhum destaque selecionado. O sistema usará os padrões (Mais recentes).
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-4 border-t border-gray-700">
                                 <button onClick={handleSaveUI} disabled={isSaving} className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-bold text-white shadow-lg">
                                    {isSaving ? 'Salvando...' : 'Salvar Destaques'}
                                </button>
                            </div>
                         </div>
                    )}

                    {/* TAB: ADS */}
                    {activeTab === 'ads' && (
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 animate-fade-in">
                            <h2 className="text-2xl font-bold mb-6">Monetização & Anúncios</h2>
                            
                            <div className="mb-6 flex items-center bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={adsEnabled} 
                                        onChange={(e) => setAdsEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 relative"></div>
                                    <span className="ml-3 text-sm font-medium text-white">Ativar Publicidade</span>
                                </label>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Banner Topo (HTML/Script)</label>
                                    <textarea 
                                        value={adBannerTop} 
                                        onChange={e => setAdBannerTop(e.target.value)} 
                                        placeholder="<script>...</script> ou <iframe>...</iframe>" 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none h-24 font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Banner Meio (HTML/Script)</label>
                                    <textarea 
                                        value={adBannerMiddle} 
                                        onChange={e => setAdBannerMiddle(e.target.value)} 
                                        placeholder="Código HTML do banner..." 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none h-24 font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Banner Fim (HTML/Script)</label>
                                    <textarea 
                                        value={adBannerBottom} 
                                        onChange={e => setAdBannerBottom(e.target.value)} 
                                        placeholder="Código HTML do banner..." 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none h-24 font-mono text-xs"
                                    />
                                </div>
                                
                                <div className="border-t border-gray-700 pt-6 mt-6">
                                    <h3 className="text-lg font-bold mb-4 text-white">Vídeo Pre-Roll (Antes do Filme)</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">URL do Vídeo de Anúncio (.mp4)</label>
                                        <input 
                                            type="text" 
                                            value={adPreroll} 
                                            onChange={e => setAdPreroll(e.target.value)} 
                                            placeholder="https://exemplo.com/anuncio.mp4" 
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">Deixe em branco para usar o anúncio padrão.</p>
                                    </div>
                                </div>

                                <button onClick={handleSaveUI} disabled={isSaving} className="px-6 py-3 bg-green-600 rounded-lg font-bold hover:bg-green-700 text-white transition-colors shadow-lg shadow-green-500/30 w-full mt-4">
                                    {isSaving ? 'Salvando...' : 'Salvar Configurações de Anúncios'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Content Picker Modal */}
        {showPicker && (
            <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col border border-gray-700 shadow-2xl">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold">Selecionar Conteúdo</h3>
                        <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-white">&times;</button>
                    </div>
                    <div className="p-4 flex gap-4 border-b border-gray-700 bg-gray-800">
                        <select 
                            value={pickerType} 
                            onChange={(e) => setPickerType(e.target.value as any)}
                            className="bg-gray-900 text-white p-2 rounded border border-gray-600"
                        >
                            <option value="movie">Filmes</option>
                            <option value="series">Séries</option>
                        </select>
                        <input 
                            type="text" 
                            placeholder="Buscar nome..." 
                            className="flex-1 bg-gray-900 text-white p-2 rounded border border-gray-600"
                            value={pickerSearch}
                            onChange={e => setPickerSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {pickerList.map((item: any) => (
                             <div key={item.stream_id || item.series_id} onClick={() => addToHero(item, pickerType)} className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer group">
                                 <img src={item.stream_icon || item.cover} className="w-10 h-14 object-cover rounded bg-gray-900" />
                                 <div className="flex-1">
                                     <div className="font-bold group-hover:text-indigo-400">{item.name}</div>
                                     <div className="text-xs text-gray-500">{item.rating_5based ? `★ ${item.rating_5based}` : ''}</div>
                                 </div>
                                 <button className="px-3 py-1 bg-indigo-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                     Selecionar
                                 </button>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AdminPanel;
