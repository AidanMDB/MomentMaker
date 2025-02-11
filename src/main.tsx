import React from "react";
import ReactDOM from "react-dom/client";
import Library from "./Library.tsx";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Library />
  </React.StrictMode>
);
