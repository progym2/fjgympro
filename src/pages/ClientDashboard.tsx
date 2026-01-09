import React, { useEffect, useState, useMemo, lazy, Suspense, useCallback, memo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Scale, Droplets, Utensils, Dumbbell, 
  TrendingUp, QrCode, LogOut, Info,
  Calendar, Award, UserMinus, History, BarChart3, Trophy, Timer, UserPlus, Loader2, Camera, HardDrive,
  Target, Zap, Flame, Heart
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import MusicToggle from '@/components/MusicToggle';
import AppFooter from '@/components/AppFooter';
import LicenseTimer from '@/components/LicenseTimer';
import ProfileAvatar from '@/components/shared/ProfileAvatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import PanelSwitcher from '@/components/PanelSwitcher';

import PanelThemeSelector from '@/components/shared/PanelThemeSelector';
import MenuSizeToggle from '@/components/shared/MenuSizeToggle';
import LayoutModeToggle from '@/components/shared/LayoutModeToggle';
import { ThemedMenuButton, ThemedListItem, ThemedHeader } from '@/components/themed';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import FitnessLoadingScreen from '@/components/FitnessLoadingScreen';

import bgPanels from '@/assets/gym-bg-fire.jpeg';
import FireParticles from '@/components/FireParticles';

// Lazy load ALL components - include AboutDialog
const AboutDialog = lazy(() => import('@/components/AboutDialog'));
const Profile = lazy(() => import('@/components/client/Profile'));
const WeightTracker = lazy(() => import('@/components/client/WeightTracker'));
const HydrationTracker = lazy(() => import('@/components/client/HydrationTracker'));
const NutritionPlan = lazy(() => import('@/components/client/NutritionPlan'));
const SimpleWorkouts = lazy(() => import('@/components/client/SimpleWorkouts'));
const CreateClientWorkout = lazy(() => import('@/components/client/CreateClientWorkout'));
const ClientSchedule = lazy(() => import('@/components/client/ClientSchedule'));
const Progress = lazy(() => import('@/components/client/Progress'));
const Achievements = lazy(() => import('@/components/client/Achievements'));
const MyQRCode = lazy(() => import('@/components/client/MyQRCode'));
const ScanInstructor = lazy(() => import('@/components/client/ScanInstructor'));
const UnlinkInstructor = lazy(() => import('@/components/client/UnlinkInstructor'));
const ExerciseLoadHistory = lazy(() => import('@/components/client/ExerciseLoadHistory'));
const WorkoutHistory = lazy(() => import('@/components/client/WorkoutHistory'));
const PersonalRecords = lazy(() => import('@/components/client/PersonalRecords'));
const WorkoutTimerPage = lazy(() => import('@/components/client/WorkoutTimerPage'));
const EvolutionGallery = lazy(() => import('@/components/client/EvolutionGallery'));
const PendingLinkRequests = lazy(() => import('@/components/client/PendingLinkRequests'));
const LinkedInstructorCard = lazy(() => import('@/components/client/LinkedInstructorCard'));
const LinkHistory = lazy(() => import('@/components/client/LinkHistory'));
const FinancialAlerts = lazy(() => import('@/components/client/FinancialAlerts'));
const ProfileCompletionPrompt = lazy(() => import('@/components/ProfileCompletionPrompt'));
const RealtimeNotifications = lazy(() => import('@/components/client/RealtimeNotifications'));
const HydrationWidget = lazy(() => import('@/components/client/HydrationWidget'));
const WidgetRestoreButton = lazy(() => import('@/components/shared/WidgetRestoreButton'));
const FloatingLinkRequests = lazy(() => import('@/components/client/FloatingLinkRequests'));
const BackupRestorePanel = lazy(() => import('@/components/shared/BackupRestorePanel'));
const SyncSettings = lazy(() => import('@/components/client/SyncSettings'));
const OfflineDownload = lazy(() => import('@/components/client/OfflineDownload'));

// Import loading skeletons
import PageLoadingSkeleton from '@/components/ui/loading-skeleton';

// Minimal loading fallback with skeleton
const ComponentLoader = memo(() => (
  <PageLoadingSkeleton type="dashboard" />
));
ComponentLoader.displayName = 'ComponentLoader';

// Menu items - Softer colors for better readability
const MENU_ITEMS = [
  // Core training features
  { icon: Dumbbell, label: 'Meus Treinos', path: 'workouts', color: 'text-primary/80', description: 'Visualize e execute seus treinos' },
  { icon: Timer, label: 'Timer de Treino', path: 'timer', color: 'text-rose-400', description: 'Cronômetro para seus exercícios' },
  { icon: Trophy, label: 'Recordes Pessoais', path: 'records', color: 'text-yellow-400', description: 'Seus melhores desempenhos' },
  { icon: Target, label: 'Meu Progresso', path: 'progress', color: 'text-teal-400', description: 'Acompanhe sua evolução' },
  
  // Body tracking
  { icon: Scale, label: 'Peso e Evolução', path: 'weight', color: 'text-green-400', description: 'Registre seu peso' },
  { icon: Droplets, label: 'Hidratação', path: 'hydration', color: 'text-cyan-400', description: 'Controle de água diário' },
  { icon: Utensils, label: 'Plano Alimentar', path: 'nutrition', color: 'text-orange-400', description: 'Sua dieta personalizada' },
  { icon: Camera, label: 'Galeria Evolução', path: 'gallery', color: 'text-purple-400', description: 'Fotos do seu progresso' },
  
  // History & Stats
  { icon: BarChart3, label: 'Evolução & Histórico', path: 'evolution', color: 'text-emerald-400', description: 'Histórico completo' },
  { icon: Flame, label: 'Histórico de Cargas', path: 'load-history', color: 'text-violet-400', description: 'Cargas utilizadas' },
  { icon: Award, label: 'Metas Alcançadas', path: 'achievements', color: 'text-amber-400', description: 'Suas conquistas' },
  { icon: Calendar, label: 'Agenda', path: 'schedule', color: 'text-purple-400', description: 'Calendário de treinos' },
  
  // Profile & Connections
  { icon: User, label: 'Meu Perfil', path: 'profile', color: 'text-blue-400', description: 'Dados pessoais' },
  { icon: QrCode, label: 'Meu QR Code', path: 'qrcode', color: 'text-pink-400', description: 'Seu código único' },
  { icon: UserPlus, label: 'Escanear Instrutor', path: 'scan-instructor', color: 'text-green-400', description: 'Vincular instrutor' },
  { icon: History, label: 'Histórico Vínculos', path: 'link-history', color: 'text-indigo-400', description: 'Histórico de conexões' },
  { icon: UserMinus, label: 'Desvincular', path: 'unlink', color: 'text-red-400', description: 'Remover vínculo' },
  
  // Offline & Sync
  { icon: HardDrive, label: 'Download Offline', path: 'offline-download', color: 'text-emerald-400', description: 'Baixar dados offline' },
  { icon: HardDrive, label: 'Backup & Sync', path: 'sync', color: 'text-slate-400', description: 'Sincronização de dados' },
] as const;

// Memoized menu grid - layout otimizado baseado no menuSize e menuLayout
const MenuGrid = memo(({ onNavigate }: { onNavigate: (path: string) => void }) => {
  const { menuSize, menuLayout } = useTheme();
  
  // Grid com menos colunas no modo "large" para ícones maiores
  const gridCols = menuSize === 'large'
    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
    : 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7';
  
  const gridGap = menuSize === 'large'
    ? 'gap-2 sm:gap-3'
    : 'gap-1.5 sm:gap-2';
  
  // List layout
  if (menuLayout === 'list') {
    return (
      <div className="space-y-2 pb-6">
        {MENU_ITEMS.map((item) => (
          <ThemedListItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            description={item.description}
            color={item.color}
            onClick={() => onNavigate(item.path)}
          />
        ))}
      </div>
    );
  }
  
  // Grid layout (default)
  return (
    <div className={cn(gridCols, gridGap, 'grid pb-6')}>
      {MENU_ITEMS.map((item) => (
        <ThemedMenuButton
          key={item.path}
          icon={item.icon}
          label={item.label}
          color={item.color}
          onClick={() => onNavigate(item.path)}
        />
      ))}
    </div>
  );
});
MenuGrid.displayName = 'MenuGrid';

// Home content - separated for better memoization
const HomeContent = memo(({ onNavigate }: { onNavigate: (path: string) => void }) => (
  <div className="space-y-5 pt-3 sm:pt-4">
    <Suspense fallback={null}>
      <FinancialAlerts />
      <LinkedInstructorCard />
      <PendingLinkRequests />
    </Suspense>
    <MenuGrid onNavigate={onNavigate} />
  </div>
));
HomeContent.displayName = 'HomeContent';

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, role, license, signOut, licenseExpired, isLicenseValid, isLoading: authLoading } = useAuth();
  const { playClickSound } = useAudio();
  const { isLoaded: bgLoaded } = useProgressiveImage(bgPanels);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Widget visibility state
  const [hydrationVisible, setHydrationVisible] = useState(() => {
    return localStorage.getItem('widget_hydration_visible') !== 'false';
  });
  const [notificationsVisible, setNotificationsVisible] = useState(() => {
    return localStorage.getItem('widget_notifications_visible') !== 'false';
  });
  
  const isOnHome = location.pathname === '/client';
  const showHydrationWidget = isOnHome && !location.pathname.includes('/hydration') && hydrationVisible;
  const isMaster = role === 'master';

  // Initial loading effect
  useEffect(() => {
    if (!authLoading && profile) {
      const timer = setTimeout(() => setInitialLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [authLoading, profile]);

  const handleHydrationVisibility = useCallback((visible: boolean) => {
    setHydrationVisible(visible);
    localStorage.setItem('widget_hydration_visible', String(visible));
  }, []);
  
  const handleNotificationsVisibility = useCallback((visible: boolean) => {
    setNotificationsVisible(visible);
    localStorage.setItem('widget_notifications_visible', String(visible));
  }, []);

  // ESC volta para a seleção de painel (apenas na home do cliente)
  useEffect(() => {
    if (!isOnHome) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClickSound();
        navigate('/panel-selector');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOnHome, navigate, playClickSound]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (!isMaster && (licenseExpired || !isLicenseValid)) {
      navigate('/license-expired');
    }
  }, [user, licenseExpired, isLicenseValid, isMaster, navigate]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const confirmLogout = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    playClickSound();
    navigate(path);
  }, [playClickSound, navigate]);

  const handleOpenAbout = useCallback(() => {
    playClickSound();
    setAboutOpen(true);
  }, [playClickSound]);

  const handleWorkoutBack = useCallback(() => navigate('/client/workouts'), [navigate]);

  // Show fitness loading screen during initial load
  if (initialLoading) {
    return <FitnessLoadingScreen message="Carregando painel..." />;
  }

  return (
    <div className="h-[100dvh] relative overflow-hidden bg-background">
      {/* Progressive background with fire theme */}
      <div 
        className="absolute inset-0 transition-all duration-500"
        style={{
          backgroundImage: `url(${bgPanels})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          filter: bgLoaded ? 'none' : 'blur(10px)',
          transform: bgLoaded ? 'scale(1)' : 'scale(1.05)',
        }}
      />
      {/* Subtle overlay - preserving original image colors */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-orange-950/10 via-transparent to-transparent" />
      {/* Fire particles effect */}
      <FireParticles count={20} />

      <div className="relative z-10 h-full flex flex-col pb-12 overflow-y-auto overflow-x-hidden overscroll-none">
        
        <ThemedHeader>
          <div className="container mx-auto px-2 py-1.5 sm:py-2">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <ProfileAvatar 
                  profileId={profile?.profile_id} 
                  fallbackName={profile?.full_name || profile?.username}
                  size="sm"
                />
                <div className="min-w-0 flex items-center gap-1.5">
                  <div>
                    <h1 className="text-sm sm:text-base font-bebas text-primary tracking-wider truncate">
                      PAINEL CLIENTE
                    </h1>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                      {profile?.full_name || profile?.username || 'Cliente'}
                    </p>
                  </div>
                  <LicenseTimer />
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <LayoutModeToggle />
                <MenuSizeToggle />
                <PanelThemeSelector />
                {isMaster && <PanelSwitcher />}
                {license && !isMaster && (
                  <span className={`hidden sm:inline-block px-1 py-0.5 text-[9px] font-medium rounded-full ${
                    license.type === 'demo' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                    license.type === 'trial' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' :
                    'bg-green-500/20 text-green-500 border border-green-500/50'
                  }`}>
                    {license.type === 'demo' ? 'DEMO' : license.type === 'trial' ? 'TRIAL' : 'FULL'}
                  </span>
                )}
                <button
                  onClick={handleOpenAbout}
                  className="p-1 sm:p-1.5 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors active:scale-95"
                >
                  <Info size={14} className="text-muted-foreground" />
                </button>
                <button
                  onClick={confirmLogout}
                  className="p-1 sm:p-1.5 rounded-lg bg-destructive/20 border border-destructive/50 hover:bg-destructive/30 transition-colors flex items-center gap-0.5 active:scale-95"
                >
                  <LogOut size={14} className="text-destructive" />
                  <span className="hidden sm:inline text-[9px] text-destructive font-medium">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </ThemedHeader>

        <main className="flex-1 container mx-auto px-1 sm:px-3 pt-4 sm:pt-5 pb-2 momentum-scroll">
          <Suspense fallback={<ComponentLoader />}>
            <Routes>
              <Route path="/" element={<HomeContent onNavigate={handleNavigate} />} />
              <Route path="profile" element={<Profile />} />
              <Route path="weight" element={<WeightTracker />} />
              <Route path="hydration" element={<HydrationTracker />} />
              <Route path="nutrition" element={<NutritionPlan />} />
              <Route path="workouts" element={<SimpleWorkouts />} />
              <Route path="workouts/new" element={
                <CreateClientWorkout 
                  onBack={handleWorkoutBack} 
                  onSuccess={handleWorkoutBack} 
                />
              } />
              <Route path="evolution" element={<WorkoutHistory />} />
              <Route path="load-history" element={<ExerciseLoadHistory />} />
              <Route path="schedule" element={<ClientSchedule />} />
              <Route path="progress" element={<Progress />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="gallery" element={<EvolutionGallery />} />
              <Route path="qrcode" element={<MyQRCode />} />
              <Route path="scan-instructor" element={<ScanInstructor />} />
              <Route path="unlink" element={<UnlinkInstructor />} />
              <Route path="records" element={<PersonalRecords />} />
              <Route path="timer" element={<WorkoutTimerPage />} />
              <Route path="pending-links" element={<PendingLinkRequests />} />
              <Route path="link-history" element={<LinkHistory />} />
              <Route path="backup" element={<BackupRestorePanel />} />
              <Route path="sync" element={<SyncSettings />} />
              <Route path="offline-download" element={<OfflineDownload />} />
            </Routes>
          </Suspense>
        </main>

        {/* Widgets */}
        <Suspense fallback={null}>
          {/* Floating Link Requests - visible on ALL pages */}
          <FloatingLinkRequests />
          
          <RealtimeNotifications 
            isVisible={notificationsVisible} 
            onVisibilityChange={handleNotificationsVisibility}
          />
          
          {profile && <ProfileCompletionPrompt />}
          
          {showHydrationWidget && profile && (
            <HydrationWidget 
              isVisible={hydrationVisible}
              onVisibilityChange={handleHydrationVisibility}
            />
          )}
          
          <WidgetRestoreButton
            hydrationHidden={!hydrationVisible}
            notificationsHidden={!notificationsVisible}
            onRestoreHydration={() => handleHydrationVisibility(true)}
            onRestoreNotifications={() => handleNotificationsVisibility(true)}
          />
        </Suspense>
        
        <MusicToggle />
        <div className="px-4">
          <AppFooter />
        </div>
      </div>

      {aboutOpen && (
        <Suspense fallback={null}>
          <AboutDialog isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
        </Suspense>
      )}

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut size={20} className="text-destructive" />
              Sair do Sistema
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLogout}
            >
              Sim, Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientDashboard;
