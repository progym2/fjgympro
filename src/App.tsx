import { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAutoNightMode } from "@/hooks/useAutoNightMode";
import { clearExpiredCache } from "@/hooks/useOfflineStorage";
import { initializeCache } from "@/hooks/useIndexedDBCache";
import { clearAllCaches as clearIndexedDBCaches } from "@/lib/indexedDB";
import { useOfflineDataPreloader } from "@/hooks/useOfflineDataPreloader";
import { useCacheSizeMonitor } from "@/hooks/useCacheSizeMonitor";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallBanner from "@/components/InstallBanner";
import VideoSplashScreen, { APP_VERSION } from "@/components/VideoSplashScreen";
import ThemeTransitionOverlay from "@/components/ThemeTransitionOverlay";
import { Loader2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";

// Lazy load heavy dashboard pages for faster initial load
const Home = lazy(() => import("./pages/Home"));
const Install = lazy(() => import("./pages/Install"));
const PanelSelector = lazy(() => import("./pages/PanelSelector"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LicenseExpired = lazy(() => import("./pages/LicenseExpired"));
const StudentLookup = lazy(() => import("./pages/StudentLookup"));
const AppSettings = lazy(() => import("./pages/AppSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // 15 minutes - reduce refetches
      gcTime: 1000 * 60 * 60 * 48, // 48 hours - keep cache longer
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      networkMode: 'offlineFirst',
      structuralSharing: true, // Optimize memory
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// Clear expired cache on app start
clearExpiredCache();
initializeCache();

// Component to handle auto night mode and offline preloading
const NightModeHandler = () => {
  useAutoNightMode({ startHour: 20, endHour: 6, enabled: true });
  return null;
};

// Component to preload data for offline use and monitor cache size
const OfflineDataLoader = () => {
  const { preloadAllData } = useOfflineDataPreloader();
  useCacheSizeMonitor(); // Monitor cache size and show notification if too large
  
  useEffect(() => {
    // Preload data after initial render
    const timer = setTimeout(() => {
      if (navigator.onLine) {
        preloadAllData();
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [preloadAllData]);
  
  return null;
};

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Routes with ultra-fast fade transition
const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <PageTransition>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/install" element={<Install />} />
          <Route path="/select-panel" element={<PanelSelector />} />
          <Route path="/consulta-aluno" element={<StudentLookup />} />
          <Route path="/client/*" element={<ClientDashboard />} />
          <Route path="/instructor/*" element={<InstructorDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/license-expired" element={<LicenseExpired />} />
          <Route path="/settings" element={<AppSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </Suspense>
  );
};

const App = () => {
  const [splashComplete, setSplashComplete] = useState(() => localStorage.getItem('splashShown') === APP_VERSION);

  // Se a versão mudou, limpamos caches (SW CacheStorage + IndexedDB + offline localStorage)
  // para evitar que o PWA sirva um vídeo/arquivos antigos.
  useEffect(() => {
    const shown = localStorage.getItem('splashShown');
    if (shown === APP_VERSION) return;

    const clearSystemCaches = async () => {
      try {
        // offline localStorage cache
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('francgympro_offline_')) {
            localStorage.removeItem(key);
          }
        }

        // IndexedDB cache (offline)
        await clearIndexedDBCaches();

        // Service Worker CacheStorage (PWA)
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((k) => caches.delete(k)));
        }

        // Tenta atualizar SW (sem desregistrar)
        if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
        }
      } catch (e) {
        console.warn('[Cache] Falha ao limpar caches:', e);
      }
    };

    clearSystemCaches();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <AudioProvider>
            <TooltipProvider>
              {/* Video Splash Screen */}
              {!splashComplete && (
                <VideoSplashScreen onComplete={() => setSplashComplete(true)} />
              )}
              
              {/* Main App - render after splash or immediately if splash shown */}
              {splashComplete && (
                <>
                  <NightModeHandler />
                  <OfflineDataLoader />
                  <ThemeTransitionOverlay />
                  <Toaster />
                  <Sonner />
                  <OfflineIndicator />
                  <BrowserRouter>
                    <InstallBanner />
                    <AppRoutes />
                  </BrowserRouter>
                </>
              )}
            </TooltipProvider>
          </AudioProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
