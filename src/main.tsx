// Arquivo: src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { registrarDeepLinks } from "./lib/native";
import "./index.css"; // <-- CORREÇÃO: Esta linha foi descomentada

registrarDeepLinks();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
