import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { initDebugOptions } from "@/tracking/log/flag";
import "./index.css";

// Read the tracking-diagnostics flags before anything renders, so the
// per-frame recorder sees the right state on its very first frame and a
// ?debug=1 link works without a second reload.
initDebugOptions();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
