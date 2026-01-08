import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Users, Dumbbell, Utensils, Calendar, 
  CreditCard, FileText, QrCode, LogOut, 
  Info, Bell, TrendingUp, UserPlus, ClipboardList, UserMinus, Library, History, CalendarDays, UserCog, Loader2, Camera, HardDrive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import MusicToggle from '@/components/MusicToggle';
import AppFooter from '@/components/AppFooter';
import AboutDialog from '@/components/AboutDialog';
import LicenseTimer from '@/components/LicenseTimer';
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

// Removed AnimatedLogo for performance
import PanelSwitcher from '@/components/PanelSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import InstructorSelector from '@/components/instructor/InstructorSelector';
import ProfileAvatar from '@/components/shared/ProfileAvatar';
import { ThemedMenuButton, ThemedHeader } from '@/components/themed';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

import bgPanels from '@/assets/bg-panels-optimized.webp';

// Lazy load heavy components
const MyStudents = lazy(() => import('@/components/instructor/MyStudents'));
const LinkStudent = lazy(() => import('@/components/instructor/LinkStudent'));
const UnlinkStudent = lazy(() => import('@/components/instructor/UnlinkStudent'));
const CreateWorkout = lazy(() => import('@/components/instructor/CreateWorkout'));
const StudentProgress = lazy(() => import('@/components/instructor/StudentProgress'));
const WorkoutPlans = lazy(() => import('@/components/instructor/WorkoutPlans'));
const MealPlans = lazy(() => import('@/components/instructor/MealPlans'));
const Schedule = lazy(() => import('@/components/instructor/Schedule'));
const Finance = lazy(() => import('@/components/instructor/Finance'));
const Notifications = lazy(() => import('@/components/instructor/Notifications'));
const Reports = lazy(() => import('@/components/instructor/Reports'));
const QRScanner = lazy(() => import('@/components/instructor/QRScanner'));
const InstructorQRCode = lazy(() => import('@/components/instructor/InstructorQRCode'));
const LinkHistory = lazy(() => import('@/components/instructor/LinkHistory'));
const ExerciseLibrary = lazy(() => import('@/components/instructor/ExerciseLibrary'));
const PendingStudents = lazy(() => import('@/components/instructor/PendingStudents'));
const StudentWorkoutCalendar = lazy(() => import('@/components/instructor/StudentWorkoutCalendar'));
const InstructorProfile = lazy(() => import('@/components/instructor/InstructorProfile'));
const StudentEvolutionGallery = lazy(() => import('@/components/instructor/StudentEvolutionGallery'));
const ProfileCompletionPrompt = lazy(() => import('@/components/ProfileCompletionPrompt'));
const RealtimeNotifications = lazy(() => import('@/components/client/RealtimeNotifications'));
const WidgetRestoreButton = lazy(() => import('@/components/shared/WidgetRestoreButton'));
const BackupRestorePanel = lazy(() => import('@/components/shared/BackupRestorePanel'));

// Import loading skeletons
import PageLoadingSkeleton from '@/components/ui/loading-skeleton';

// Loading fallback with skeleton
const ComponentLoader = () => (
  <PageLoadingSkeleton type="dashboard" />
);

const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, role, license, signOut, licenseExpired, isLicenseValid } = useAuth();
  const { playClickSound } = useAudio();
  const { isLoaded: bgLoaded } = useProgressiveImage(bgPanels);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [linkedStudentsCount, setLinkedStudentsCount] = useState(0);
  
  const [notificationsVisible, setNotificationsVisible] = useState(() => {
    return localStorage.getItem('widget_instructor_notifications_visible') !== 'false';
  });
  
  const handleNotificationsVisibility = (visible: boolean) => {
    setNotificationsVisible(visible);
    localStorage.setItem('widget_instructor_notifications_visible', String(visible));
  };

  // Fetch linked students count
  useEffect(() => {
    const fetchLinkedStudentsCount = async () => {
      if (!profile?.profile_id) return;
      
      try {
        const { count, error } = await supabase
          .from('instructor_clients')
          .select('*', { count: 'exact', head: true })
          .eq('instructor_id', profile.profile_id)
          .eq('link_status', 'accepted')
          .eq('is_active', true);
        
        if (!error && count !== null) {
          setLinkedStudentsCount(count);
        }
      } catch (err) {
        console.error('Error fetching students count:', err);
      }
    };
    
    fetchLinkedStudentsCount();
  }, [profile?.profile_id]);

  // ESC volta para a seleção de painel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.location.pathname === '/instructor') {
        playClickSound();
        navigate('/panel-selector');
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
    { icon: UserCog, label: 'Meu Perfil', path: 'profile', color: 'text-sky-500' },
    { icon: Users, label: 'Meus Alunos', path: 'students', color: 'text-blue-500' },
    { icon: UserPlus, label: 'Vincular Aluno', path: 'link-student', color: 'text-green-500' },
    { icon: UserMinus, label: 'Desvincular Aluno', path: 'unlink-student', color: 'text-red-500' },
    { icon: History, label: 'Histórico de Vínculos', path: 'link-history', color: 'text-slate-500' },
    { icon: Library, label: 'Biblioteca de Exercícios', path: 'exercises', color: 'text-teal-500' },
    { icon: Dumbbell, label: 'Criar Treinos', path: 'create-workout', color: 'text-primary' },
    { icon: ClipboardList, label: 'Planos de Treino', path: 'workout-plans', color: 'text-purple-500' },
    { icon: CalendarDays, label: 'Calendário Alunos', path: 'student-calendar', color: 'text-violet-500' },
    { icon: Utensils, label: 'Planos Alimentares', path: 'meal-plans', color: 'text-orange-500' },
    { icon: Calendar, label: 'Agenda', path: 'schedule', color: 'text-cyan-500' },
    { icon: TrendingUp, label: 'Progresso Alunos', path: 'progress', color: 'text-yellow-500' },
    { icon: Camera, label: 'Galeria Evolução', path: 'student-gallery', color: 'text-purple-500' },
    { icon: CreditCard, label: 'Financeiro', path: 'finance', color: 'text-emerald-500' },
    { icon: FileText, label: 'Relatórios', path: 'reports', color: 'text-indigo-500' },
    { icon: Bell, label: 'Notificações', path: 'notifications', color: 'text-pink-500' },
    { icon: QrCode, label: 'Meu QR Code', path: 'my-qrcode', color: 'text-lime-500' },
    { icon: QrCode, label: 'Leitor QR Code', path: 'qr-scanner', color: 'text-amber-500' },
    { icon: HardDrive, label: 'Backup & Sync', path: 'backup', color: 'text-slate-500' },
  ], []);

  return (
    <div className="h-[100dvh] relative overflow-hidden bg-background">
      {/* Progressive background */}
      <div 
        className="absolute inset-0 transition-all duration-500"
        style={{
          backgroundImage: `url(${bgPanels})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: bgLoaded ? 'none' : 'blur(10px)',
          transform: bgLoaded ? 'scale(1)' : 'scale(1.05)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/90" />

      <div className="relative z-10 h-full flex flex-col pb-14 pt-14 sm:pt-16 overflow-y-auto overflow-x-hidden overscroll-contain">
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
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-base sm:text-lg md:text-xl font-bebas text-primary tracking-wider truncate">
                      PAINEL INSTRUTOR
                    </h1>
                    <LicenseTimer />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {profile?.full_name || profile?.username || 'Instrutor'}
                    </p>
                    {linkedStudentsCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-green-500/20 text-green-500 border border-green-500/50">
                        <Users className="w-3 h-3" />
                        {linkedStudentsCount} {linkedStudentsCount === 1 ? 'aluno' : 'alunos'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <ThemeToggle />
                {isMaster && <InstructorSelector compact />}
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

        <main className="flex-1 container mx-auto px-2 sm:px-4 py-3 sm:py-4 md:py-6 momentum-scroll overflow-y-auto overscroll-contain">
          <Suspense fallback={<ComponentLoader />}>
            <Routes>
              <Route path="/" element={
                <div className="space-y-4">
                  {isMaster && <InstructorSelector />}
                  
                  <Suspense fallback={null}>
                    <PendingStudents />
                  </Suspense>
                  
                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
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
              <Route path="profile" element={<InstructorProfile />} />
              <Route path="students" element={<MyStudents />} />
              <Route path="link-student" element={<LinkStudent />} />
              <Route path="unlink-student" element={<UnlinkStudent />} />
              <Route path="link-history" element={<LinkHistory />} />
              <Route path="exercises" element={<ExerciseLibrary />} />
              <Route path="create-workout" element={<CreateWorkout />} />
              <Route path="progress" element={<StudentProgress />} />
              <Route path="workout-plans" element={<WorkoutPlans />} />
              <Route path="student-calendar" element={<StudentWorkoutCalendar />} />
              <Route path="student-gallery" element={<StudentEvolutionGallery />} />
              <Route path="meal-plans" element={<MealPlans />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="finance" element={<Finance />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="reports" element={<Reports />} />
              <Route path="qr-scanner" element={<QRScanner />} />
              <Route path="my-qrcode" element={<InstructorQRCode />} />
              <Route path="backup" element={<BackupRestorePanel />} />
            </Routes>
          </Suspense>
        </main>

        <Suspense fallback={null}>
          {profile && <ProfileCompletionPrompt />}

          <RealtimeNotifications 
            isVisible={notificationsVisible}
            onVisibilityChange={handleNotificationsVisibility}
          />
          
          <WidgetRestoreButton
            hydrationHidden={false}
            notificationsHidden={!notificationsVisible}
            onRestoreHydration={() => {}}
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

export default InstructorDashboard;
