/**
 * Categories page - /categories
 * Loads the category list dynamically from TheMealDB categories.php.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    function render(container) {
        container.innerHTML = '' +
            RD.components.breadcrumbs.create([{ label: 'Categories' }]) +
            '<h1 class="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Browse Categories</h1>' +
            '<p class="text-lg text-gray-300 mb-10 max-w-2xl">Pick a category to explore the recipes TheMealDB has collected for it.</p>' +
            '<div id="categoriesBody"></div>';

        var body = container.querySelector('#categoriesBody');
        body.innerHTML = RD.components.states.loading('Loading categories...', 'Fetching the latest category list from TheMealDB');

        RD.api.getCategories()
            .then(function (categories) {
                if (!categories.length) {
                    body.innerHTML = RD.components.states.empty(
                        'No categories found.',
                        'TheMealDB did not return any categories.',
                        'Explore recipes',
                        '#/recipes'
                    );
                    return;
                }

                body.innerHTML = '<div class="category-grid">' +
                    categories.map(RD.components.categoryCard.create).join('') +
                '</div>';
            })
            .catch(function (error) {
                console.error('Error loading categories:', error);
                body.innerHTML = RD.components.states.error(
                    'Unable to load categories. Please try again.',
                    'Something went wrong while contacting TheMealDB.',
                    'Try Again'
                );

                var retry = body.querySelector('[data-retry]');
                if (retry) {
                    retry.addEventListener('click', function () {
                        render(container);
                    });
                }
            });
    }

    RD.pages = RD.pages || {};
    RD.pages.categories = { render: render };
})(window);
