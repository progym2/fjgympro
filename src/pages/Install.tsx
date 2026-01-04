import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Smartphone, Monitor, Apple, Chrome, Share, ArrowLeft, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logomarca from '@/assets/logomarca.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install: React.FC = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-4">
      <div className="container mx-auto max-w-2xl py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft size={18} className="mr-2" />
          Voltar
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img 
            src={logomarca} 
            alt="FrancGymPro" 
            className="w-24 h-24 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bebas text-primary tracking-wider mb-2">
            INSTALAR FRANCGYMPRO
          </h1>
          <p className="text-muted-foreground">
            Instale o app no seu dispositivo para acesso rápido
          </p>
        </motion.div>

        {isInstalled ? (
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-6 text-center">
              <Check size={48} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-green-500 mb-2">App Instalado!</h2>
              <p className="text-muted-foreground">
                O FrancGymPro já está instalado no seu dispositivo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Direct Install Button (Android/Desktop Chrome) */}
            {isInstallable && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="bg-primary/10 border-primary/30">
                  <CardContent className="p-6">
                    <Button 
                      onClick={handleInstall}
                      className="w-full gap-2 text-lg py-6"
                      size="lg"
                    >
                      <Download size={24} />
                      Instalar Agora
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card className="bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple size={24} className="text-muted-foreground" />
                    Instalação no iPhone/iPad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                    <div>
                      <p className="font-medium">Toque no botão Compartilhar</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Share size={14} /> Na barra inferior do Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                    <div>
                      <p className="font-medium">Selecione "Adicionar à Tela de Início"</p>
                      <p className="text-sm text-muted-foreground">Role para baixo no menu se necessário</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                    <div>
                      <p className="font-medium">Toque em "Adicionar"</p>
                      <p className="text-sm text-muted-foreground">O app aparecerá na sua tela inicial</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Instructions (if prompt not available) */}
            {isAndroid && !isInstallable && (
              <Card className="bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone size={24} className="text-green-500" />
                    Instalação no Android
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">1</div>
                    <div>
                      <p className="font-medium">Abra o menu do navegador</p>
                      <p className="text-sm text-muted-foreground">Toque nos 3 pontos no canto superior</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">2</div>
                    <div>
                      <p className="font-medium">Selecione "Instalar app" ou "Adicionar à tela inicial"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">3</div>
                    <div>
                      <p className="font-medium">Confirme a instalação</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {!isIOS && !isAndroid && !isInstallable && (
              <Card className="bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor size={24} className="text-blue-500" />
                    Instalação no Computador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Chrome size={20} className="text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Google Chrome</p>
                      <p className="text-sm text-muted-foreground">
                        Clique no ícone de instalação na barra de endereços ou no menu (⋮) → "Instalar FrancGymPro"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features */}
            <Card className="bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Por que instalar?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span className="text-sm">Acesso rápido direto da tela inicial</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span className="text-sm">Funciona offline para consultas básicas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span className="text-sm">Experiência de app nativo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span className="text-sm">Carregamento mais rápido</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    <span className="text-sm">Sem ocupar espaço de loja de apps</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Install;
