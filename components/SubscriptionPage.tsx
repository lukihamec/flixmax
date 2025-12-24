
import React, { useState } from 'react';
import { renewSubscription, logoutUser } from '../services/storage';

interface SubscriptionPageProps {
    onSuccess: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onSuccess }) => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Mock Payment Data
    const [cardNumber, setCardNumber] = useState('');
    const [cardName, setCardName] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    const handleSubscribeClick = () => {
        setShowPaymentModal(true);
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        // SIMULATION: In a real app, you would send this to Stripe/MercadoPago here
        // We simulate a 2-second API call
        setTimeout(async () => {
            const success = await renewSubscription(selectedPlan);
            if (success) {
                setIsProcessing(false);
                setShowPaymentModal(false);
                onSuccess(); // Trigger App reload or state change
            } else {
                alert("Erro ao processar pagamento. Tente novamente.");
                setIsProcessing(false);
            }
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#0f0f1a] text-white flex flex-col animate-fade-in overflow-y-auto">
            <div className="container mx-auto px-4 py-8 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-12">
                     <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">FlixMax</h1>
                     <button onClick={() => logoutUser()} className="text-gray-400 hover:text-white text-sm">Sair</button>
                </div>

                {!showPaymentModal ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <h2 className="text-3xl md:text-5xl font-bold text-center mb-6">Escolha o plano ideal para você</h2>
                        <p className="text-gray-400 text-center mb-12 max-w-lg">Assista a filmes, séries e TV ao vivo sem limites. Cancele quando quiser.</p>

                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
                            {/* Monthly Plan */}
                            <div 
                                onClick={() => setSelectedPlan('monthly')}
                                className={`border-2 rounded-2xl p-8 cursor-pointer transition-all relative overflow-hidden ${selectedPlan === 'monthly' ? 'border-indigo-500 bg-gray-800' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Mensal</h3>
                                        <p className="text-gray-400 text-sm">Cobrado todo mês</p>
                                    </div>
                                    {selectedPlan === 'monthly' && (
                                        <div className="bg-indigo-600 rounded-full p-1">
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                        </div>
                                    )}
                                </div>
                                <div className="text-3xl font-bold mb-6">R$ 29,90<span className="text-sm font-normal text-gray-400">/mês</span></div>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center text-sm text-gray-300"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>Acesso a todo o catálogo</li>
                                    <li className="flex items-center text-sm text-gray-300"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>TV Ao Vivo 24h</li>
                                    <li className="flex items-center text-sm text-gray-300"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>Sem anúncios</li>
                                </ul>
                            </div>

                            {/* Yearly Plan */}
                            <div 
                                onClick={() => setSelectedPlan('yearly')}
                                className={`border-2 rounded-2xl p-8 cursor-pointer transition-all relative overflow-hidden ${selectedPlan === 'yearly' ? 'border-purple-500 bg-gray-800' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}
                            >
                                <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                    ECONOMIZE 20%
                                </div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Anual</h3>
                                        <p className="text-gray-400 text-sm">Cobrado a cada 12 meses</p>
                                    </div>
                                    {selectedPlan === 'yearly' && (
                                        <div className="bg-purple-600 rounded-full p-1">
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                        </div>
                                    )}
                                </div>
                                <div className="text-3xl font-bold mb-6">R$ 299,90<span className="text-sm font-normal text-gray-400">/ano</span></div>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center text-sm text-gray-300"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>Todos benefícios do Mensal</li>
                                    <li className="flex items-center text-sm text-gray-300"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>Qualidade 4K Ultra HD</li>
                                    <li className="flex items-center text-sm text-gray-300"><svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>4 Telas simultâneas</li>
                                </ul>
                            </div>
                        </div>

                        <button 
                            onClick={handleSubscribeClick}
                            className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold py-4 px-12 rounded-full hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-105 transition-all"
                        >
                            Assinar Agora
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-gray-800 p-8 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl animate-fade-in">
                            <div className="flex items-center mb-6">
                                <button onClick={() => setShowPaymentModal(false)} className="mr-4 text-gray-400 hover:text-white">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                                </button>
                                <h2 className="text-xl font-bold">Pagamento Seguro</h2>
                            </div>

                            <div className="mb-6 p-4 bg-gray-900 rounded-lg flex justify-between items-center">
                                <div>
                                    <span className="text-sm text-gray-400 block">Total a pagar</span>
                                    <span className="text-xl font-bold text-white">{selectedPlan === 'monthly' ? 'R$ 29,90' : 'R$ 299,90'}</span>
                                </div>
                                <span className="text-xs bg-gray-800 border border-gray-600 px-2 py-1 rounded uppercase">{selectedPlan}</span>
                            </div>

                            <form onSubmit={handlePaymentSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 ml-1">Nome no Cartão</label>
                                    <input 
                                        type="text" 
                                        value={cardName}
                                        onChange={e => setCardName(e.target.value)}
                                        placeholder="JOAO DA SILVA"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1 ml-1">Número do Cartão</label>
                                    <input 
                                        type="text" 
                                        value={cardNumber}
                                        onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                        placeholder="0000 0000 0000 0000"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs text-gray-400 mb-1 ml-1">Validade</label>
                                        <input 
                                            type="text" 
                                            value={expiry}
                                            onChange={e => setExpiry(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            placeholder="MM/AA"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="block text-xs text-gray-400 mb-1 ml-1">CVV</label>
                                        <input 
                                            type="text" 
                                            value={cvc}
                                            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                            placeholder="123"
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="pt-4">
                                    <button 
                                        type="submit" 
                                        disabled={isProcessing}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center transition-all disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processando...
                                            </>
                                        ) : 'Finalizar Pagamento'}
                                    </button>
                                </div>
                                <p className="text-center text-xs text-gray-500 mt-2">Ambiente seguro. Seus dados estão criptografados.</p>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionPage;
