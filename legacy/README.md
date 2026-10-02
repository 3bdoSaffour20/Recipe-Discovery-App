# Recipe Discovery App

A static, dependency-free web app for exploring and discovering recipes from around the world, powered by the free [TheMealDB](https://www.themealdb.com/api.php) API.

## Features

- **Recipe search** - search by dish name, from the header or the Recipes page (Enter key works).
- **Category browsing** - categories are loaded dynamically from the API, never hard-coded.
- **Main ingredient filter** - filter meals by their main ingredient, with suggestions loaded from the API.
- **Recipe details** - quick-view modal on card click, plus a dedicated details page with breadcrumbs.
- **Multi-page navigation** - a lightweight hash router with breadcrumbs, working back/forward buttons and an active-page indicator in the footer.
- **Responsive** - desktop, tablet and mobile layouts with no horizontal scrolling.
- **Resilient states** - loading, empty and error states everywhere, with automatic retry on transient network failures.

## Technologies Used

- Frontend: HTML, CSS, JavaScript (vanilla, no build step)
- Styling: Tailwind CSS (CDN) + `style.css` custom theme
- Routing: `router.js` (lightweight hash router, ~120 lines)
- API: TheMealDB (`https://www.themealdb.com/api/json/v1/1/`)

## Running the project

No install or build step is required. Either open `index.html` directly, or serve the folder:

```bash
# any static server works, e.g.:
python -m http.server 8000
npx serve .
```

Then visit `http://localhost:8000`.

## Project structure

```
.
├── index.html            # App shell: header, page mount point, modal, footer
├── style.css             # Custom theme, animations and responsive rules
├── script.js             # Entry point: dark mode, header search, router bootstrap
├── app.js                # Route -> page controller, titles, active-link state
├── router.js             # Lightweight hash router
│
├── services/
│   └── mealDbApi.js      # All TheMealDB requests + centralised base URL
│
├── utils/
│   └── dom.js            # escaping/formatting helpers + in-memory meal store
│
├── components/           # Shared, reused UI
│   ├── icons.js          # Inline SVG icon set
│   ├── breadcrumbs.js    # Breadcrumb / page header
│   ├── states.js         # Loading, empty and error blocks
│   ├── recipeCard.js     # The single recipe card used by every grid
│   ├── categoryCard.js   # Category card
│   ├── recipeDetail.js   # Ingredients + instructions markup
│   ├── recipeResults.js  # Reusable results grid with async states
│   └── recipeModal.js    # Quick-view modal
│
├── pages/
│   ├── home.js
│   ├── recipes.js
│   ├── recipeResults.js  # Handles search / category / ingredient results
│   ├── categories.js
│   ├── about.js
│   ├── recipeDetails.js
│   └── notFound.js
│
├── Icons/                # beef, chicken, pasta, cake icons
├── Images/               # Category and hero backgrounds
└── Discover Recipes.png  # Logo
```

## Routes

Routing uses the URL hash, so the app runs from any path without server rewrite rules.

| Route                        | Page                                          |
| ---------------------------- | --------------------------------------------- |
| `#/`                         | Home                                          |
| `#/recipes`                  | Explore Recipes (search + ingredient filter)  |
| `#/recipes/search/<query>`   | Results for a recipe name                     |
| `#/recipes/category/<name>`  | Results for a category                        |
| `#/recipes/ingredient/<name>`| Results for a main ingredient                 |
| `#/recipe/<id>`              | Recipe details                                |
| `#/categories`               | Categories (loaded from the API)              |
| `#/about`                    | About Recipe Discovery                        |
| anything else                | 404 page                                      |

## API layer

All network calls live in `services/mealDbApi.js`, so components never call `fetch` directly.

```js
RD.api.getCategories();                 // categories.php
RD.api.searchMeals('chicken');          // search.php?s=chicken
RD.api.getMealsByCategory('Beef');      // filter.php?c=Beef
RD.api.getMealsByIngredient('chicken_breast'); // filter.php?i=chicken_breast
RD.api.getMealDetails('52772');         // lookup.php?i=52772
RD.api.getLatestMeals();                // latest.php
RD.api.getFeaturedMeals(24);            // default listing for /recipes
RD.api.listIngredients();               // list.php?i=list
```

Notes on the data source:

- TheMealDB has no `Cake` category - cakes are published under `Dessert`. The footer's friendly "Cake" link is mapped to the real category in `pages/recipeResults.js` (`CATEGORY_ALIASES`), so the page title stays "Cake Recipes" while the API request is `filter.php?c=Dessert`.
- `latest.php` returns a Patreon placeholder object for anonymous callers, so `getFeaturedMeals()` validates that response and falls back to a broad `search.php?f=` listing.
- Ingredient filtering matches TheMealDB's *main* ingredient, so use exact names from the ingredient list (`chicken_breast`, `spaghetti`, `brown_rice`) - the Recipes page provides these as autocomplete suggestions.

## Extending the app

- Add a page: create `pages/<name>.js` exposing `RD.pages.<name>.render(container, params, routeName)`, register it in the `PAGE_FOR_ROUTE` map in `app.js`, and add a script tag in `index.html`.
- Add a route: extend the `routes` array in `router.js`.
- Add an API call: add a function to `services/mealDbApi.js` and reuse it in the `load` callback of `RD.components.recipeResults.mount()`.

## Contribution

Contributions are welcome! If you have suggestions or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
