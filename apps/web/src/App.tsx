import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { ChatPage } from "./pages/ChatPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ReportPage } from "./pages/ReportPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { StatsPage } from "./pages/StatsPage";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { useThemeStore, applyTheme } from "./lib/theme";
import { useAuthStore } from "./lib/auth";
import { AdminPage } from "./pages/AdminPage";
import { CatCompanion } from "./components/fun/CatCompanion";

function App() {
  const { theme } = useThemeStore();
  const { initialize } = useAuthStore();

  useEffect(() => {
    applyTheme(theme);
    initialize();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Footer />
      <CatCompanion />
    </div>
  );
}

export default App;
