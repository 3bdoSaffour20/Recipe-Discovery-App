/**
 * Recipe details markup. Shared by the quick-view modal and the dedicated
 * recipe details page so there is only one implementation.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;

    /** Collects strIngredient1..20 / strMeasure1..20 into a clean array. */
    function getIngredients(meal) {
        var ingredients = [];

        for (var i = 1; i <= 20; i += 1) {
            var ingredient = meal['strIngredient' + i];
            var measure = meal['strMeasure' + i];

            if (ingredient && String(ingredient).trim()) {
                ingredients.push({
                    ingredient: String(ingredient).trim(),
                    measure: measure ? String(measure).trim() : ''
                });
            }
        }

        return ingredients;
    }

    function tagList(meal) {
        if (!meal.strTags) {
            return '';
        }

        var tags = String(meal.strTags)
            .split(',')
            .map(function (tag) { return tag.trim(); })
            .filter(Boolean);

        if (!tags.length) {
            return '';
        }

        return tags.map(function (tag) {
            return '<span class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm">' + escapeHtml(tag) + '</span>';
        }).join('');
    }

    /** @returns {string} Full recipe detail markup. */
    function render(meal) {
        if (!meal) {
            return '';
        }

        var ingredients = getIngredients(meal);
        var instructions = String(meal.strInstructions || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n')
            .filter(function (line) { return line.trim(); });

        return '' +
            '<div class="grid md:grid-cols-2 gap-8 text-left">' +
                '<div>' +
                    '<img src="' + escapeHtml(meal.strMealThumb) + '" alt="' + escapeHtml(meal.strMeal) + '" class="w-full rounded-xl shadow-lg mb-6" onerror="this.onerror=null;this.src=\'' + RD.components.recipeCard.PLACEHOLDER_IMAGE + '\'">' +
                    '<div class="flex flex-wrap gap-2 mb-6">' +
                        (meal.strCategory ? '<span class="bg-primary text-white px-3 py-1 rounded-full text-sm">' + escapeHtml(meal.strCategory) + '</span>' : '') +
                        (meal.strArea ? '<span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm">' + escapeHtml(meal.strArea) + '</span>' : '') +
                        tagList(meal) +
                    '</div>' +
                    (meal.strYoutube ? (
                        '<a href="' + escapeHtml(meal.strYoutube) + '" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">' +
                            '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
                            '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>' +
                            '</svg> Watch Video' +
                        '</a>'
                    ) : '') +
                '</div>' +
                '<div>' +
                    '<h4 class="text-2xl font-bold mb-4">Ingredients</h4>' +
                    (ingredients.length ? (
                        '<ul class="space-y-2 mb-8">' +
                            ingredients.map(function (item) {
                                return '<li class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">' +
                                    '<span class="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>' +
                                    '<span class="font-medium text-primary">' + escapeHtml(item.measure) + '</span>' +
                                    '<span class="text-gray-700 dark:text-gray-200">' + escapeHtml(item.ingredient) + '</span>' +
                                '</li>';
                            }).join('') +
                        '</ul>'
                    ) : '<p class="text-gray-500 dark:text-gray-400 mb-8">No ingredient list available for this recipe.</p>') +
                    '<h4 class="text-2xl font-bold mb-4">Instructions</h4>' +
                    (instructions.length ? (
                        '<div class="space-y-4">' +
                            instructions.map(function (instruction, index) {
                                return '<div class="flex gap-4">' +
                                    '<span class="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">' + (index + 1) + '</span>' +
                                    '<p class="text-gray-700 dark:text-gray-300 leading-relaxed">' + escapeHtml(instruction) + '</p>' +
                                '</div>';
                            }).join('') +
                        '</div>'
                    ) : '<p class="text-gray-500 dark:text-gray-400">No instructions available for this recipe.</p>') +
                '</div>' +
            '</div>';
    }

    RD.components = RD.components || {};
    RD.components.recipeDetail = { render: render, getIngredients: getIngredients };
})(window);
