
import React, { useState, useEffect } from 'react';
import { loginWithEmail, registerUser } from '../services/storage';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Carregar e-mail salvo se existir
    useEffect(() => {
        const savedEmail = localStorage.getItem('flixmax_saved_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await registerUser(email, password);
            } else {
                // Passa a opção rememberMe para a função de login
                await loginWithEmail(email, password, rememberMe);
                
                // Salvar ou remover e-mail do localStorage para UX
                if (rememberMe) {
                    localStorage.setItem('flixmax_saved_email', email);
                } else {
                    localStorage.removeItem('flixmax_saved_email');
                }
            }
            onLoginSuccess();
        } catch (err: any) {
            console.error("Login Error:", err);
            
            // Handle specific Firebase errors
            if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está cadastrado.');
            } else if (err.code === 'auth/invalid-credential') {
                setError('Credenciais inválidas. Verifique e-mail e senha.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Senha incorreta.');
            } else if (err.code === 'auth/user-not-found') {
                setError('Usuário não encontrado.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else if (err.code === 'auth/invalid-api-key') {
                setError('Configuração do sistema inválida (API Key). Contate o admin.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Erro de conexão. Verifique sua internet.');
            } else {
                setError('Ocorreu um erro: ' + (err.message || 'Tente novamente.'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-gray-900/80 backdrop-blur-lg p-8 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text mb-2">
                        FlixMax
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {isRegister ? 'Crie sua conta para começar' : 'Entre para assistir'}
                    </p>
                    {isRegister && (
                         <div className="mt-2 text-xs text-yellow-500/80 bg-yellow-500/10 p-2 rounded">
                            Nota: A primeira conta criada no sistema será a <b>Administradora</b>. As seguintes serão usuários comuns.
                         </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1 ml-1">E-mail</label>
                        <input 
                            type="email" 
                            required
                            className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1 ml-1">Senha</label>
                        <input 
                            type="password" 
                            required
                            className="w-full bg-black/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {!isRegister && (
                        <div className="flex items-center ml-1">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900 accent-indigo-600"
                            />
                            <label htmlFor="remember-me" className="ml-2 text-sm text-gray-400 cursor-pointer select-none">
                                Lembrar de mim
                            </label>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 p-3 rounded text-red-200 text-xs text-center">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex justify-center"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            isRegister ? 'Criar Conta' : 'Entrar'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm">
                        {isRegister ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
                        <button 
                            onClick={() => { setIsRegister(!isRegister); setError(''); }}
                            className="ml-2 text-indigo-400 hover:text-indigo-300 font-bold underline decoration-2 underline-offset-4"
                        >
                            {isRegister ? 'Fazer Login' : 'Cadastre-se'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
