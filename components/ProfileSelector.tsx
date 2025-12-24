
import React, { useState, useEffect } from 'react';
import { IUserProfile } from '../types';
import { getUserProfiles, addUserProfile, deleteUserProfile } from '../services/storage';

interface ProfileSelectorProps {
    onSelectProfile: (profile: IUserProfile) => void;
}

const AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Shadow",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Tigger",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bandit",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Misty"
];

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ onSelectProfile }) => {
    const [profiles, setProfiles] = useState<IUserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // New Profile State
    const [newName, setNewName] = useState('');
    const [newAvatar, setNewAvatar] = useState(AVATARS[0]);
    const [isKids, setIsKids] = useState(false);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        setLoading(true);
        const data = await getUserProfiles();
        setProfiles(data);
        
        // If no profiles exist (legacy users), create default automatically or force creation
        if (data.length === 0 && !isAdding) {
           setIsAdding(true); 
        }
        setLoading(false);
    };

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        const profile = await addUserProfile(newName, newAvatar, isKids);
        if (profile) {
            setProfiles([...profiles, profile]);
            setIsAdding(false);
            setNewName('');
            setIsKids(false);
        }
    };

    const handleDeleteProfile = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir este perfil? Todo o histórico será perdido.")) {
            await deleteUserProfile(id);
            setProfiles(profiles.filter(p => p.id !== id));
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center p-4 animate-fade-in overflow-y-auto">
             <div className="text-center mb-6 md:mb-10">
                 <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Quem está assistindo?</h1>
             </div>

             {/* PROFILE GRID */}
             <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8 md:mb-12 max-w-4xl">
                 {profiles.map(profile => (
                     <div key={profile.id} className="group flex flex-col items-center cursor-pointer" onClick={() => !isEditing && onSelectProfile(profile)}>
                         <div className={`w-24 h-24 md:w-40 md:h-40 rounded-xl overflow-hidden mb-2 md:mb-4 border-4 border-transparent ${!isEditing ? 'group-hover:border-white' : ''} transition-all relative`}>
                             <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                             
                             {/* Delete Overlay */}
                             {isEditing && (
                                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center" onClick={(e) => handleDeleteProfile(profile.id, e)}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-red-500 hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                     </svg>
                                 </div>
                             )}

                             {/* Kids Badge */}
                             {profile.isKids && (
                                 <div className="absolute bottom-0 right-0 bg-yellow-500 text-black text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-tl-lg">
                                     KIDS
                                 </div>
                             )}
                         </div>
                         <span className="text-gray-400 group-hover:text-white font-medium text-lg md:text-xl transition-colors truncate max-w-[100px] md:max-w-[150px] text-center">
                             {profile.name}
                         </span>
                     </div>
                 ))}

                 {/* Add Profile Button (Always visible if less than 5 profiles) */}
                 {!isEditing && !isAdding && profiles.length < 5 && (
                     <div className="group flex flex-col items-center cursor-pointer" onClick={() => setIsAdding(true)}>
                         <div className="w-24 h-24 md:w-40 md:h-40 rounded-xl bg-gray-800 flex items-center justify-center mb-2 md:mb-4 group-hover:bg-gray-700 transition-colors">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-16 md:w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                             </svg>
                         </div>
                         <span className="text-gray-400 group-hover:text-white font-medium text-lg md:text-xl transition-colors">
                             Adicionar
                         </span>
                     </div>
                 )}
             </div>

             {/* Actions */}
             {!isAdding && profiles.length > 0 && (
                 <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="border border-gray-500 text-gray-400 hover:text-white hover:border-white px-6 py-2 rounded-full font-medium transition-all tracking-widest uppercase text-xs md:text-sm"
                 >
                     {isEditing ? 'Concluir' : 'Gerenciar Perfis'}
                 </button>
             )}

             {/* CREATE PROFILE MODAL */}
             {isAdding && (
                 <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                     <div className="bg-gray-800 p-6 md:p-8 rounded-xl max-w-md w-full animate-fade-in border border-gray-700">
                         <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Novo Perfil</h2>
                         <form onSubmit={handleCreateProfile}>
                             <div className="flex gap-4 mb-6 overflow-x-auto pb-4 custom-scrollbar">
                                 {AVATARS.map((avatar, idx) => (
                                     <img 
                                        key={idx} 
                                        src={avatar} 
                                        onClick={() => setNewAvatar(avatar)}
                                        className={`w-12 h-12 md:w-16 md:h-16 rounded-full cursor-pointer border-2 ${newAvatar === avatar ? 'border-indigo-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'} transition-all flex-shrink-0`}
                                     />
                                 ))}
                             </div>

                             <div className="mb-6">
                                 <label className="block text-gray-400 text-sm mb-2">Nome</label>
                                 <input 
                                    type="text" 
                                    value={newName} 
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Ex: Papai"
                                    className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white focus:outline-none focus:border-indigo-500"
                                    autoFocus
                                 />
                             </div>

                             <div className="mb-6">
                                <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={isKids} 
                                        onChange={(e) => setIsKids(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-500 text-indigo-600 focus:ring-indigo-500 bg-gray-900" 
                                    />
                                    <div>
                                        <span className="text-white font-medium block">Perfil Infantil?</span>
                                        <span className="text-xs text-gray-400 block">Exibe apenas conteúdo para crianças (Desenhos, Disney, etc).</span>
                                    </div>
                                </label>
                             </div>

                             <div className="flex justify-end gap-3">
                                 <button type="button" onClick={() => { setIsAdding(false); setIsKids(false); }} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                                 <button type="submit" disabled={!newName.trim()} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold disabled:opacity-50">Salvar</button>
                             </div>
                         </form>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default ProfileSelector;
