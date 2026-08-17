import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { AppProviders } from "./app/AppProviders.tsx";
import { AuthProvider } from "./auth/AuthProvider.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </AuthProvider>
  </React.StrictMode>,
);
