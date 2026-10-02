import { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Loading } from './components/Loading';
import { Navbar } from './components/Navbar';
import { FavoritesProvider } from './hooks/useFavorites';
import { useScrollToTop } from './hooks/useScrollToTop';

import Home from './pages/Home';

// Everything except the landing page is split out. The initial bundle then
// carries only the shell, the hero and the first list of recipes.
const Recipes = lazy(() => import('./pages/Recipes'));
const RecipeDetails = lazy(() => import('./pages/RecipeDetails'));
const Categories = lazy(() => import('./pages/Categories'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const About = lazy(() => import('./pages/About'));
const Favorites = lazy(() => import('./pages/Favorites'));
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * Application shell.
 *
 * Renders the persistent chrome (header, main, footer) plus the routed page.
 * The error boundary sits above the routes so a crash in one page still
 * leaves the navigation usable, and the lazy-route fallback means every route
 * change shows a loading state rather than a blank frame.
 */
export function App() {
  // A new route should start at the top of the page.
  useScrollToTop();

  const location = useLocation();

  // Keying on the path remounts the subtree on every navigation, which is what
  // lets the entry animation replay instead of only running on first paint.
  const routeKey = `${location.pathname}${location.search}`;

  return (
    <FavoritesProvider>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>

        <Navbar />

        <main className="main-content" id="main-content" tabIndex={-1}>
          <div className="container">
            <ErrorBoundary>
              <Suspense fallback={<Loading label="Loading page" />}>
                <div className="page-enter" key={routeKey}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/recipes" element={<Recipes />} />
                    <Route path="/recipe/:id" element={<RecipeDetails />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/about" element={<About />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>

        <Footer />
      </div>
    </FavoritesProvider>
  );
}

export default App;