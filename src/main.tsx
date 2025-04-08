import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.tsx";
import Home from "./Home.tsx";
import LogIn from "./LogIn.tsx";
import AllStyles from "./AllStyles.tsx";
import Library from "./Library.tsx";
import CreateAMoment from "./CreateMoment.tsx";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

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
