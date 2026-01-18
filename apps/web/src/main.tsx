import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./App.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { OrgProvider } from "./context/OrgContext";

const root = document.getElementById("root");
if (root) {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <OrgProvider>
              <App />
            </OrgProvider>
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>,
    );
  } catch (error) {
    console.error("Render error:", error);
    root.innerHTML = `<div style="padding: 40px; background: #05060e; color: #ff6b6b; min-height: 100vh; font-family: system-ui;"><h1>Error</h1><pre>${error}</pre></div>`;
  }
} else {
  console.error("Root element not found!");
}
