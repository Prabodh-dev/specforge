import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Shell } from "./components/Shell";
import Welcome from "./pages/Welcome";
import Reviews from "./pages/Reviews";
import ReviewDetail from "./pages/ReviewDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Orgs from "./pages/Orgs";
import Projects from "./pages/Projects";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Exports from "./pages/Exports";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "24px",
            color: "var(--danger)",
            backgroundColor: "var(--bg)",
            fontFamily: "system-ui",
            whiteSpace: "pre-wrap",
          }}
        >
          <h2>Error Loading App</h2>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function Protected({ children }: { children: JSX.Element }) {
  const { token, isBooting } = useAuth();

  if (isBooting)
    return (
      <div
        style={{
          padding: 16,
          fontSize: 18,
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        Loading...
      </div>
    );
  if (!token) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/reviews"
          element={
            <Protected>
              <Reviews />
            </Protected>
          }
        />
        <Route
          path="/reviews/:id"
          element={
            <Protected>
              <ReviewDetail />
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
          path="/exports"
          element={
            <Protected>
              <Exports />
            </Protected>
          }
        />
        <Route path="*" element={<div style={{ padding: 16 }}>404</div>} />
      </Routes>
    </ErrorBoundary>
  );
}
