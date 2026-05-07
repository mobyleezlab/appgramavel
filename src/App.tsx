import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/lib/queries";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
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

// Lazy-loaded routes
const Explore = lazy(() => import("./pages/Explore"));
const ExploreCategory = lazy(() => import("./pages/ExploreCategory"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Roteiros = lazy(() => import("./pages/Roteiros"));
const RoteiroDetail = lazy(() => import("./pages/RoteiroDetail"));
const RoteiroNavigation = lazy(() => import("./pages/RoteiroNavigation"));
const RoteiroEditor = lazy(() => import("./pages/RoteiroEditor"));
const Establishment = lazy(() => import("./pages/Establishment"));
const SavedPlaces = lazy(() => import("./pages/profile/SavedPlaces"));
const CheckInsPage = lazy(() => import("./pages/profile/CheckIns"));
const RoutesPage = lazy(() => import("./pages/profile/Routes"));
const Settings = lazy(() => import("./pages/profile/Settings"));
const UserCoupons = lazy(() => import("./pages/profile/UserCoupons"));

// Auth pages
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/auth/UpdatePassword"));
const EmailConfirmed = lazy(() => import("./pages/auth/EmailConfirmed"));

// Admin
const AdminApp = lazy(() => import("./admin/AdminApp"));
const AdminRouter = lazy(() => import("./admin/AdminRouter"));
const AdminLogin = lazy(() => import("./admin/pages/AdminLogin"));

const queryClient = createAppQueryClient();

function ScrollRestore() {
  useScrollRestore();
  return null;
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
                <BrowserRouter>
                  <ScrollRestore />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public auth routes */}
                      <Route path="/auth/login" element={<Login />} />
                      <Route path="/auth/register" element={<Register />} />
                      <Route path="/auth/reset-password" element={<ResetPassword />} />
                      <Route path="/auth/update-password" element={<UpdatePassword />} />
                      <Route path="/auth/confirm" element={<EmailConfirmed />} />
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
                      <Route path="/roteiros/:id/navegar" element={<ProtectedRoute><RoteiroNavigation /></ProtectedRoute>} />
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
                  </Suspense>
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
