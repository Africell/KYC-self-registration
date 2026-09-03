import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "../src/assets/i18n";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

if (!SITE_KEY) {
  console.warn(
    "⚠ VITE_TURNSTILE_SITE_KEY is not set. Cloudflare Turnstile will not work.\n" +
    "Add it to your .env file"
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);