import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./components/auth/AuthPage";
import StudentDashboard from "./pages/student/Dashboard";
import ProfilePage from "./pages/student/Profile";
import ResumePage from "./pages/student/Resume";
import RecommendationsPage from "./pages/student/Recommendations";
import SkillReadinessPage from "./pages/student/SkillReadiness";
import AdminOverview from "./pages/admin/Overview";
import AdminJobs from "./pages/admin/Jobs";
import AdminStudents from "./pages/admin/Students";
import AdminPlacements from "./pages/admin/Placements";
import AdminAnalytics from "./pages/admin/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Student Routes */}
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/skill-readiness" element={<SkillReadinessPage />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/jobs" element={<AdminJobs />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/placements" element={<AdminPlacements />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
