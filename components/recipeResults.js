/**
 * Reusable recipe results component.
 *
 * Renders the title block, loading state, result grid, empty state and error
 * state for any of the three discovery flows:
 *   - normal search      (searchMeals)
 *   - category filter    (getMealsByCategory)
 *   - ingredient filter  (getMealsByIngredient)
 *   - latest listing     (getLatestMeals)
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;
    var pluralize = RD.utils.pluralize;

    var requestToken = 0;

    function shell(options) {
        return '' +
            '<div class="results-heading flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-8">' +
                '<div class="min-w-0">' +
                    '<h2 class="text-2xl sm:text-3xl font-bold text-white break-words">' + escapeHtml(options.title) + '</h2>' +
                    (options.description
                        ? '<p class="text-gray-400 mt-2">' + escapeHtml(options.description) + '</p>'
                        : '') +
                '</div>' +
                '<div class="text-gray-500 dark:text-gray-400 shrink-0" data-results-count></div>' +
            '</div>' +
            '<div data-results-body></div>';
    }

    /**
     * @param {HTMLElement} container
     * @param {Object} options
     *   title       {string}  Heading text.
     *   description {string}  Optional supporting text.
     *   load        {Function} Async function returning an array of meals.
     *   emptyTitle  {string}  Optional custom empty heading.
     *   emptyHint   {string}  Optional custom empty hint.
     *   onResults   {Function} Optional callback with the loaded meals.
     */
    function mount(container, options) {
        if (!container) {
            return;
        }

        container.innerHTML = shell(options);

        var body = container.querySelector('[data-results-body]');
        var count = container.querySelector('[data-results-count]');
        var token = requestToken += 1;

        body.innerHTML = RD.components.states.loading(
            options.loadingLabel || 'Loading recipes...',
            options.loadingHint || 'Please wait while we find the best recipes for you'
        );
        count.textContent = '';

        function showResults(meals) {
            if (token !== requestToken) {
                return;
            }

            RD.mealStore.setMany(meals);

            if (!meals.length) {
                count.textContent = '';
                body.innerHTML = RD.components.states.empty(
                    options.emptyTitle || 'No recipes found.',
                    options.emptyHint || 'Try searching for another recipe or ingredient.',
                    'Explore all recipes',
                    '#/recipes'
                );
                return;
            }

            count.textContent = pluralize(meals.length, 'recipe') + ' found';
            body.innerHTML = '<div class="recipe-grid">' + meals.map(RD.components.recipeCard.create).join('') + '</div>';
        }

        function showError() {
            if (token !== requestToken) {
                return;
            }

            count.textContent = '';
            body.innerHTML = RD.components.states.error(
                'Unable to load recipes. Please try again.',
                'Something went wrong while contacting TheMealDB.',
                'Try Again'
            );

            var retry = body.querySelector('[data-retry]');
            if (retry) {
                retry.addEventListener('click', function () {
                    mount(container, options);
                });
            }
        }

        Promise.resolve()
            .then(options.load)
            .then(function (meals) {
                var list = Array.isArray(meals) ? meals : [];

                if (token === requestToken && typeof options.onResults === 'function') {
                    options.onResults(list);
                }

                showResults(list);
            })
            .catch(function (error) {
                console.error('Error loading recipes:', error);
                showError();
            });
    }

    RD.components = RD.components || {};
    RD.components.recipeResults = { mount: mount };
})(window);
