/**
 * Recipe results page - handles all three discovery flows.
 *   #/recipes/search/<query>
 *   #/recipes/category/<category>
 *   #/recipes/ingredient/<ingredient>
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var humanize = RD.utils.humanize;

    /**
     * TheMealDB has no "Cake" category - cakes are published under "Dessert".
     * The footer uses friendly labels, so those labels are mapped to the real
     * API category here. Unknown names are passed through untouched, and the
     * Categories page still builds its list dynamically from the API.
     */
    var CATEGORY_ALIASES = {
        cake: {
            apiCategory: 'Dessert',
            note: "Cakes are published by TheMealDB under its Dessert category, so that is what you are seeing here."
        },
        cakes: {
            apiCategory: 'Dessert',
            note: "Cakes are published by TheMealDB under its Dessert category, so that is what you are seeing here."
        }
    };

    function resolveCategory(value) {
        var alias = CATEGORY_ALIASES[String(value || '').toLowerCase()];

        return {
            label: value,
            apiCategory: alias ? alias.apiCategory : value,
            note: alias ? alias.note : ''
        };
    }

    function buildConfig(routeName, value) {
        if (routeName === 'category') {
            var category = resolveCategory(value);

            return {
                breadcrumb: category.label,
                title: category.label + ' Recipes',
                description: category.note ||
                    ('Every ' + String(category.label).toLowerCase() + ' recipe available on TheMealDB.'),
                load: function () {
                    return RD.api.getMealsByCategory(category.apiCategory);
                },
                emptyHint: 'No ' + String(category.label).toLowerCase() + ' recipes were found.'
            };
        }

        if (routeName === 'ingredient') {
            return {
                breadcrumb: humanize(value),
                title: 'Recipes with ' + humanize(value),
                description: 'Meals whose main ingredient matches "' + value + '".',
                load: function () {
                    return RD.api.getMealsByIngredient(value);
                },
                emptyHint: 'No recipes were found for that ingredient. Try another one.'
            };
        }

        return {
            breadcrumb: 'Search: ' + value,
            title: 'Results for "' + value + '"',
            description: 'Meals matching your search across TheMealDB.',
            load: function () {
                return RD.api.searchMeals(value);
            },
            emptyHint: 'Try searching for another recipe or ingredient.'
        };
    }

    function render(container, params, routeName) {
        var value = params.query || params.category || params.ingredient || '';
        var config = buildConfig(routeName, value);

        container.innerHTML = '' +
            RD.components.breadcrumbs.create([
                { label: 'Recipes', href: '#/recipes' },
                { label: config.breadcrumb }
            ]) +
            '<h1 class="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent break-words">' +
                RD.utils.escapeHtml(config.title) +
            '</h1>' +
            '<p class="text-lg text-gray-300 mb-10 max-w-2xl">' + RD.utils.escapeHtml(config.description) + '</p>' +
            '<div id="recipeResults"></div>';

        var results = container.querySelector('#recipeResults');

        if (!value) {
            results.innerHTML = RD.components.states.empty(
                'No search term provided.',
                'Try searching for a recipe name or ingredient.',
                'Go to recipes',
                '#/recipes'
            );
            return;
        }

        RD.components.recipeResults.mount(results, {
            title: config.title,
            description: '',
            load: config.load,
            emptyTitle: 'No recipes found.',
            emptyHint: config.emptyHint,
            loadingLabel: 'Loading recipes...',
            loadingHint: 'Fetching meals from TheMealDB'
        });
    }

    RD.pages = RD.pages || {};
    RD.pages.recipeResults = { render: render };
})(window);
