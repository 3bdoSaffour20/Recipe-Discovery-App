import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// Country flag artwork: SVG flags from the bundle, so a flag never depends on
// the operating system's emoji font. Must be imported before our own
// stylesheet, which overrides `.fi`'s width, height and text fallback.
import 'flag-icons/css/flag-icons.min.css';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root was not found in index.html.');
}

createRoot(container).render(
  <StrictMode>
    {/* `basename` follows Vite's `base`, so the app also works when it is
        deployed into a subdirectory such as a GitHub Pages project site. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);