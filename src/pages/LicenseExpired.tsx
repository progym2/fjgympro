import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Phone, Mail, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import logomarca from '@/assets/logomarca.png';
import background from '@/assets/background.png';

const LicenseExpired: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, license } = useAuth();
  const { playClickSound } = useAudio();

  const handleLogout = async () => {
    playClickSound();
    await signOut();
    navigate('/');
  };

  const isDemo = license?.type === 'demo';
  const isTrial = license?.type === 'trial';

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/90" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg bg-card/90 backdrop-blur-xl rounded-2xl border border-destructive/30 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 text-center bg-gradient-to-b from-destructive/20 to-transparent">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Lock className="w-16 h-16 mx-auto text-destructive mb-4" />
          </motion.div>
          
          <motion.img
            src={logomarca}
            alt="FrancGymPro"
            className="w-32 h-32 mx-auto object-contain opacity-50"
          />
        </div>

        {/* Message */}
        <div className="px-8 pb-8 text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bebas text-destructive tracking-wider mb-2">
              {isDemo ? 'DEMONSTRAÇÃO EXPIRADA' : isTrial ? 'PERÍODO DE TESTE EXPIRADO' : 'LICENÇA EXPIRADA'}
            </h1>
            <p className="text-muted-foreground">
              {isDemo 
                ? 'Seu período de demonstração de 30 minutos terminou.' 
                : isTrial 
                  ? 'Seu período de teste de 7 dias terminou.' 
                  : 'Sua licença expirou.'}
            </p>
          </div>

          {isTrial && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Seus dados foram salvos e estarão disponíveis assim que você adquirir uma licença válida.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-lg font-medium text-foreground">
              Para continuar usando o FrancGymPro, adquira uma licença válida:
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playClickSound();
                window.open('mailto:oficialgympro@gmail.com?subject=Solicitar Licença FrancGymPro', '_blank');
              }}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bebas text-xl tracking-wider rounded-lg flex items-center justify-center gap-3 hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/30"
            >
              <ShoppingCart size={24} />
              ADQUIRIR LICENÇA
            </motion.button>
          </div>

          {/* Contact Info */}
          <div className="pt-6 border-t border-border/50 space-y-3">
            <p className="text-sm text-muted-foreground">Entre em contato:</p>
            <div className="flex flex-col items-center gap-2">
              <a
                href="mailto:oficialgympro@gmail.com"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail size={16} />
                oficialgympro@gmail.com
              </a>
            </div>
          </div>

          {/* Back Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full py-3 bg-muted text-muted-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors"
          >
            Voltar à Tela Inicial
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default LicenseExpired;
