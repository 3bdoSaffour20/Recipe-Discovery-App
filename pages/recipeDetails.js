/**
 * Recipe details page - #/recipe/<id>
 * Renders the same detail component used by the quick-view modal.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    function render(container, params) {
        var id = params.id || '';

        container.innerHTML = '' +
            RD.components.breadcrumbs.create([
                { label: 'Recipes', href: '#/recipes' },
                { label: 'Recipe Details' }
            ]) +
            '<div id="recipeDetailBody">' +
                RD.components.states.loading('Loading recipe...', 'Fetching the full ingredient list') +
            '</div>';

        var body = container.querySelector('#recipeDetailBody');
        var cached = RD.mealStore.get(id);

        function paint(meal) {
            body.innerHTML =
                '<h1 class="text-3xl sm:text-4xl font-extrabold mb-8 break-words">' + RD.utils.escapeHtml(meal.strMeal || 'Recipe') + '</h1>' +
                '<div class="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6 sm:p-8">' +
                    RD.components.recipeDetail.render(meal) +
                '</div>' +
                '<div class="mt-8 flex flex-wrap gap-4">' +
                    '<a href="#/recipes" class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors">Back to recipes</a>' +
                    (meal.strCategory
                        ? '<a href="#/recipes/category/' + encodeURIComponent(meal.strCategory) + '" class="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-lg transition-colors">More ' + RD.utils.escapeHtml(meal.strCategory) + '</a>'
                        : '') +
                '</div>';
        }

        if (cached) {
            paint(cached);
            return;
        }

        RD.api.getMealDetails(id)
            .then(function (meal) {
                if (!meal) {
                    body.innerHTML = RD.components.states.empty(
                        'Recipe not found.',
                        'That recipe does not exist or is no longer available.',
                        'Explore recipes',
                        '#/recipes'
                    );
                    return;
                }

                RD.mealStore.set(meal);
                paint(meal);
            })
            .catch(function (error) {
                console.error('Error loading recipe details:', error);
                body.innerHTML = RD.components.states.error(
                    'Unable to load this recipe.',
                    'Something went wrong while contacting TheMealDB.',
                    'Try Again'
                );

                var retry = body.querySelector('[data-retry]');
                if (retry) {
                    retry.addEventListener('click', function () {
                        render(container, params);
                    });
                }
            });
    }

    RD.pages = RD.pages || {};
    RD.pages.recipeDetails = { render: render };
})(window);
