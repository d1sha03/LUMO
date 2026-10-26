import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LumoIntelligenceProvider } from "@/app/intelligenceStore";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LumoIntelligenceProvider>
      <App />
    </LumoIntelligenceProvider>
  </StrictMode>
);
