
import React, { useState } from 'react';
import { logoutUser } from '../services/storage';
import { IUserProfile } from '../types';

interface NavbarProps {
  onSearch: (term: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAdminClick: () => void;
  onPinClick: () => void;
  isConfigured: boolean;
  isUnlocked: boolean;
  onToggleLock: () => void;
  hasPinConfigured: boolean;
  isAdmin: boolean;
  logoUrl?: string; 
  appTitle?: string;
  currentProfile: IUserProfile | null;
  onChangeProfile: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
    onSearch, activeTab, setActiveTab, onAdminClick, onPinClick, isConfigured,
    isUnlocked, onToggleLock, hasPinConfigured, isAdmin, logoUrl, appTitle,
    currentProfile, onChangeProfile
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleMobileNav = (tab: string) => {
      setActiveTab(tab);
      setShowMobileMenu(false);
      window.scrollTo(0,0);
  };

  return (
    <nav className="bg-black/90 backdrop-blur-md fixed w-full z-50 border-b border-white/5">
        <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
                
                {/* Left: Logo & Mobile Menu Button */}
                <div className="flex items-center gap-3">
                    {isConfigured && (
                        <button 
                            className="md:hidden text-gray-300 hover:text-white focus:outline-none"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                            </svg>
                        </button>
                    )}

                    <div className="flex items-center cursor-pointer" onClick={() => setActiveTab('home')}>
                        {logoUrl ? (
                            <img src={logoUrl} alt={appTitle || "Logo"} className="h-8 md:h-10 object-contain" />
                        ) : (
                            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text glow truncate max-w-[150px] md:max-w-none">
                                {appTitle || "FlixMax"}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Center: Desktop Nav */}
                {isConfigured && (
                    <div className="hidden md:flex space-x-6 lg:space-x-8">
                        <button onClick={() => setActiveTab('home')} className={`nav-item text-sm lg:text-base text-white font-medium ${activeTab === 'home' ? 'text-indigo-400' : 'hover:text-gray-300'}`}>Início</button>
                        <button onClick={() => setActiveTab('movies')} className={`nav-item text-sm lg:text-base text-white font-medium ${activeTab === 'movies' ? 'text-indigo-400' : 'hover:text-gray-300'}`}>Filmes</button>
                        <button onClick={() => setActiveTab('series')} className={`nav-item text-sm lg:text-base text-white font-medium ${activeTab === 'series' ? 'text-indigo-400' : 'hover:text-gray-300'}`}>Séries</button>
                        <button onClick={() => setActiveTab('live')} className={`nav-item text-sm lg:text-base text-white font-medium flex items-center gap-2 ${activeTab === 'live' ? 'text-indigo-400' : 'hover:text-gray-300'}`}>
                            TV Online
                            {!isAdmin && <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase font-bold">Em Breve</span>}
                        </button>
                    </div>
                )}
                
                {/* Right: Actions */}
                <div className="flex items-center space-x-2 md:space-x-4">
                    {isConfigured && (
                        <div className="relative hidden lg:block">
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                onChange={(e) => onSearch(e.target.value)}
                                className="bg-gray-800/70 text-white px-4 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 transition-all focus:w-64 text-sm" 
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    )}

                    {/* Mobile Search Icon (triggers global search mode in parent) */}
                    {isConfigured && (
                        <button onClick={() => onSearch(" ")} className="lg:hidden p-2 text-gray-300">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    )}

                    {/* Parental Lock */}
                    {hasPinConfigured && (
                        <button onClick={onToggleLock} className="p-1 md:p-0 text-white hover:text-indigo-400 transition-colors" title={isUnlocked ? "Conteúdo Adulto Liberado" : "Conteúdo Adulto Bloqueado"}>
                            {isUnlocked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    )}

                    {/* Profile Dropdown */}
                    {currentProfile && (
                        <div className="relative">
                            <div 
                                className="flex items-center cursor-pointer group"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            >
                                <img src={currentProfile.avatarUrl} className="w-8 h-8 rounded-md border border-transparent group-hover:border-white transition-all object-cover" />
                                <svg className={`hidden md:block w-4 h-4 text-white ml-1 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-3 w-48 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl overflow-hidden py-1 z-50 animate-fade-in">
                                    <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">Perfil Atual</p>
                                        <p className="text-white font-bold truncate">{currentProfile.name}</p>
                                    </div>
                                    <button 
                                        onClick={() => { setShowProfileMenu(false); onChangeProfile(); }}
                                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center border-b border-gray-800"
                                    >
                                        <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        Trocar Perfil
                                    </button>
                                    
                                    <button onClick={() => { setShowProfileMenu(false); onPinClick(); }} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center border-b border-gray-800">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        Controle Parental
                                    </button>

                                    {isAdmin && (
                                        <button onClick={() => { setShowProfileMenu(false); onAdminClick(); }} className="w-full text-left px-4 py-3 text-sm text-purple-400 hover:bg-gray-700 hover:text-purple-300 transition-colors flex items-center font-bold border-b border-gray-800">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                            Administração
                                        </button>
                                    )}

                                    <button onClick={logoutUser} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        Sair da Conta
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {showMobileMenu && isConfigured && (
                <div className="md:hidden mt-4 pt-4 border-t border-gray-700 animate-fade-in pb-2">
                    <div className="flex flex-col space-y-2">
                        <button onClick={() => handleMobileNav('home')} className={`text-left px-4 py-3 rounded-lg ${activeTab === 'home' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-300 hover:bg-gray-800'}`}>Início</button>
                        <button onClick={() => handleMobileNav('movies')} className={`text-left px-4 py-3 rounded-lg ${activeTab === 'movies' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-300 hover:bg-gray-800'}`}>Filmes</button>
                        <button onClick={() => handleMobileNav('series')} className={`text-left px-4 py-3 rounded-lg ${activeTab === 'series' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-300 hover:bg-gray-800'}`}>Séries</button>
                        <button onClick={() => handleMobileNav('live')} className={`text-left px-4 py-3 rounded-lg flex items-center justify-between ${activeTab === 'live' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-300 hover:bg-gray-800'}`}>
                            TV Online
                            {!isAdmin && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase font-bold">Em Breve</span>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </nav>
  );
};

export default Navbar;
