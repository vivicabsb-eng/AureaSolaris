import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { AppProviders } from "./app/AppProviders.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
