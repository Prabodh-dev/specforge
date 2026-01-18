import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Login from "./Login";
import Register from "./Register";
import Orgs from "./Orgs";
import Exports from "./pages/Exports";

function Protected({ children }: { children: JSX.Element }) {
  const { token, isBooting } = useAuth();

  if (isBooting) return <div style={{ padding: 16 }}>Booting...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/orgs" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
