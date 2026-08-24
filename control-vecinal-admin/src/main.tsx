import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import VecinalApp from "./VecinalApp";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VecinalApp />
  </StrictMode>,
);
