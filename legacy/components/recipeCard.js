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
     * The origin of a meal, shown with its flag. `strArea` is the demonym
     * ("British") and is not present on every record, so `strCountry` is used
     * as the fallback name and for resolving the flag.
     *
     * @param {Object} meal TheMealDB meal record.
     * @returns {string} Origin markup, or '' when the origin is unknown.
     */
    function originMarkup(meal) {
        return RD.flags.markup(meal.strArea, meal.strCountry);
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
        var category = meal.strCategory ? escapeHtml(meal.strCategory) : '';
        var thumb = meal.strMealThumb
            ? escapeHtml(meal.strMealThumb)
            : PLACEHOLDER_IMAGE;

        var origin = originMarkup(meal);
        var flag = RD.flags.emoji(meal.strArea, meal.strCountry);

        var meta = origin
            ? '<div class="flex items-center gap-2 text-xs text-gray-500">' +
                (flag ? origin : RD.icons.globe('w-4 h-4 shrink-0') + ' ' + origin) +
            '</div>'
            : '<div class="text-xs text-gray-500">Recipe</div>';

        return '' +
            '<div class="recipe-card bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden cursor-pointer group hover:border-purple-500 transition-all duration-300" data-meal-id="' + escapeHtml(meal.idMeal) + '" onclick="RD.openRecipeModal(\'' + escapeHtml(meal.idMeal) + '\')">' +
                '<div class="relative overflow-hidden">' +
                    '<img src="' + thumb + '" alt="' + name + '" loading="lazy" class="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMAGE + '\'">' +
                    '<div class="absolute top-4 left-4">' +
                        (origin
                            ? '<span class="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">' + origin + '</span>'
                            : '') +
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
