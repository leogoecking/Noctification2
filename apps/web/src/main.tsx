import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerAppServiceWorker } from "./lib/pwa";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

void registerAppServiceWorker(
  typeof navigator === "undefined" ? undefined : navigator.serviceWorker,
  {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    isSecureContext: window.isSecureContext
  }
);
