
import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
    format?: 'horizontal' | 'rectangle';
    code?: string; // HTML Code for the ad
}

const AdBanner: React.FC<AdBannerProps> = ({ format = 'horizontal', code }) => {
    const bannerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Se não houver código ou o container não existir, não faz nada
        if (!code || !bannerRef.current) return;

        // Limpa o container para evitar duplicidade ao trocar de página
        bannerRef.current.innerHTML = '';

        // Cria um elemento iframe dinamicamente
        const iframe = document.createElement('iframe');
        
        // Configurações de tamanho baseadas no código do Adsterra (728x90 ou 300x250)
        const width = format === 'horizontal' ? '728px' : '300px';
        const height = format === 'horizontal' ? '90px' : '250px';

        iframe.style.width = width;
        iframe.style.height = height;
        iframe.style.border = 'none';
        iframe.style.overflow = 'hidden';
        iframe.style.display = 'block'; // Remove espaços extras de inline
        iframe.scrolling = 'no'; // Remove barras de rolagem

        // Adiciona o iframe ao container
        bannerRef.current.appendChild(iframe);

        // Escreve o código do anúncio DENTRO do iframe
        // Isso isola o script do React e garante que o 'document.write' do anúncio funcione
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
                    </style>
                </head>
                <body>
                    ${code}
                </body>
                </html>
            `);
            doc.close();
        }

    }, [code, format]);

    if (!code || code.trim() === '') {
        return null;
    }

    // Container responsivo para centralizar o banner
    return (
        <div className="container mx-auto px-4 py-6 flex justify-center items-center overflow-hidden">
            <div ref={bannerRef} className="flex justify-center items-center bg-transparent rounded-lg">
                {/* O Iframe será injetado aqui pelo useEffect */}
            </div>
        </div>
    );
};

export default AdBanner;
