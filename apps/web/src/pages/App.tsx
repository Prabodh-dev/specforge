import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shell } from "../components/Shell";
import Login from "./Login";
import Register from "./Register";
import Orgs from "./Orgs";
import Exports from "./Exports";
import Projects from "./Projects";
import Reviews from "./Reviews";
import ReviewDetail from "./ReviewDetail";
import ProjectWorkspace from "./ProjectWorkspace";

function Protected({ children }: { children: React.ReactNode }) {
  const { token, isBooting } = useAuth();

  if (isBooting) return <div style={{ padding: 16 }}>Booting...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/orgs" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/projects"
        element={
          <Protected>
            <Projects />
          </Protected>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <Protected>
            <ProjectWorkspace />
          </Protected>
        }
      />
      <Route
        path="/reviews"
        element={
          <Protected>
            <Reviews />
          </Protected>
        }
      />
      <Route
        path="/reviews/:reviewId"
        element={
          <Protected>
            <ReviewDetail />
          </Protected>
        }
      />
      <Route
        path="/exports"
        element={
          <Protected>
            <Exports />
          </Protected>
        }
      />
      <Route
        path="/orgs"
        element={
          <Protected>
            <Orgs />
          </Protected>
        }
      />

      <Route path="*" element={<div style={{ padding: 16 }}>404</div>} />
    </Routes>
  );
}
