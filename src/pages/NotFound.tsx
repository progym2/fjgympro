import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  useEffect(() => {
    console.warn("Redirecting from non-existent route:", location.pathname);
    
    // Auto-redirect based on auth status
    const timer = setTimeout(() => {
      if (profile && role) {
        // Redirect to appropriate dashboard
        switch (role) {
          case 'client':
            navigate('/client', { replace: true });
            break;
          case 'instructor':
            navigate('/instructor', { replace: true });
            break;
          case 'admin':
          case 'master':
            navigate('/admin', { replace: true });
            break;
          default:
            navigate('/select-panel', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    }, 100); // Quick redirect

    return () => clearTimeout(timer);
  }, [location.pathname, profile, role, navigate]);

  // Show nothing during redirect (instant transition)
  return null;
};

export default NotFound;
