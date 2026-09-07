import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { installSafeStoragePolyfill } from "./lib/safeStorage";

// Safeguard against Safari Private Browsing DOMExceptions & storage restrictions
installSafeStoragePolyfill();

createRoot(document.getElementById("root")!).render(<App />);
