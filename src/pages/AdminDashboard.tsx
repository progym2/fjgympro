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

import AnimatedLogo from '@/components/AnimatedLogo';
import PanelSwitcher from '@/components/PanelSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import ProfileAvatar from '@/components/shared/ProfileAvatar';
import { ThemedMenuButton, ThemedHeader } from '@/components/themed';

import bgPanels from '@/assets/bg-panels.png';

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

// Loading fallback for lazy components
const ComponentLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, role, license, signOut, licenseExpired, isLicenseValid } = useAuth();
  const { playClickSound } = useAudio();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const isMaster = role === 'master';

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

  // Memoize menu items to prevent recreation on every render
  const menuItems = useMemo(() => [
    { icon: UserPlus, label: 'Cadastrar Cliente', path: 'register-client', color: 'text-blue-500' },
    { icon: Dumbbell, label: 'Cadastrar Instrutor', path: 'register-instructor', color: 'text-green-500' },
    { icon: Users, label: 'Consultar Cadastros', path: 'list-users', color: 'text-purple-500' },
    { icon: DollarSign, label: 'Receber Mensalidade', path: 'receive-payment', color: 'text-emerald-500' },
    { icon: FileText, label: 'Gerar Carnês', path: 'payment-plans', color: 'text-cyan-500' },
    { icon: BarChart3, label: 'Dashboard Financeiro', path: 'dashboard', color: 'text-indigo-500' },
    { icon: CreditCard, label: 'Financeiro', path: 'finance', color: 'text-teal-500' },
    { icon: AlertTriangle, label: 'Inadimplentes', path: 'defaulters', color: 'text-red-500' },
    { icon: Bell, label: 'Enviar Alertas', path: 'alerts', color: 'text-pink-500' },
    { icon: QrCode, label: 'Leitor QR Code', path: 'qr-scanner', color: 'text-amber-500' },
    { icon: HardDrive, label: 'Backup & Sync', path: 'backup', color: 'text-slate-500' },
    { icon: Settings, label: 'Configurações', path: 'settings', color: 'text-gray-500' },
  ], []);

  const masterItems = useMemo(() => [
    { icon: Trash2, label: 'Lixeira', path: 'trash', color: 'text-red-500' },
    { icon: Activity, label: 'Logs de Acesso', path: 'access-logs', color: 'text-cyan-500' },
    { icon: Dumbbell, label: 'Ver Instrutores', path: 'view-instructors', color: 'text-green-500' },
    { icon: DollarSign, label: 'Financeiro Instrutores', path: 'instructor-finance', color: 'text-emerald-500' },
    { icon: Key, label: 'Senhas Trial', path: 'trial-passwords', color: 'text-cyan-500' },
    { icon: Key, label: 'Contas Pré-Geradas', path: 'pre-generated', color: 'text-yellow-500' },
    { icon: FlaskConical, label: 'Contas de Teste', path: 'test-accounts', color: 'text-orange-500' },
    { icon: Shield, label: 'Painel Master', path: 'master', color: 'text-primary' },
  ], []);

  const allMenuItems = useMemo(() => 
    isMaster ? [...menuItems, ...masterItems] : menuItems,
    [isMaster, menuItems, masterItems]
  );

  return (
    <div 
      className="min-h-screen min-h-[100dvh] relative" 
      style={{ 
        backgroundImage: `url(${bgPanels})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundAttachment: 'fixed' 
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/90" />
      <div className="relative z-10 min-h-screen min-h-[100dvh] flex flex-col pb-14 panel-scroll hide-scrollbar-mobile">
        <ThemedHeader className="sticky top-0">
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
                      PAINEL GERENTE
                    </h1>
                    <LicenseTimer />
                    {isMaster && (
                      <span className="px-1 py-0.5 bg-primary/20 text-primary text-[9px] sm:text-[10px] font-bold rounded-full border border-primary/50 whitespace-nowrap">
                        MASTER
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {profile?.full_name || profile?.username || 'Admin'}
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

        <main className="flex-1 container mx-auto px-2 sm:px-4 py-3 sm:py-4 md:py-6 momentum-scroll">
          <Suspense fallback={<ComponentLoader />}>
            <Routes>
              <Route path="/" element={
                <div className="space-y-4">
                  <Suspense fallback={null}>
                    <UserCPFSearch />
                  </Suspense>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
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
