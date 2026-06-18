import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Header from "./components/layout/Header";
import AuthPage from "./pages/Auth";
import StudentDashboard from "./pages/student/Dashboard";
import ExerciseList from "./pages/student/ExerciseList";
import ExerciseDetail from "./pages/student/ExerciseDetail";
import Progress from "./pages/student/Progress";
import ProfilePage from "./pages/student/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminExercises from "./pages/admin/Exercises";
import AdminUsers from "./pages/admin/Users";
import AdminSymptoms from "./pages/admin/Symptoms";
import AdminDiagnoses from "./pages/admin/Diagnoses";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "STUDENT" | "ADMIN" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted text-sm">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-14">
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />

          <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute><ExerciseList /></ProtectedRoute>} />
          <Route path="/exercises/:id" element={<ProtectedRoute><ExerciseDetail /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/exercises" element={<ProtectedRoute role="ADMIN"><AdminExercises /></ProtectedRoute>} />
          <Route path="/admin/symptoms" element={<ProtectedRoute role="ADMIN"><AdminSymptoms /></ProtectedRoute>} />
          <Route path="/admin/diagnoses" element={<ProtectedRoute role="ADMIN"><AdminDiagnoses /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="ADMIN"><AdminUsers /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
