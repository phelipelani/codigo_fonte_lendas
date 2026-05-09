// Arquivo: src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css"; // <-- CORREÇÃO: Esta linha foi descomentada

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
