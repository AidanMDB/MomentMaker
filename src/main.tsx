import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home.tsx";
import LogIn from "./LogIn.tsx";
import AllStyles from "./AllStyles.tsx";
import Library from "./Library.tsx";
import CreateAMoment from "./CreateMoment.tsx";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { getCurrentUser } from 'aws-amplify/auth';

Amplify.configure(outputs);

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


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/all" element={<ProtectedRoute element={<AllStyles />} />} />
        <Route path="/library" element={<ProtectedRoute element={<Library />} />} />
        <Route path="/createamoment" element={<ProtectedRoute element={<CreateAMoment />} />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
