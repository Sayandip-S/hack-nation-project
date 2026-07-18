import { Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./lib/store";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { welcomed, user, onboarded } = useStore();

  return (
    <Routes>
      <Route
        path="/welcome"
        element={welcomed ? <Navigate to={user ? (onboarded ? "/" : "/onboarding") : "/auth"} /> : <Welcome />}
      />
      <Route
        path="/auth"
        element={
          !welcomed ? <Navigate to="/welcome" />
            : user ? <Navigate to={onboarded ? "/" : "/onboarding"} />
              : <Auth />
        }
      />
      <Route
        path="/onboarding"
        element={
          !welcomed ? <Navigate to="/welcome" />
            : !user ? <Navigate to="/auth" />
              : onboarded ? <Navigate to="/" />
                : <Onboarding />
        }
      />
      <Route
        path="/"
        element={
          !welcomed ? <Navigate to="/welcome" />
            : !user ? <Navigate to="/auth" />
              : !onboarded ? <Navigate to="/onboarding" />
                : <Dashboard />
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
