import { RouterProvider } from "react-router";
import { router } from "./routes";
import "../styles/fonts.css";

import { AuthProvider } from "./hooks/useAuth";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}


export default App;
