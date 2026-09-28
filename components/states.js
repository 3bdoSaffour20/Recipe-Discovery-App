/**
 * Loading / empty / error state blocks. Shared by the home page and every
 * recipe results view so the states look identical everywhere.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;

    function loading(message, hint) {
        return '<div class="state-block text-center py-16">' +
            '<div class="loading-spinner mx-auto mb-4"></div>' +
            '<h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300">' + escapeHtml(message || 'Loading recipes...') + '</h2>' +
            (hint ? '<p class="text-gray-500 dark:text-gray-400 mt-2">' + escapeHtml(hint) + '</p>' : '') +
        '</div>';
    }

    function empty(message, hint, actionLabel, actionHref) {
        return '<div class="state-block text-center py-16">' +
            '<div class="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500">' + RD.icons.sad('w-9 h-9') + '</div>' +
            '<h2 class="text-2xl font-bold mb-3">' + escapeHtml(message || 'No recipes found.') + '</h2>' +
            (hint ? '<p class="text-gray-600 dark:text-gray-400 mb-6">' + escapeHtml(hint) + '</p>' : '<div class="mb-6"></div>') +
            (actionLabel
                ? '<a href="' + escapeHtml(actionHref || '#/recipes') + '" class="inline-block px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors">' + escapeHtml(actionLabel) + '</a>'
                : '') +
        '</div>';
    }

    function error(message, hint, actionLabel, actionHref) {
        return '<div class="state-block text-center py-16">' +
            '<div class="mx-auto mb-4 w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400">' + RD.icons.warning('w-9 h-9') + '</div>' +
            '<h2 class="text-2xl font-bold mb-3 text-red-600 dark:text-red-400">' + escapeHtml(message || 'Unable to load recipes. Please try again.') + '</h2>' +
            (hint ? '<p class="text-gray-600 dark:text-gray-400 mb-6">' + escapeHtml(hint) + '</p>' : '<div class="mb-6"></div>') +
            (actionLabel
                ? '<button type="button" class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors" data-retry="true">' + escapeHtml(actionLabel) + '</button>'
                : '') +
        '</div>';
    }

    RD.components = RD.components || {};
    RD.components.states = { loading: loading, empty: empty, error: error };
})(window);
