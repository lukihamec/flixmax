
import React, { useState, useMemo } from 'react';
import { ILiveStream, IXtreamCategory } from '../types';

interface LiveTVPageProps {
  channels: ILiveStream[];
  categories: IXtreamCategory[];
  onPlay: (item: ILiveStream) => void;
  onBack: () => void;
  isAdmin: boolean; // New prop to control access
}

const LiveTVPage: React.FC<LiveTVPageProps> = ({ channels, categories, onPlay, onBack, isAdmin }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(50);

  // --- BLOCKED VIEW FOR NON-ADMINS ---
  if (!isAdmin) {
      return (
        <div className="pt-24 pb-12 min-h-screen container mx-auto px-4 flex flex-col items-center justify-center text-center">
            <button 
                onClick={onBack}
                className="absolute top-24 left-4 flex items-center text-gray-400 hover:text-white transition-colors group"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Voltar
            </button>

            <div className="max-w-2xl bg-gray-800/50 p-10 rounded-2xl border border-gray-700 backdrop-blur-sm animate-fade-in shadow-2xl">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Em Breve</h1>
                <h2 className="text-xl md:text-2xl text-blue-400 font-medium mb-6">TV Ao Vivo</h2>
                
                <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                    Estamos finalizando os ajustes para trazer a melhor experiência de TV ao vivo para você. 
                    <br className="hidden md:block"/>Novos canais, qualidade 4K e zero travamentos.
                </p>

                <div className="inline-block bg-gray-900/80 rounded-lg px-6 py-3 border border-gray-600">
                    <span className="text-gray-400 text-sm uppercase tracking-widest font-bold">Lançamento Previsto</span>
                    <div className="text-white font-mono text-xl mt-1">NOVEMBRO 2023</div>
                </div>

                <div className="mt-10">
                    <button onClick={onBack} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-blue-500/30">
                        Explorar Filmes e Séries
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- ADMIN VIEW (Standard Logic) ---

  const filteredChannels = useMemo(() => {
    let filtered = channels;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category_id === selectedCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [channels, selectedCategory, searchTerm]);

  return (
    <div className="pt-24 pb-12 min-h-screen container mx-auto px-4">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Voltar ao Início
      </button>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text">
            TV Ao Vivo ({filteredChannels.length})
            </h1>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded uppercase">Acesso Admin</span>
        </div>
       
        <input 
          type="text" 
          placeholder="Buscar canal..." 
          className="bg-gray-800/70 border border-gray-700 text-white px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setDisplayCount(50); }}
        />
      </div>

      <div className="mb-10 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex space-x-2">
          <button 
            onClick={() => { setSelectedCategory('all'); setDisplayCount(50); }}
            className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all' 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button 
              key={cat.category_id}
              onClick={() => { setSelectedCategory(cat.category_id); setDisplayCount(50); }}
              className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.category_id 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredChannels.length > 0 ? filteredChannels.slice(0, displayCount).map((item) => (
           <div 
             key={item.stream_id} 
             onClick={() => onPlay(item)}
             className="bg-gray-800/50 rounded-xl p-4 text-center hover:bg-gray-700/50 transition-all cursor-pointer group relative overflow-hidden border border-transparent hover:border-blue-500/30"
           >
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-4 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                  {item.stream_icon ? (
                    <img src={item.stream_icon} className="w-full h-full object-cover" alt={item.name} onError={(e) => (e.currentTarget.style.display = 'none')}/>
                  ) : (
                    <span className="text-xl font-bold text-white">TV</span>
                  )}
              </div>
              <h3 className="font-medium truncate text-gray-200 group-hover:text-blue-400 transition-colors">{item.name}</h3>
              <div className="flex justify-center items-center mt-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
                  <p className="text-xs text-gray-400 group-hover:text-gray-300">Ao Vivo</p>
              </div>
           </div>
        )) : (
          <div className="col-span-full text-center py-20 text-gray-500">
            Nenhum canal encontrado.
          </div>
        )}
      </div>

       {filteredChannels.length > displayCount && (
        <div className="flex justify-center mt-12">
            <button onClick={() => setDisplayCount(prev => prev + 50)} className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-bold transition-colors">
                Carregar Mais Canais
            </button>
        </div>
      )}
    </div>
  );
};

export default LiveTVPage;
