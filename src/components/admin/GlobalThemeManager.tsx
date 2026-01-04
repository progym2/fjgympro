import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Lock, Unlock, Check, AlertTriangle } from 'lucide-react';
import { SPORT_THEMES, SportTheme, setGlobalTheme, getGlobalTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const GlobalThemeManager: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<SportTheme | null>(null);
  const [currentGlobal, setCurrentGlobal] = useState<SportTheme | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState<'set' | 'remove'>('set');

  useEffect(() => {
    const global = getGlobalTheme();
    setCurrentGlobal(global);
    setSelectedTheme(global);
  }, []);

  const handleSetGlobalTheme = () => {
    if (selectedTheme) {
      setActionType('set');
      setShowConfirmDialog(true);
    }
  };

  const handleRemoveGlobalTheme = () => {
    setActionType('remove');
    setShowConfirmDialog(true);
  };

  const confirmAction = () => {
    if (actionType === 'set' && selectedTheme) {
      setGlobalTheme(selectedTheme);
      toast.success(`Tema "${SPORT_THEMES.find(t => t.id === selectedTheme)?.name}" fixado para todos os usuários!`);
    } else if (actionType === 'remove') {
      setGlobalTheme(null);
      toast.success('Tema global removido. Usuários podem escolher seu próprio tema.');
    }
    setShowConfirmDialog(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Palette className="w-5 h-5" />
          Gerenciar Tema Global
        </CardTitle>
        <CardDescription>
          Fixe um tema para todos os usuários logados. As preferências individuais serão ignoradas enquanto o tema global estiver ativo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status atual */}
        <div className={`p-3 rounded-lg border ${currentGlobal ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentGlobal ? (
                <>
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Tema Global Ativo:</span>
                  <span className="text-lg">{SPORT_THEMES.find(t => t.id === currentGlobal)?.emoji}</span>
                  <span className="text-sm text-primary font-bold">{SPORT_THEMES.find(t => t.id === currentGlobal)?.name}</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Nenhum tema global ativo - usuários escolhem livremente</span>
                </>
              )}
            </div>
            {currentGlobal && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveGlobalTheme}
                className="text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
              >
                <Unlock className="w-4 h-4 mr-1" />
                Liberar
              </Button>
            )}
          </div>
        </div>

        {/* Seleção de tema */}
        <div>
          <p className="text-sm font-medium mb-3">Escolher tema para fixar:</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {SPORT_THEMES.map((theme) => (
              <motion.button
                key={theme.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                  selectedTheme === theme.id
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                    : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <span className="text-2xl">{theme.emoji}</span>
                <span className="text-xs font-medium">{theme.name}</span>
                
                {selectedTheme === theme.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </motion.div>
                )}
                
                {/* Preview gradient bar */}
                <div className={`w-full h-1 rounded-full bg-gradient-to-r ${theme.gradient} mt-1`} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Botão de aplicar */}
        <Button
          onClick={handleSetGlobalTheme}
          disabled={!selectedTheme || selectedTheme === currentGlobal}
          className="w-full"
        >
          <Lock className="w-4 h-4 mr-2" />
          Fixar Tema para Todos
        </Button>

        {/* Aviso */}
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-yellow-500">
            O tema global será aplicado imediatamente para todos os usuários logados. A página será recarregada para aplicar as mudanças.
          </p>
        </div>
      </CardContent>

      {/* Diálogo de confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === 'set' ? (
                <>
                  <Lock className="w-5 h-5 text-primary" />
                  Fixar Tema Global
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5 text-orange-500" />
                  Liberar Tema
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'set' ? (
                <>
                  Tem certeza que deseja fixar o tema <strong>"{SPORT_THEMES.find(t => t.id === selectedTheme)?.name}"</strong> para todos os usuários?
                  <br /><br />
                  As preferências individuais serão ignoradas enquanto o tema global estiver ativo.
                </>
              ) : (
                <>
                  Tem certeza que deseja remover o tema global?
                  <br /><br />
                  Os usuários poderão escolher seu próprio tema novamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionType === 'set' ? 'Sim, Fixar' : 'Sim, Liberar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default GlobalThemeManager;
