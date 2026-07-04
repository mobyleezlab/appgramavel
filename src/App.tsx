import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/lib/queries";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocationProvider } from "@/contexts/LocationContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { ReactionsProvider } from "@/contexts/ReactionsContext";
import { CouponsProvider } from "@/contexts/CouponsContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useScrollRestore } from "@/hooks/useScrollRestore";
import Feed from "./pages/Feed";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ErrorBoundary from "./components/ErrorBoundary";
import Privacidade from "./pages/Privacidade";

// ---- Lazy route loaders (exposed so we can prefetch them on idle / on hover) ----
const loadExplore = () => import("./pages/Explore");
const loadExploreCategory = () => import("./pages/ExploreCategory");
const loadCoupons = () => import("./pages/Coupons");
const loadRoteiros = () => import("./pages/Roteiros");
const loadRoteiroDetail = () => import("./pages/RoteiroDetail");

const loadRoteiroEditor = () => import("./pages/RoteiroEditor");
const loadEstablishment = () => import("./pages/Establishment");
const loadSavedPlaces = () => import("./pages/profile/SavedPlaces");
const loadCheckIns = () => import("./pages/profile/CheckIns");
const loadRoutesPage = () => import("./pages/profile/Routes");
const loadSettings = () => import("./pages/profile/Settings");
const loadUserCoupons = () => import("./pages/profile/UserCoupons");
const loadLogin = () => import("./pages/auth/Login");
const loadRegister = () => import("./pages/auth/Register");
const loadResetPassword = () => import("./pages/auth/ResetPassword");
const loadUpdatePassword = () => import("./pages/auth/UpdatePassword");
const loadEmailConfirmed = () => import("./pages/auth/EmailConfirmed");
const loadAdminApp = () => import("./admin/AdminApp");
const loadAdminRouter = () => import("./admin/AdminRouter");
const loadAdminLogin = () => import("./admin/pages/AdminLogin");

const Explore = lazy(loadExplore);
const ExploreCategory = lazy(loadExploreCategory);
const Coupons = lazy(loadCoupons);
const Roteiros = lazy(loadRoteiros);
const RoteiroDetail = lazy(loadRoteiroDetail);

const RoteiroEditor = lazy(loadRoteiroEditor);
const Establishment = lazy(loadEstablishment);
const SavedPlaces = lazy(loadSavedPlaces);
const CheckInsPage = lazy(loadCheckIns);
const RoutesPage = lazy(loadRoutesPage);
const Settings = lazy(loadSettings);
const UserCoupons = lazy(loadUserCoupons);
const Login = lazy(loadLogin);
const Register = lazy(loadRegister);
const ResetPassword = lazy(loadResetPassword);
const UpdatePassword = lazy(loadUpdatePassword);
const EmailConfirmed = lazy(loadEmailConfirmed);
const AdminApp = lazy(loadAdminApp);
const AdminRouter = lazy(loadAdminRouter);
const AdminLogin = lazy(loadAdminLogin);

const queryClient = createAppQueryClient();

function ScrollRestore() {
  useScrollRestore();
  return null;
}

// Native-feel: warm the router chunks in the background so tapping a nav item
// resolves the next screen instantly with no white Suspense flash.
function RoutePrefetcher() {
  useEffect(() => {
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => {
      // Fire-and-forget: browser caches the modules, no UI impact.
      [
        loadExplore,
        loadCoupons,
        loadRoteiros,
        loadSavedPlaces,
        loadCheckIns,
        loadRoutesPage,
        loadSettings,
        loadUserCoupons,
        loadRoteiroDetail,
        loadRoteiroEditor,
        loadEstablishment,
        loadExploreCategory,
      ].forEach((fn) => {
        try { fn(); } catch { /* ignore */ }
      });
    });
  }, []);
  return null;
}

// Minimal, non-blocking fallback: a thin top progress bar instead of a
// full-screen spinner. Keeps the previous screen visible while the tiny
// chunk finishes loading — same feel as a native app navigation.
function RouteFallback() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent overflow-hidden">
      <div className="h-full w-1/3 bg-gradient-primary animate-[progress_1.2s_ease-in-out_infinite]" />
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

// Fade the new page in briefly after every route change so transitions feel
// intentional rather than a hard swap.
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-[pageIn_180ms_ease-out]">
      {children}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LocationProvider>
          <FavoritesProvider>
            <ReactionsProvider>
              <CouponsProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter
                  future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
                >
                  <ScrollRestore />
                  <RoutePrefetcher />
                  <ErrorBoundary>
                    <Suspense fallback={<RouteFallback />}>
                      <PageTransition>
                        <Routes>
                          {/* Public auth routes */}
                          <Route path="/auth/login" element={<Login />} />
                          <Route path="/auth/register" element={<Register />} />
                          <Route path="/auth/reset-password" element={<ResetPassword />} />
                          <Route path="/auth/update-password" element={<UpdatePassword />} />
                          <Route path="/auth/confirm" element={<EmailConfirmed />} />
                          <Route path="/privacidade" element={<Privacidade />} />
                          <Route path="/auth/callback" element={<EmailConfirmed />} />
                          {/* Legacy auth route redirect */}
                          <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

                          {/* Admin Routes - Priority */}
                          <Route path="/admin/login" element={<AdminLogin />} />
                          <Route path="/admin" element={<AdminApp />}>
                            <Route index element={<AdminRouter />} />
                            <Route path="*" element={<AdminRouter />} />
                          </Route>

                          {/* Protected app routes */}
                          <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                          <Route path="/map" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
                          <Route path="/map/categoria/:category" element={<ProtectedRoute><ExploreCategory /></ProtectedRoute>} />
                          <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
                          <Route path="/roteiros" element={<ProtectedRoute><Roteiros /></ProtectedRoute>} />
                          <Route path="/roteiros/novo" element={<ProtectedRoute><RoteiroEditor /></ProtectedRoute>} />
                          <Route path="/roteiros/:id/editar" element={<ProtectedRoute><RoteiroEditor /></ProtectedRoute>} />
                          <Route path="/roteiros/:id" element={<ProtectedRoute><RoteiroDetail /></ProtectedRoute>} />
                          <Route path="/roteiros/:id/navegar" element={<Navigate to=".." replace />} />
                          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                          <Route path="/estabelecimento/:slug" element={<ProtectedRoute><Establishment /></ProtectedRoute>} />
                          <Route path="/perfil/favoritos" element={<ProtectedRoute><SavedPlaces /></ProtectedRoute>} />
                          <Route path="/perfil/lugares" element={<Navigate to="/perfil/favoritos" replace />} />
                          <Route path="/perfil/checkins" element={<ProtectedRoute><CheckInsPage /></ProtectedRoute>} />
                          <Route path="/perfil/roteiros" element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
                          <Route path="/perfil/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                          <Route path="/perfil/cupons" element={<ProtectedRoute><UserCoupons /></ProtectedRoute>} />
                          {/* Legacy badges redirect to checkins */}
                          <Route path="/perfil/badges" element={<Navigate to="/perfil/checkins" replace />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </PageTransition>
                    </Suspense>
                  </ErrorBoundary>
                </BrowserRouter>
              </CouponsProvider>
            </ReactionsProvider>
          </FavoritesProvider>
        </LocationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
