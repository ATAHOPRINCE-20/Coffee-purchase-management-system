import { RouterProvider } from "react-router";
import { router } from "./routes";
import "../styles/fonts.css";

import { AuthProvider } from "./hooks/useAuth";
import { QueryProvider } from "./lib/QueryProvider";
import { BetaDisclaimer } from "./components/BetaDisclaimer";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BetaDisclaimer />
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryProvider>
  );
}


export default App;
