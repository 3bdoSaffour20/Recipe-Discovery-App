/**
 * Recipes page - /recipes
 * Search by recipe name, filter by main ingredient, and show the latest meals
 * from TheMealDB when no query has been entered yet.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    var SEARCH_LABEL = 'Search for a recipe...';
    var INGREDIENT_LABEL = 'e.g. chicken_breast';

    function formMarkup() {
        return '' +
            '<div class="search-panel bg-gray-800/60 border border-gray-700 rounded-2xl shadow-xl p-6 sm:p-8 mb-10">' +
                '<form id="recipeSearchForm" class="w-full" novalidate>' +
                    '<label for="recipeSearchInput" class="block text-sm font-semibold text-gray-300 mb-2">Search recipes by name</label>' +
                    '<div class="flex flex-col sm:flex-row gap-3">' +
                        '<input type="text" id="recipeSearchInput" name="query" autocomplete="off" placeholder="' + SEARCH_LABEL + '" ' +
                            'class="flex-grow w-full px-4 py-3 text-base rounded-lg border-0 focus:ring-4 focus:ring-purple-500/50 focus:outline-none bg-white text-gray-900 placeholder-gray-500">' +
                        '<button type="submit" class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors duration-200 focus:ring-4 focus:ring-purple-500/50 focus:outline-none">' +
                            'Search' +
                        '</button>' +
                    '</div>' +
                '</form>' +
                '<div class="h-px bg-gray-700/60 my-6"></div>' +
                '<form id="ingredientFilterForm" class="w-full" novalidate>' +
                    '<label for="ingredientInput" class="block text-sm font-semibold text-gray-300 mb-2">Filter by main ingredient</label>' +
                    '<div class="flex flex-col sm:flex-row gap-3">' +
                        '<input type="text" id="ingredientInput" name="ingredient" list="ingredientOptions" autocomplete="off" placeholder="' + INGREDIENT_LABEL + '" ' +
                            'class="flex-grow w-full px-4 py-3 text-base rounded-lg border-0 focus:ring-4 focus:ring-blue-400/50 focus:outline-none bg-white text-gray-900 placeholder-gray-500">' +
                        '<datalist id="ingredientOptions"></datalist>' +
                        '<button type="submit" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 focus:ring-4 focus:ring-blue-400/50 focus:outline-none">' +
                            'Filter' +
                        '</button>' +
                    '</div>' +
                    '<p class="text-xs text-gray-500 mt-2">Type any TheMealDB ingredient, for example <span class="text-gray-400">chicken_breast</span>, <span class="text-gray-400">beef</span> or <span class="text-gray-400">pasta</span>.</p>' +
                '</form>' +
            '</div>';
    }

    function render(container) {
        container.innerHTML = '' +
            RD.components.breadcrumbs.create([{ label: 'Recipes' }]) +
            '<h1 class="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Explore Recipes</h1>' +
            '<p class="text-lg text-gray-300 mb-10 max-w-2xl">Discover delicious recipes and find your next favorite meal.</p>' +
            formMarkup() +
            '<div id="recipesResults"></div>';

        var searchForm = container.querySelector('#recipeSearchForm');
        var searchInput = container.querySelector('#recipeSearchInput');
        var ingredientForm = container.querySelector('#ingredientFilterForm');
        var ingredientInput = container.querySelector('#ingredientInput');

        searchForm.addEventListener('submit', function (event) {
            event.preventDefault();
            var query = searchInput.value.trim();

            if (!query) {
                searchInput.focus();
                return;
            }

            RD.router.go('/recipes/search/' + encodeURIComponent(query));
        });

        ingredientForm.addEventListener('submit', function (event) {
            event.preventDefault();
            var ingredient = ingredientInput.value.trim();

            if (!ingredient) {
                ingredientInput.focus();
                return;
            }

            RD.router.go('/recipes/ingredient/' + encodeURIComponent(ingredient));
        });

        RD.components.recipeResults.mount(container.querySelector('#recipesResults'), {
            title: 'Popular recipes',
            description: 'A hand-picked mix of meals from TheMealDB. Search above to narrow things down.',
            load: function () {
                return RD.api.getFeaturedMeals(24);
            }
        });

        loadIngredientSuggestions(container.querySelector('#ingredientOptions'));
    }

    /** Populates the ingredient datalist; failures are non fatal. */
    function loadIngredientSuggestions(datalist) {
        if (!datalist || datalist.childElementCount) {
            return;
        }

        RD.api.listIngredients()
            .then(function (ingredients) {
                datalist.innerHTML = ingredients
                    .slice(0, 500)
                    .map(function (name) {
                        return '<option value="' + RD.utils.escapeHtml(name) + '"></option>';
                    })
                    .join('');
            })
            .catch(function (error) {
                console.warn('Ingredient suggestions unavailable:', error);
            });
    }

    RD.pages = RD.pages || {};
    RD.pages.recipes = { render: render };
})(window);
