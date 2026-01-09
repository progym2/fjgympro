import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Dumbbell, CreditCard, 
  FileText, Settings, Key, Bell, LogOut, 
  Info, Shield, BarChart3, QrCode,
  AlertTriangle, FlaskConical, DollarSign, Activity, Loader2, Trash2, HardDrive
} from 'lucide-react';

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

import PanelThemeSelector from '@/components/shared/PanelThemeSelector';
import MenuSizeToggle from '@/components/shared/MenuSizeToggle';
import LayoutModeToggle from '@/components/shared/LayoutModeToggle';
import ProfileAvatar from '@/components/shared/ProfileAvatar';
import { ThemedMenuButton, ThemedListItem, ThemedHeader } from '@/components/themed';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import FitnessLoadingScreen from '@/components/FitnessLoadingScreen';

import bgPanels from '@/assets/gym-bg-fire.jpeg';
import FireParticles from '@/components/FireParticles';

// Lazy load heavy components
const RegisterClient = lazy(() => import('@/components/admin/RegisterClient'));
const RegisterInstructor = lazy(() => import('@/components/admin/RegisterInstructor'));
const ListUsers = lazy(() => import('@/components/admin/ListUsers'));
const EditUser = lazy(() => import('@/components/admin/EditUser'));
const ClientDetails = lazy(() => import('@/components/admin/ClientDetails'));
const EnrollmentManager = lazy(() => import('@/components/admin/EnrollmentManager'));
const AdminFinance = lazy(() => import('@/components/admin/AdminFinance'));
const Defaulters = lazy(() => import('@/components/admin/Defaulters'));
const SendAlerts = lazy(() => import('@/components/admin/SendAlerts'));
const NotificationStats = lazy(() => import('@/components/admin/NotificationStats'));
const QRScanner = lazy(() => import('@/components/admin/QRScanner'));
const ViewInstructors = lazy(() => import('@/components/admin/ViewInstructors'));
const AdminSettings = lazy(() => import('@/components/admin/AdminSettings'));
const MasterTestAccounts = lazy(() => import('@/components/admin/MasterTestAccounts'));
const ReceivePayment = lazy(() => import('@/components/admin/ReceivePayment'));
const PaymentPlanManager = lazy(() => import('@/components/admin/PaymentPlanManager'));
const PaymentReports = lazy(() => import('@/components/admin/PaymentReports'));
const MasterPanel = lazy(() => import('@/components/admin/MasterPanel'));
const InstructorFinance = lazy(() => import('@/components/admin/InstructorFinance'));
const PreGeneratedAccounts = lazy(() => import('@/components/admin/PreGeneratedAccounts'));
const TrialPasswords = lazy(() => import('@/components/admin/TrialPasswords'));
const ProfileCompletionPrompt = lazy(() => import('@/components/ProfileCompletionPrompt'));
const UserCPFSearch = lazy(() => import('@/components/admin/UserCPFSearch'));
const AccessLogs = lazy(() => import('@/components/admin/AccessLogs'));
const TrashBin = lazy(() => import('@/components/admin/TrashBin'));
const FinanceDashboard = lazy(() => import('@/components/admin/FinanceDashboard'));
const BackupRestorePanel = lazy(() => import('@/components/shared/BackupRestorePanel'));

// Import loading skeletons
import PageLoadingSkeleton from '@/components/ui/loading-skeleton';

// Loading fallback with skeleton
const ComponentLoader = () => (
  <PageLoadingSkeleton type="dashboard" />
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, role, license, signOut, licenseExpired, isLicenseValid, isLoading: authLoading } = useAuth();
  const { playClickSound } = useAudio();
  const { isLoaded: bgLoaded } = useProgressiveImage(bgPanels);
  const { menuSize, menuLayout } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isMaster = role === 'master';

  // Ultra-fast initial loading
  useEffect(() => {
    if (!authLoading && profile) {
      const timer = setTimeout(() => setInitialLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, profile]);

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

  // Memoize menu items - Softer colors with descriptions
  const menuItems = useMemo(() => [
    { icon: UserPlus, label: 'Cadastrar Cliente', path: 'register-client', color: 'text-blue-400', description: 'Novo cliente no sistema' },
    { icon: Dumbbell, label: 'Cadastrar Instrutor', path: 'register-instructor', color: 'text-green-400', description: 'Novo instrutor' },
    { icon: Users, label: 'Consultar Cadastros', path: 'list-users', color: 'text-purple-400', description: 'Buscar usuários' },
    { icon: DollarSign, label: 'Receber Mensalidade', path: 'receive-payment', color: 'text-emerald-400', description: 'Registrar pagamentos' },
    { icon: FileText, label: 'Gerar Carnês', path: 'payment-plans', color: 'text-cyan-400', description: 'Criar carnês de pagamento' },
    { icon: BarChart3, label: 'Dashboard Financeiro', path: 'dashboard', color: 'text-indigo-400', description: 'Visão geral financeira' },
    { icon: CreditCard, label: 'Financeiro', path: 'finance', color: 'text-teal-400', description: 'Gerenciar finanças' },
    { icon: AlertTriangle, label: 'Inadimplentes', path: 'defaulters', color: 'text-red-400', description: 'Clientes em atraso' },
    { icon: Bell, label: 'Enviar Alertas', path: 'alerts', color: 'text-pink-400', description: 'Notificações aos clientes' },
    { icon: QrCode, label: 'Leitor QR Code', path: 'qr-scanner', color: 'text-amber-400', description: 'Escanear códigos' },
    { icon: HardDrive, label: 'Backup & Sync', path: 'backup', color: 'text-slate-400', description: 'Sincronização de dados' },
    { icon: Settings, label: 'Configurações', path: 'settings', color: 'text-gray-400', description: 'Configurações do sistema' },
  ], []);

  const masterItems = useMemo(() => [
    { icon: Trash2, label: 'Lixeira', path: 'trash', color: 'text-red-400', description: 'Itens excluídos' },
    { icon: Activity, label: 'Logs de Acesso', path: 'access-logs', color: 'text-cyan-400', description: 'Registros de acesso' },
    { icon: Dumbbell, label: 'Ver Instrutores', path: 'view-instructors', color: 'text-green-400', description: 'Lista de instrutores' },
    { icon: DollarSign, label: 'Financeiro Instrutores', path: 'instructor-finance', color: 'text-emerald-400', description: 'Pagamentos instrutores' },
    { icon: Key, label: 'Senhas Trial', path: 'trial-passwords', color: 'text-cyan-400', description: 'Gerenciar trials' },
    { icon: Key, label: 'Contas Pré-Geradas', path: 'pre-generated', color: 'text-yellow-400', description: 'Contas prontas' },
    { icon: FlaskConical, label: 'Contas de Teste', path: 'test-accounts', color: 'text-orange-400', description: 'Contas para testes' },
    { icon: Shield, label: 'Painel Master', path: 'master', color: 'text-primary/80', description: 'Controle total' },
  ], []);

  const allMenuItems = useMemo(() => 
    isMaster ? [...menuItems, ...masterItems] : menuItems,
    [isMaster, menuItems, masterItems]
  );

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
        <ThemedHeader className="sticky top-0">
          <div className="container mx-auto px-2 py-1.5 sm:py-2">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <ProfileAvatar 
                  profileId={profile?.profile_id} 
                  fallbackName={profile?.full_name || profile?.username}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h1 className="text-sm sm:text-base font-bebas text-primary tracking-wider truncate">
                      PAINEL GERENTE
                    </h1>
                    <LicenseTimer />
                    {isMaster && (
                      <span className="px-1 py-0.5 bg-primary/20 text-primary text-[8px] sm:text-[9px] font-bold rounded-full border border-primary/50 whitespace-nowrap">
                        MASTER
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                    {profile?.full_name || profile?.username || 'Admin'}
                  </p>
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
                  onClick={() => { playClickSound(); setAboutOpen(true); }} 
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

        <main className="flex-1 container mx-auto px-1 sm:px-3 py-1 sm:py-2 momentum-scroll">
          <Suspense fallback={<ComponentLoader />}>
            <Routes>
              <Route path="/" element={
                <div className="space-y-4">
                  <Suspense fallback={null}>
                    <UserCPFSearch />
                  </Suspense>
                  
                  {menuLayout === 'list' ? (
                    <div className="space-y-2 pb-4">
                      {allMenuItems.map((item) => (
                        <ThemedListItem
                          key={item.path}
                          icon={item.icon}
                          label={item.label}
                          description={item.description}
                          color={item.color}
                          onClick={() => { playClickSound(); navigate(item.path); }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      'grid pb-4',
                      menuSize === 'large'
                        ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3'
                        : 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-1.5 sm:gap-2'
                    )}>
                      {allMenuItems.map((item) => (
                        <ThemedMenuButton
                          key={item.path}
                          icon={item.icon}
                          label={item.label}
                          color={item.color}
                          onClick={() => { playClickSound(); navigate(item.path); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              } />
              <Route path="register-client" element={<RegisterClient />} />
              <Route path="register-instructor" element={<RegisterInstructor />} />
              <Route path="list-users" element={<ListUsers />} />
              <Route path="edit-user/:userId" element={<EditUser />} />
              <Route path="client/:clientId" element={<ClientDetails />} />
              <Route path="enrollment/:userId" element={<EnrollmentManager />} />
              <Route path="receive-payment" element={<ReceivePayment />} />
              <Route path="payment-plans" element={<PaymentPlanManager />} />
              <Route path="reports" element={<PaymentReports />} />
              <Route path="dashboard" element={<FinanceDashboard />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="defaulters" element={<Defaulters />} />
              <Route path="alerts" element={<SendAlerts />} />
              <Route path="alerts/stats" element={<NotificationStats />} />
              <Route path="qr-scanner" element={<QRScanner />} />
              <Route path="view-instructors" element={<ViewInstructors />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="test-accounts" element={<MasterTestAccounts />} />
              <Route path="pre-generated" element={<PreGeneratedAccounts />} />
              <Route path="trial-passwords" element={<TrialPasswords />} />
              <Route path="master" element={<MasterPanel />} />
              <Route path="access-logs" element={<AccessLogs />} />
              <Route path="trash" element={<TrashBin />} />
              <Route path="licenses" element={<PreGeneratedAccounts />} />
              <Route path="instructor-finance" element={<InstructorFinance />} />
              <Route path="backup" element={<BackupRestorePanel />} />
              <Route path="*" element={
                <div className="bg-card/80 backdrop-blur-md rounded-xl p-6 border border-border/50 text-center">
                  <p className="text-muted-foreground">Em desenvolvimento...</p>
                </div>
              } />
            </Routes>
          </Suspense>
        </main>

        <Suspense fallback={null}>
          {profile && <ProfileCompletionPrompt />}
        </Suspense>

        <MusicToggle />
        <div className="px-4"><AppFooter /></div>
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

export default AdminDashboard;
