
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import { SyncProvider } from "./app/contexts/SyncContext";
  import "./styles/index.css";
  import "./app/styles/receipt.css";
  import 'virtual:pwa-register';

  createRoot(document.getElementById("root")!).render(
    <SyncProvider>
      <App />
    </SyncProvider>
  );
  