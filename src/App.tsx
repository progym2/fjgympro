import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAutoNightMode } from "@/hooks/useAutoNightMode";
import { motion, AnimatePresence } from "framer-motion";
import { clearExpiredCache } from "@/hooks/useOfflineStorage";
import { initializeCache } from "@/hooks/useIndexedDBCache";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallBanner from "@/components/InstallBanner";
import { Loader2 } from "lucide-react";

// Lazy load heavy dashboard pages for faster initial load
const Home = lazy(() => import("./pages/Home"));
const Install = lazy(() => import("./pages/Install"));
const PanelSelector = lazy(() => import("./pages/PanelSelector"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LicenseExpired = lazy(() => import("./pages/LicenseExpired"));
const StudentLookup = lazy(() => import("./pages/StudentLookup"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1, // Reduce retries for faster feedback
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on every mount
    },
  },
});

// Clear expired cache on app start (localStorage + IndexedDB)
clearExpiredCache();
initializeCache();

// Component to handle auto night mode (night after 20h/8pm)
const NightModeHandler = () => {
  useAutoNightMode({ startHour: 20, endHour: 6, enabled: true });
  return null;
};

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Page transition disabled for faster navigation
const pageVariants = {
  initial: { opacity: 1 },
  in: { opacity: 1 },
  out: { opacity: 1 },
};

const pageTransition = {
  duration: 0,
};

// Animated Routes component with Suspense
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname.split('/')[1] || 'home'}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full min-h-screen"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/install" element={<Install />} />
            <Route path="/select-panel" element={<PanelSelector />} />
            <Route path="/consulta-aluno" element={<StudentLookup />} />
            <Route path="/client/*" element={<ClientDashboard />} />
            <Route path="/instructor/*" element={<InstructorDashboard />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/license-expired" element={<LicenseExpired />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <AudioProvider>
          <TooltipProvider>
            <NightModeHandler />
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <BrowserRouter>
              <InstallBanner />
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AudioProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
