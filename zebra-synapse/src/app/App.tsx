import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "../auth/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { router } from "./routes";

export default function App() {
  return (
    <ErrorBoundary fullPage>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </ErrorBoundary>
  );
}
