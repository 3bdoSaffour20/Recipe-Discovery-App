/**
 * Category card used by the Categories page and the home page.
 * Reuses the existing Icons/ assets as image fallbacks.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;
    var truncate = RD.utils.truncate;

    var ICON_FALLBACKS = {
        beef: 'Icons/beef.png',
        chicken: 'Icons/chicken.png',
        pasta: 'Icons/pasta.png',
        cake: 'Icons/cake.png',
        dessert: 'Icons/cake.png',
        lamb: 'Icons/beef.png',
        miscellaneous: 'Icons/pasta.png'
    };

    function fallbackFor(name) {
        return ICON_FALLBACKS[String(name || '').toLowerCase()] || 'Discover Recipes.png';
    }

    /**
     * @param {Object} category A record from categories.php.
     * @returns {string} Category card markup.
     */
    function createCategoryCard(category) {
        if (!category) {
            return '';
        }

        var name = category.strCategory || 'Category';
        var href = '#/recipes/category/' + encodeURIComponent(name);
        var image = category.strCategoryThumb
            ? escapeHtml(category.strCategoryThumb)
            : fallbackFor(name);
        var fallback = fallbackFor(name);
        var description = category.strCategoryDescription
            ? escapeHtml(truncate(category.strCategoryDescription, 130))
            : 'Explore every ' + escapeHtml(name).toLowerCase() + ' recipe from TheMealDB.';

        return '' +
            '<article class="category-card bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden group hover:border-purple-500 transition-all duration-300">' +
                '<div class="relative overflow-hidden">' +
                    '<img src="' + image + '" alt="' + escapeHtml(name) + ' category" loading="lazy" class="w-full h-44 object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.onerror=null;this.src=\'' + fallback + '\'">' +
                    '<div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>' +
                    '<h3 class="absolute bottom-4 left-5 text-2xl font-bold text-white">' + escapeHtml(name) + '</h3>' +
                '</div>' +
                '<div class="p-6 flex flex-col flex-1">' +
                    '<p class="text-gray-400 text-sm mb-6 line-clamp-3 flex-1">' + description + '</p>' +
                    '<a href="' + href + '" class="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-purple-500/20">' +
                        'View Recipes' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 5 7 7-7 7"></path>' +
                        '</svg>' +
                    '</a>' +
                '</div>' +
            '</article>';
    }

    RD.components = RD.components || {};
    RD.components.categoryCard = { create: createCategoryCard };
})(window);
