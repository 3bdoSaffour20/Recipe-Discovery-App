/**
 * Recipe card - the single card component reused by every results view
 * (home, recipes, search, category and ingredient results).
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;
    var truncate = RD.utils.truncate;

    var PLACEHOLDER_IMAGE = 'https://www.themealdb.com/images/media/meals/1525876468.jpg';

    function badge(value, className) {
        if (!value) {
            return '';
        }
        return '<span class="' + className + '">' + escapeHtml(value) + '</span>';
    }

    /**
     * @param {Object} meal TheMealDB meal record.
     * @returns {string} Card markup.
     */
    function createRecipeCard(meal) {
        if (!meal) {
            return '';
        }

        RD.mealStore.set(meal);

        var name = escapeHtml(meal.strMeal || 'Untitled recipe');
        var area = meal.strArea ? escapeHtml(meal.strArea) : '';
        var category = meal.strCategory ? escapeHtml(meal.strCategory) : '';
        var thumb = meal.strMealThumb
            ? escapeHtml(meal.strMealThumb)
            : PLACEHOLDER_IMAGE;

        var meta = area
            ? '<div class="flex items-center gap-2 text-xs text-gray-500">' +
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935A9 9 0 0112 3a9 9 0 016 2.25m-6 3.75a3 3 0 11-6 0 3 3 0 016 0z"></path>' +
                '</svg>' + area + '</div>'
            : '<div class="text-xs text-gray-500">Recipe</div>';

        return '' +
            '<div class="recipe-card bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden cursor-pointer group hover:border-purple-500 transition-all duration-300" data-meal-id="' + escapeHtml(meal.idMeal) + '" onclick="RD.openRecipeModal(\'' + escapeHtml(meal.idMeal) + '\')">' +
                '<div class="relative overflow-hidden">' +
                    '<img src="' + thumb + '" alt="' + name + '" loading="lazy" class="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\'">' +
                    '<div class="absolute top-4 left-4">' +
                        badge(area, 'bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold') +
                    '</div>' +
                    '<div class="absolute top-4 right-4">' +
                        badge(category, 'bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg') +
                    '</div>' +
                '</div>' +
                '<div class="p-6">' +
                    '<h3 class="text-xl font-bold mb-3 line-clamp-2 text-white group-hover:text-purple-400 transition-colors">' + name + '</h3>' +
                    (meal.strInstructions
                        ? '<p class="text-gray-400 text-sm mb-6 line-clamp-3">' + escapeHtml(truncate(meal.strInstructions, 120)) + '</p>'
                        : '<p class="text-gray-400 text-sm mb-6 line-clamp-3">Tap the card to see the full recipe.</p>') +
                    '<div class="flex items-center justify-between gap-3">' +
                        meta +
                        '<button type="button" class="shrink-0 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md group-hover:shadow-purple-500/20" onclick="event.stopPropagation();RD.router.go(\'/recipe/' + escapeHtml(meal.idMeal) + '\')">' +
                            'View Recipe' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    RD.components = RD.components || {};
    RD.components.recipeCard = { create: createRecipeCard, PLACEHOLDER_IMAGE: PLACEHOLDER_IMAGE };
})(window);
