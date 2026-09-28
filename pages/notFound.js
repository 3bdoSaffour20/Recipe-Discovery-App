/**
 * Not found page for unknown routes.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    function render(container) {
        container.innerHTML = '' +
            RD.components.breadcrumbs.create([{ label: 'Page Not Found' }]) +
            '<div class="text-center py-20">' +
                '<div class="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500">' +
                    RD.icons.bowl('w-9 h-9') +
                '</div>' +
                '<h1 class="text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">404</h1>' +
                '<h2 class="text-2xl font-bold mb-3">We could not find that page</h2>' +
                '<p class="text-gray-400 mb-8">The page you are looking for does not exist or has moved.</p>' +
                '<div class="flex flex-wrap items-center justify-center gap-4">' +
                    '<a href="#/" class="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors">Back to Home</a>' +
                    '<a href="#/recipes" class="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-lg transition-colors">Explore Recipes</a>' +
                '</div>' +
            '</div>';
    }

    RD.pages = RD.pages || {};
    RD.pages.notFound = { render: render };
})(window);
