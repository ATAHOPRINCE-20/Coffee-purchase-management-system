  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import { SyncProvider } from "./app/contexts/SyncContext";
  import "./styles/index.css";
  import "./app/styles/receipt.css";
  import 'virtual:pwa-register';

  // Automatically handle Vite asset preload failures (often caused by new deployments changing asset hashes)
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("Vite preload error detected. Reloading page...");
    window.location.reload();
  });

  createRoot(document.getElementById("root")!).render(
    <SyncProvider>
      <App />
    </SyncProvider>
  );
  