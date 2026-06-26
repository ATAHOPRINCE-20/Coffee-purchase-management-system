import { RouterProvider } from "react-router";
import { router } from "./routes";
import { useState, useEffect } from "react";
import "../styles/fonts.css";

import { AuthProvider } from "./hooks/useAuth";
import { QueryProvider } from "./lib/QueryProvider";
import { BetaDisclaimer } from "./components/BetaDisclaimer";
import { Toaster } from "./components/ui/sonner";

function App() {
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    // Delay non-critical UI to free up main thread for LCP
    const timer = setTimeout(() => setShowSecondary(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        {showSecondary && <BetaDisclaimer />}
        <RouterProvider router={router} />
        {showSecondary && <Toaster position="top-right" />}
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
