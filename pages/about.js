/**
 * About page - /about
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var icons = RD.icons;

    var CAPABILITIES = [
        {
            icon: 'search',
            title: 'Search for recipes',
            text: 'Type a dish name and get matching meals instantly, from quick breakfasts to slow Sunday roasts.'
        },
        {
            icon: 'tag',
            title: 'Browse recipes by category',
            text: 'Move through Beef, Chicken, Pasta, Cake and every other category TheMealDB tracks.'
        },
        {
            icon: 'bowl',
            title: 'Explore recipes by ingredients',
            text: 'Already have something in the fridge? Filter meals by their main ingredient.'
        },
        {
            icon: 'book',
            title: 'View recipe details',
            text: 'Open any card to see the full ingredient list, measured steps and a video when available.'
        },
        {
            icon: 'globe',
            title: 'Discover meals from different cuisines',
            text: 'Explore dishes from around the world, each with its area and traditional category.'
        },
        {
            icon: 'sparkles',
            title: 'Find your next favorite',
            text: 'Keep exploring until something lands on your table tonight.'
        }
    ];

    function capabilityCards() {
        return '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' +
            CAPABILITIES.map(function (item) {
                return '<div class="about-card bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:border-purple-500 hover:-translate-y-1">' +
                    '<div class="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-4">' +
                        icons[item.icon]('w-6 h-6') +
                    '</div>' +
                    '<h3 class="text-lg font-bold text-white mb-2">' + RD.utils.escapeHtml(item.title) + '</h3>' +
                    '<p class="text-gray-400 text-sm leading-relaxed">' + RD.utils.escapeHtml(item.text) + '</p>' +
                '</div>';
            }).join('') +
        '</div>';
    }

    function render(container) {
        container.innerHTML = '' +
            RD.components.breadcrumbs.create([{ label: 'About' }]) +

            '<section class="about-hero relative text-center py-16 sm:py-20 rounded-3xl overflow-hidden mb-12 bg-cover bg-center" style="background-image: url(\'Images/Backgound.jpg\');">' +
                '<div class="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-gray-900/95"></div>' +
                '<div class="relative z-10 max-w-3xl mx-auto px-4">' +
                    '<img src="Discover Recipes.png" alt="Recipe Discovery Logo" class="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 object-cover rounded-2xl shadow-2xl border border-white/10">' +
                    '<h1 class="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">About Recipe Discovery</h1>' +
                    '<p class="text-lg sm:text-xl text-gray-200 leading-relaxed">Recipe Discovery helps you discover delicious meals and recipes from around the world.</p>' +
                '</div>' +
            '</section>' +

            '<section class="mb-14">' +
                '<h2 class="text-2xl sm:text-3xl font-bold mb-4 text-white">About Us</h2>' +
                '<div class="about-card bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6 sm:p-8">' +
                    '<p class="text-gray-300 leading-relaxed mb-4">' +
                        'Recipe Discovery is a place to search, discover, browse and explore recipes from every corner of the world. Every dish is powered by TheMealDB, a free open recipe database, so you always get real recipes with real ingredients instead of filler content.' +
                    '</p>' +
                    '<p class="text-gray-300 leading-relaxed">' +
                        'Whether you know exactly what you want to cook, you only have three ingredients in the fridge, or you simply want to browse for inspiration, Recipe Discovery keeps the path from idea to plate short and simple.' +
                    '</p>' +
                '</div>' +
            '</section>' +

            '<section class="mb-14">' +
                '<h2 class="text-2xl sm:text-3xl font-bold mb-6 text-white">What You Can Do</h2>' +
                capabilityCards() +
            '</section>' +

            '<section class="mb-14">' +
                '<h2 class="text-2xl sm:text-3xl font-bold mb-4 text-white">Our Purpose</h2>' +
                '<div class="about-card bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl shadow-xl p-6 sm:p-8">' +
                    '<p class="text-gray-200 leading-relaxed mb-4">' +
                        'Our purpose is to make discovering recipes simple and enjoyable. Cooking should feel inviting, not overwhelming, so we keep the experience fast, clear and focused on the food.' +
                    '</p>' +
                    '<p class="text-gray-200 leading-relaxed">' +
                        'That means fewer dead ends, no cluttered pages, and a smooth path from the first idea to the finished meal.' +
                    '</p>' +
                    '<div class="flex flex-wrap gap-4 mt-8">' +
                        '<a href="#/recipes" class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors">Explore Recipes</a>' +
                        '<a href="#/categories" class="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-lg transition-colors">Browse Categories</a>' +
                    '</div>' +
                '</div>' +
            '</section>';
    }

    RD.pages = RD.pages || {};
    RD.pages.about = { render: render };
})(window);
