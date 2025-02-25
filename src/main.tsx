import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Library from "./Library.tsx";
import CreateAMoment from "./CreateMoment.tsx";
import TestUpload from "./TestUpload.tsx";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/testupload" />} />
        <Route path="/testupload" element={<TestUpload />} />
        <Route path="/library" element={<Library />} />
        <Route path="/createamoment" element={<CreateAMoment />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
