/**
 * Home page - the original welcome hero plus a link into every discovery flow.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;

    var SUGGESTIONS = [
        { query: 'pasta', label: 'Pasta', icon: 'Icons/pasta.png' },
        { query: 'chicken', label: 'Chicken', icon: 'Icons/chicken.png' },
        { query: 'cake', label: 'Cake', icon: 'Icons/cake.png' },
        { query: 'beef', label: 'Beef', icon: 'Icons/beef.png' }
    ];

    function hero() {
        var tiles = SUGGESTIONS.map(function (item) {
            return '<a href="#/recipes/search/' + encodeURIComponent(item.query) + '" class="recipe-suggestion group p-6 bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700 hover:border-purple-500 transition-all duration-300">' +
                '<img src="' + item.icon + '" alt="' + escapeHtml(item.label) + '" class="w-16 h-16 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">' +
                '<div class="font-bold text-white">' + escapeHtml(item.label) + '</div>' +
            '</a>';
        }).join('');

        return '' +
            '<div class="relative text-center py-24 rounded-3xl overflow-hidden mb-12 bg-cover bg-center" style="background-image: url(\'Images/Backgound.jpg\');">' +
                '<div class="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-gray-900/90"></div>' +
                '<div class="relative z-10 max-w-3xl mx-auto px-4">' +
                    '<h2 class="text-5xl sm:text-6xl font-extrabold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent leading-tight">' +
                        'Discover Amazing Recipes' +
                    '</h2>' +
                    '<p class="text-xl sm:text-2xl text-gray-200 mb-12 leading-relaxed">' +
                        'Search hundreds of recipes from around the world and find your next favorite meal' +
                    '</p>' +
                    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">' + tiles + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="flex flex-wrap items-center justify-center gap-4">' +
                '<a href="#/recipes" class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors">' +
                    'Explore Recipes' +
                '</a>' +
                '<a href="#/categories" class="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-lg transition-colors">' +
                    'Browse Categories' +
                '</a>' +
                '<a href="#/about" class="px-6 py-3 text-gray-300 hover:text-purple-400 font-semibold rounded-lg transition-colors">' +
                    'About Us' +
                '</a>' +
            '</div>';
    }

    function render(container) {
        container.innerHTML = hero();
    }

    RD.pages = RD.pages || {};
    RD.pages.home = { render: render };
})(window);
