import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { 
  User, Scale, Droplets, Utensils, Dumbbell, 
  TrendingUp, QrCode, LogOut, Info,
  Calendar, Award, UserMinus, History, BarChart3, Trophy, Timer, UserPlus, Loader2
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useTheme } from '@/contexts/ThemeContext';
import MusicToggle from '@/components/MusicToggle';
import AppFooter from '@/components/AppFooter';
import AboutDialog from '@/components/AboutDialog';
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

import AnimatedLogo from '@/components/AnimatedLogo';
import PanelSwitcher from '@/components/PanelSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { ThemedMenuButton, ThemedHeader } from '@/components/themed';

import bgPanels from '@/assets/bg-panels.png';

// Lazy load heavy components
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
const PendingLinkRequests = lazy(() => import('@/components/client/PendingLinkRequests'));
const LinkedInstructorCard = lazy(() => import('@/components/client/LinkedInstructorCard'));
const FinancialAlerts = lazy(() => import('@/components/client/FinancialAlerts'));
const ProfileCompletionPrompt = lazy(() => import('@/components/ProfileCompletionPrompt'));
const RealtimeNotifications = lazy(() => import('@/components/client/RealtimeNotifications'));
const HydrationWidget = lazy(() => import('@/components/client/HydrationWidget'));
const WidgetRestoreButton = lazy(() => import('@/components/shared/WidgetRestoreButton'));

// Loading fallback
const ComponentLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, role, license, signOut, licenseExpired, isLicenseValid } = useAuth();
  const { playClickSound } = useAudio();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  // Widget visibility state
  const [hydrationVisible, setHydrationVisible] = useState(() => {
    return localStorage.getItem('widget_hydration_visible') !== 'false';
  });
  const [notificationsVisible, setNotificationsVisible] = useState(() => {
    return localStorage.getItem('widget_notifications_visible') !== 'false';
  });
  
  const showHydrationWidget = !location.pathname.includes('/hydration') && hydrationVisible;
  
  const handleHydrationVisibility = (visible: boolean) => {
    setHydrationVisible(visible);
    localStorage.setItem('widget_hydration_visible', String(visible));
  };
  
  const handleNotificationsVisibility = (visible: boolean) => {
    setNotificationsVisible(visible);
    localStorage.setItem('widget_notifications_visible', String(visible));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClickSound();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, playClickSound]);

  const isMaster = role === 'master';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (!isMaster && (licenseExpired || !isLicenseValid)) {
      navigate('/license-expired');
    }
  }, [user, licenseExpired, isLicenseValid, isMaster, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(true);
  };

  // Memoize menu items
  const menuItems = useMemo(() => [
    { icon: User, label: 'Meu Perfil', path: 'profile', color: 'text-blue-500' },
    { icon: Scale, label: 'Peso e Evolução', path: 'weight', color: 'text-green-500' },
    { icon: Droplets, label: 'Hidratação', path: 'hydration', color: 'text-cyan-500' },
    { icon: Utensils, label: 'Plano Alimentar', path: 'nutrition', color: 'text-orange-500' },
    { icon: Dumbbell, label: 'Meus Treinos', path: 'workouts', color: 'text-primary' },
    { icon: Timer, label: 'Timer de Treino', path: 'timer', color: 'text-rose-500' },
    { icon: Trophy, label: 'Recordes Pessoais', path: 'records', color: 'text-yellow-500' },
    { icon: BarChart3, label: 'Evolução & Histórico', path: 'evolution', color: 'text-emerald-500' },
    { icon: History, label: 'Histórico de Cargas', path: 'load-history', color: 'text-violet-500' },
    { icon: Calendar, label: 'Agenda', path: 'schedule', color: 'text-purple-500' },
    { icon: TrendingUp, label: 'Meu Progresso', path: 'progress', color: 'text-teal-500' },
    { icon: Award, label: 'Metas Alcançadas', path: 'achievements', color: 'text-amber-500' },
    { icon: QrCode, label: 'Meu QR Code', path: 'qrcode', color: 'text-pink-500' },
    { icon: UserPlus, label: 'Escanear Instrutor', path: 'scan-instructor', color: 'text-green-500' },
    { icon: UserMinus, label: 'Desvincular Instrutor', path: 'unlink', color: 'text-red-500' },
  ], []);

  return (
    <div
      className="min-h-screen min-h-[100dvh] relative"
      style={{
        backgroundImage: `url(${bgPanels})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/90" />

      <LicenseTimer />

      <div className="relative z-10 min-h-screen min-h-[100dvh] flex flex-col pb-14">
        <div className="h-14 sm:h-16" />
        
        <ThemedHeader>
          <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ProfileAvatar 
                  profileId={profile?.profile_id} 
                  fallbackName={profile?.full_name || profile?.username}
                  size="md"
                />
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg md:text-xl font-bebas text-primary tracking-wider truncate">
                    PAINEL CLIENTE
                  </h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {profile?.full_name || profile?.username || 'Cliente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <ThemeToggle />
                {isMaster && <PanelSwitcher />}
                {license && !isMaster && (
                  <span className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                    license.type === 'demo' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                    license.type === 'trial' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' :
                    'bg-green-500/20 text-green-500 border border-green-500/50'
                  }`}>
                    {license.type === 'demo' ? 'DEMO' : license.type === 'trial' ? 'TRIAL' : 'FULL'}
                  </span>
                )}
                <button
                  onClick={() => { playClickSound(); setAboutOpen(true); }}
                  className="p-1.5 sm:p-2 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-colors active:scale-95"
                >
                  <Info size={16} className="text-muted-foreground" />
                </button>
                <button
                  onClick={confirmLogout}
                  className="p-1.5 sm:p-2 rounded-lg bg-destructive/20 border border-destructive/50 hover:bg-destructive/30 transition-colors flex items-center gap-1 active:scale-95"
                >
                  <LogOut size={16} className="text-destructive" />
                  <span className="hidden sm:inline text-[10px] text-destructive font-medium">Sair</span>
                </button>
              </div>
            </div>
          </div>
        </ThemedHeader>

        <main className="flex-1 container mx-auto px-2 sm:px-4 py-3 sm:py-4 md:py-6">
          <Suspense fallback={<ComponentLoader />}>
            <Routes>
              <Route path="/" element={
                <div className="space-y-4">
                  <Suspense fallback={null}>
                    <FinancialAlerts />
                    <LinkedInstructorCard />
                    <PendingLinkRequests />
                  </Suspense>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                    {menuItems.map((item) => (
                      <ThemedMenuButton
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        color={item.color}
                        onClick={() => { playClickSound(); navigate(item.path); }}
                      />
                    ))}
                  </div>
                </div>
              } />
              <Route path="profile" element={<Profile />} />
              <Route path="weight" element={<WeightTracker />} />
              <Route path="hydration" element={<HydrationTracker />} />
              <Route path="nutrition" element={<NutritionPlan />} />
              <Route path="workouts" element={<SimpleWorkouts />} />
              <Route path="workouts/new" element={
                <CreateClientWorkout 
                  onBack={() => navigate('/client/workouts')} 
                  onSuccess={() => navigate('/client/workouts')} 
                />
              } />
              <Route path="evolution" element={<WorkoutHistory />} />
              <Route path="load-history" element={<ExerciseLoadHistory />} />
              <Route path="schedule" element={<ClientSchedule />} />
              <Route path="progress" element={<Progress />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="qrcode" element={<MyQRCode />} />
              <Route path="scan-instructor" element={<ScanInstructor />} />
              <Route path="unlink" element={<UnlinkInstructor />} />
              <Route path="records" element={<PersonalRecords />} />
              <Route path="timer" element={<WorkoutTimerPage />} />
              <Route path="pending-links" element={<PendingLinkRequests />} />
            </Routes>
          </Suspense>
        </main>

        <Suspense fallback={null}>
          <RealtimeNotifications 
            isVisible={notificationsVisible} 
            onVisibilityChange={handleNotificationsVisibility}
          />
          
          {profile && <ProfileCompletionPrompt />}
          
          <AnimatePresence>
            {showHydrationWidget && profile && (
              <HydrationWidget 
                isVisible={hydrationVisible}
                onVisibilityChange={handleHydrationVisibility}
              />
            )}
          </AnimatePresence>
          
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

      <AboutDialog isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />

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
