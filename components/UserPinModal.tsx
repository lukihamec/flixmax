
import React, { useState, useEffect } from 'react';
import { IUserSettings } from '../types';
import { saveUserSettings, getUserSettings } from '../services/storage';

interface UserPinModalProps {
  onClose: () => void;
  onUpdate: (newPin: string | undefined) => void;
  isMandatory?: boolean; // Se true, remove o botão de fechar e obriga a configuração
}

const UserPinModal: React.FC<UserPinModalProps> = ({ onClose, onUpdate, isMandatory = false }) => {
  const [step, setStep] = useState<'loading' | 'verify_old' | 'set_new'>('loading');
  const [inputPin, setInputPin] = useState('');
  const [existingPin, setExistingPin] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
      const load = async () => {
          const settings = await getUserSettings();
          if (settings && settings.parentalPin) {
              setExistingPin(settings.parentalPin);
              setStep('verify_old');
          } else {
              setExistingPin(null);
              setStep('set_new');
          }
      }
      load();
  }, []);

  const handleVerifyOld = (e: React.FormEvent) => {
      e.preventDefault();
      if (inputPin === existingPin) {
          setStep('set_new');
          setInputPin('');
          setError('');
      } else {
          setError('PIN atual incorreto.');
          setInputPin('');
      }
  };

  const handleSaveNew = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (inputPin.length !== 4) {
          setError('O PIN deve ter 4 dígitos.');
          return;
      }

      setSaving(true);
      const settings: IUserSettings = {
          parentalPin: inputPin
      };
      
      await saveUserSettings(settings);
      onUpdate(settings.parentalPin);
      setSaving(false);
      onClose();
  };

  const handleInputChange = (val: string) => {
      setInputPin(val.replace(/\D/g, ''));
      setError('');
  };

  return (
      <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center animate-fade-in px-4">
          <div className="bg-gray-800 p-8 rounded-xl max-w-sm w-full border border-gray-700 shadow-2xl relative">
              
              {!isMandatory && (
                  <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              )}

              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                 </div>
                 
                 {step === 'verify_old' && <h2 className="text-xl font-bold text-white">Verificação de Segurança</h2>}
                 {step === 'set_new' && <h2 className="text-xl font-bold text-white">{existingPin ? 'Novo PIN' : 'Criar PIN de Acesso'}</h2>}
                 
                 <p className="text-gray-400 text-sm mt-2">
                     {step === 'verify_old' && 'Para alterar, digite seu PIN atual.'}
                     {step === 'set_new' && (isMandatory ? 'É obrigatório configurar um PIN para utilizar o aplicativo.' : 'Defina um código de 4 dígitos para controle parental.')}
                 </p>
              </div>
              
              {step === 'loading' ? (
                  <div className="text-center py-4 text-gray-400">Carregando...</div>
              ) : (
                  <form onSubmit={step === 'verify_old' ? handleVerifyOld : handleSaveNew}>
                    <input 
                        type="password" 
                        maxLength={4}
                        value={inputPin}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className="w-full text-center text-3xl tracking-[1em] bg-gray-900 border border-gray-600 rounded-lg py-4 mb-2 focus:ring-2 focus:ring-green-500 outline-none text-white placeholder-gray-700"
                        placeholder="••••"
                        autoFocus
                    />
                    
                    {error && <div className="text-red-400 text-sm text-center mb-4 font-bold">{error}</div>}
                    
                    {step === 'set_new' && !isMandatory && (
                         <div className="text-xs text-gray-500 text-center mb-4 mt-2">O PIN será solicitado para conteúdo adulto.</div>
                    )}
                    
                    <button type="submit" disabled={saving || inputPin.length !== 4} className={`w-full py-3 rounded-lg font-bold transition-all mt-4 ${inputPin.length === 4 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                        {saving ? 'Processando...' : (step === 'verify_old' ? 'Verificar PIN' : 'Salvar PIN')}
                    </button>
                  </form>
              )}
          </div>
      </div>
  );
};

export default UserPinModal;
