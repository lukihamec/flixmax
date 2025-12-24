
import React, { useState, useMemo } from 'react';
import { ISeries, IXtreamCategory } from '../types';

interface SeriesPageProps {
  series: ISeries[];
  categories: IXtreamCategory[];
  onPlay: (item: ISeries) => void;
  onBack: () => void;
}

const SeriesPage: React.FC<SeriesPageProps> = ({ series, categories, onPlay, onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [displayCount, setDisplayCount] = useState(50);

  const filteredSeries = useMemo(() => {
    let filtered = series;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(s => s.category_id === selectedCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered;
  }, [series, selectedCategory, searchTerm]);

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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text">
          Séries ({filteredSeries.length})
        </h1>
        <input 
          type="text" 
          placeholder="Buscar série..." 
          className="bg-gray-800/70 border border-gray-700 text-white px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 w-full md:w-64"
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
                ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white shadow-lg shadow-pink-500/30' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button 
              key={cat.category_id}
              onClick={() => { setSelectedCategory(cat.category_id); setDisplayCount(50); }}
              className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.category_id 
                  ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white shadow-lg shadow-pink-500/30' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {filteredSeries.length > 0 ? filteredSeries.slice(0, displayCount).map((item) => (
           <div 
             key={item.series_id} 
             onClick={() => onPlay(item)}
             className="card-hover rounded-xl overflow-hidden bg-gray-800/50 relative cursor-pointer group"
           >
             <div className="aspect-[2/3] relative overflow-hidden">
                <img 
                  src={item.cover || "https://picsum.photos/300/450"} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt={item.name} 
                  loading="lazy" 
                />
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-pink-600 rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform shadow-lg shadow-pink-500/50">
                       <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </div>
                </div>
                <div className="absolute top-2 right-2 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
                   SÉRIE
                </div>
             </div>
             <div className="p-3">
               <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-pink-400 transition-colors">{item.name}</h3>
               <p className="text-xs text-gray-400 mt-1">{item.rating_5based ? `★ ${item.rating_5based}` : ''}</p>
             </div>
           </div>
        )) : (
          <div className="col-span-full text-center py-20 text-gray-500">
            Nenhuma série encontrada.
          </div>
        )}
      </div>

      {filteredSeries.length > displayCount && (
        <div className="flex justify-center mt-12">
            <button onClick={() => setDisplayCount(prev => prev + 50)} className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-bold transition-colors">
                Carregar Mais Séries
            </button>
        </div>
      )}
    </div>
  );
};

export default SeriesPage;
