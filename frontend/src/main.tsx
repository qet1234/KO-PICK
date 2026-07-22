import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@/app/globals.css";
import "@/app/home.css";
import "@/app/explore/explore.css";
import "@/app/couple/couple.css";
import "@/app/spaces/spaces.css";
import "@/app/account/account.css";
import "@/app/reservations/reservations.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
