import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from 'aws-amplify/auth';

const ProtectedRoute = ({ element }: { element: JSX.Element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkUser();
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;

  return isAuthenticated ? element : <Navigate to="/login" />;
};

export default ProtectedRoute;
