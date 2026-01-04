import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MapPin, Smartphone, Heart, Dumbbell, Users, Award } from 'lucide-react';
import logomarca from '@/assets/logomarca.png';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MotionOverlay = forwardRef<HTMLDivElement, React.ComponentProps<typeof motion.div>>(
  (props, ref) => <motion.div ref={ref} {...props} />
);
MotionOverlay.displayName = 'MotionOverlay';

const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <MotionOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border border-primary/30 shadow-2xl shadow-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/50 hover:bg-background transition-colors"
            >
              <X className="text-foreground" size={20} />
            </button>

            {/* Header with Logo */}
            <div className="relative p-8 text-center bg-gradient-to-b from-primary/20 to-transparent">
              <motion.img
                src={logomarca}
                alt="FrancGymPro"
                className="w-48 h-48 mx-auto object-contain"
                animate={{ 
                  filter: ['drop-shadow(0 0 20px hsl(var(--primary)/0.5))', 'drop-shadow(0 0 40px hsl(var(--primary)/0.8))', 'drop-shadow(0 0 20px hsl(var(--primary)/0.5))']
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <h1 className="mt-4 text-3xl font-bebas text-primary tracking-wider">
                SOBRE O APLICATIVO
              </h1>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Description */}
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <span className="text-primary font-semibold">FrancGymPro</span> é um aplicativo completo de gestão de academias e acompanhamento de treinos, desenvolvido para conectar academias, instrutores profissionais e pessoas do mundo fitness em um único ambiente moderno e eficiente.
                </p>
                <p>
                  O aplicativo permite que instrutores acompanhem seus alunos de forma organizada, com foco em treinos, rotinas, evolução e disciplina, enquanto os alunos têm acesso fácil às suas atividades, orientações e acompanhamento profissional.
                </p>
                <p>
                  Criado para suprir uma grande necessidade do mercado, o FrancGymPro nasce com o objetivo de oferecer uma solução realmente completa, já que não existiam alternativas que unissem gestão de academia e acompanhamento profissional de forma simples, prática e funcional.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Dumbbell, label: 'Academias', color: 'text-primary' },
                  { icon: Users, label: 'Instrutores & Personal', color: 'text-green-500' },
                  { icon: Heart, label: 'Alunos & Fitness', color: 'text-red-500' },
                  { icon: Award, label: 'Resultados Reais', color: 'text-yellow-500' },
                ].map(({ icon: Icon, label, color }, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <Icon className={color} size={24} />
                    <span className="text-sm font-medium">{label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Developer Section */}
              <div className="pt-6 border-t border-border/50">
                <h2 className="text-xl font-bebas text-primary tracking-wider mb-4">
                  👨‍💻 DESENVOLVEDOR
                </h2>
                <p className="text-muted-foreground">
                  O aplicativo foi desenvolvido por <span className="text-primary font-semibold">Franc Denis</span>, da cidade de Feijó, com a missão de ajudar academias e profissionais do fitness a terem uma ferramenta moderna, acessível e eficiente para o dia a dia.
                </p>
              </div>

              {/* Contact Section */}
              <div className="pt-6 border-t border-border/50">
                <h2 className="text-xl font-bebas text-primary tracking-wider mb-4">
                  📩 CONTATO
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Smartphone className="text-primary" size={20} />
                    <span>GymPro Oficial</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="text-primary" size={20} />
                    <a href="mailto:oficialgympro@gmail.com" className="hover:text-primary transition-colors">
                      oficialgympro@gmail.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="text-primary" size={20} />
                    <span>Feijó, Acre - Brasil</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </MotionOverlay>
      )}
    </AnimatePresence>
  );
};

export default AboutDialog;
