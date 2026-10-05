import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/plus-jakarta-sans';
import App from './App';
import { CartProvider } from './context/CartContext';
import { loadRuntimeImageManifest } from './lib/imageManifest';
import './index.css';

// Pull metadata for admin-uploaded photos once at boot (non-blocking: bundled
// images already have their variants from the build-time manifest).
loadRuntimeImageManifest();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App />
      </CartProvider>
    </BrowserRouter>
  </StrictMode>
);
