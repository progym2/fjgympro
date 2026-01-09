import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Palette, LayoutGrid, List, Maximize2, Minimize2,
  MousePointer2, Settings, Check, Sun, Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme, SPORT_THEMES, MenuLayoutMode, MenuSizeMode } from '@/contexts/ThemeContext';
import { useThemeStyles } from '@/lib/themeStyles';
import { cn } from '@/lib/utils';

const AppSettings: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentTheme, 
    setTheme, 
    themes, 
    menuSize, 
    setMenuSize, 
    menuLayout, 
    setMenuLayout,
    hoverEffectsEnabled,
    setHoverEffectsEnabled,
    themeConfig
  } = useTheme();
  const styles = useThemeStyles();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-lg"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-xl", styles.iconBg)}>
              <Settings className={cn("w-5 h-5", styles.iconColor)} />
            </div>
            <div>
              <h1 className="text-xl font-bebas tracking-wider text-primary">CONFIGURAÇÕES DO APP</h1>
              <p className="text-xs text-muted-foreground">Personalize sua experiência</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Theme Selection */}
          <Card className={cn("border", styles.cardBorder, styles.cardBg)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("flex items-center gap-2 text-base", styles.titleColor)}>
                <Palette size={18} />
                Tema do App
              </CardTitle>
              <CardDescription>Escolha o tema visual do aplicativo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {themes.map((theme) => (
                  <motion.button
                    key={theme.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTheme(theme.id)}
                    className={cn(
                      "relative p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1",
                      currentTheme === theme.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border/30 hover:border-primary/30 bg-card/50"
                    )}
                  >
                    <span className="text-xl">{theme.emoji}</span>
                    <span className="text-[9px] font-medium truncate w-full text-center">
                      {theme.name}
                    </span>
                    {currentTheme === theme.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                      >
                        <Check size={10} className="text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Menu Size */}
          <Card className={cn("border", styles.cardBorder, styles.cardBg)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("flex items-center gap-2 text-base", styles.titleColor)}>
                {menuSize === 'large' ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                Tamanho do Menu
              </CardTitle>
              <CardDescription>Ajuste o tamanho dos ícones e textos do menu</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={menuSize}
                onValueChange={(value) => setMenuSize(value as MenuSizeMode)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="large" id="menu-large" />
                  <Label htmlFor="menu-large" className="flex items-center gap-2 cursor-pointer">
                    <Maximize2 size={16} />
                    Menu Grande
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="menu-compact" />
                  <Label htmlFor="menu-compact" className="flex items-center gap-2 cursor-pointer">
                    <Minimize2 size={16} />
                    Menu Compacto
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Menu Layout */}
          <Card className={cn("border", styles.cardBorder, styles.cardBg)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("flex items-center gap-2 text-base", styles.titleColor)}>
                {menuLayout === 'grid' ? <LayoutGrid size={18} /> : <List size={18} />}
                Layout do Menu
              </CardTitle>
              <CardDescription>Escolha entre visualização em grade ou lista</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={menuLayout}
                onValueChange={(value) => setMenuLayout(value as MenuLayoutMode)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="grid" id="layout-grid" />
                  <Label htmlFor="layout-grid" className="flex items-center gap-2 cursor-pointer">
                    <LayoutGrid size={16} />
                    Grade (Ícones)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="list" id="layout-list" />
                  <Label htmlFor="layout-list" className="flex items-center gap-2 cursor-pointer">
                    <List size={16} />
                    Lista (Vertical)
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Hover Effects */}
          <Card className={cn("border", styles.cardBorder, styles.cardBg)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("flex items-center gap-2 text-base", styles.titleColor)}>
                <MousePointer2 size={18} />
                Efeitos Hover
              </CardTitle>
              <CardDescription>Ativar animações ao passar o mouse sobre elementos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Efeitos de Hover</Label>
                  <p className="text-xs text-muted-foreground">
                    Animações visuais ao interagir com botões e menus
                  </p>
                </div>
                <Switch
                  checked={hoverEffectsEnabled}
                  onCheckedChange={setHoverEffectsEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className={cn("border", styles.cardBorder, styles.cardBg)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("flex items-center gap-2 text-base", styles.titleColor)}>
                Pré-visualização
              </CardTitle>
              <CardDescription>Veja como as configurações afetam os menus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "p-4 rounded-lg border",
                styles.tipBg,
                styles.tipBorder
              )}>
                {menuLayout === 'grid' ? (
                  <div className={cn(
                    "grid gap-2",
                    menuSize === 'large' ? 'grid-cols-3' : 'grid-cols-4'
                  )}>
                    {['Treinos', 'Perfil', 'Timer'].map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={hoverEffectsEnabled ? { scale: 1.05 } : undefined}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-lg border bg-card/50",
                          menuSize === 'large' ? 'gap-2' : 'gap-1'
                        )}
                      >
                        <div className={cn(
                          "rounded-full bg-primary/20 flex items-center justify-center",
                          menuSize === 'large' ? 'w-10 h-10' : 'w-8 h-8'
                        )}>
                          <LayoutGrid size={menuSize === 'large' ? 20 : 14} className="text-primary" />
                        </div>
                        <span className={cn(
                          "font-medium",
                          menuSize === 'large' ? 'text-xs' : 'text-[10px]'
                        )}>{item}</span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {['Treinos', 'Perfil', 'Timer'].map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={hoverEffectsEnabled ? { x: 4 } : undefined}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <LayoutGrid size={18} className="text-primary" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-sm">{item}</span>
                          <p className="text-xs text-muted-foreground">Descrição do item</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
