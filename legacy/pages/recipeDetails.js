/**
 * Recipe details page - #/recipe/<id>
 * Renders the same detail component used by the quick-view modal.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;

    /**
     * Incremented on every render so a response that arrives after the user has
     * already moved on cannot paint a different recipe into the page.
     */
    var renderToken = 0;

    function render(container, params) {
        var id = params.id || '';
        var token = renderToken += 1;

        container.innerHTML = '' +
            RD.components.breadcrumbs.create([
                { label: 'Recipes', href: '#/recipes' },
                { label: 'Recipe Details' }
            ]) +
            '<div id="recipeDetailBody">' +
                RD.components.states.loading('Loading recipe...', 'Fetching the full ingredient list') +
            '</div>';

        var body = container.querySelector('#recipeDetailBody');

        if (!body) {
            return;
        }

        function paint(meal) {
            if (token !== renderToken) {
                return;
            }

            body.innerHTML =
                '<h1 class="text-3xl sm:text-4xl font-extrabold mb-8 break-words">' + escapeHtml(meal.strMeal || 'Recipe') + '</h1>' +
                '<div class="recipe-detail-surface bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6 sm:p-8">' +
                    RD.components.recipeDetail.render(meal) +
                '</div>' +
                '<div class="mt-8 flex flex-wrap gap-4">' +
                    '<a href="#/recipes" class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors">Back to recipes</a>' +
                    (meal.strCategory
                        ? '<a href="#/recipes/category/' + encodeURIComponent(meal.strCategory) + '" class="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-lg transition-colors">More ' + escapeHtml(meal.strCategory) + '</a>'
                        : '') +
                '</div>';
        }

        /**
         * Resolves the full record. Listing endpoints hand out summary meals
         * with no ingredients or instructions, so the store is asked for a
         * complete record and the loading state stays up until one arrives
         * instead of being replaced by a misleading empty state.
         */
        RD.mealStore.getDetails(id)
            .then(function (meal) {
                if (token !== renderToken) {
                    return;
                }

                if (!meal) {
                    body.innerHTML = RD.components.states.empty(
                        'Recipe not found.',
                        'That recipe does not exist or is no longer available.',
                        'Explore recipes',
                        '#/recipes'
                    );
                    return;
                }

                paint(meal);
            })
            .catch(function (error) {
                if (token !== renderToken) {
                    return;
                }

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
