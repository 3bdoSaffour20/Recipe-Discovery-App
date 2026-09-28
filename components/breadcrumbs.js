/**
 * Breadcrumb / page header shown on every page except the home page.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;

    function chevron() {
        return '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 5 7 7-7 7"></path>' +
            '</svg>';
    }

    /**
     * @param {Array<{label: string, href?: string}>} trail
     * @returns {string} Breadcrumb markup.
     */
    function createBreadcrumbs(trail) {
        var items = [{ label: 'Home', href: '#/' }].concat(trail || []);

        var links = items.map(function (item, index) {
            var isLast = index === items.length - 1;
            var label = escapeHtml(item.label);

            if (isLast || !item.href) {
                return '<li class="flex items-center gap-2 min-w-0">' +
                    '<span class="truncate text-purple-300 font-semibold" aria-current="page">' + label + '</span>' +
                '</li>';
            }

            return '<li class="flex items-center gap-2 min-w-0">' +
                '<a href="' + escapeHtml(item.href) + '" class="truncate text-gray-400 hover:text-purple-400 transition-colors">' + label + '</a>' +
            '</li>';
        }).join('<li class="text-gray-600 flex-shrink-0" aria-hidden="true">' + chevron() + '</li>');

        return '<nav class="breadcrumbs mb-6" aria-label="Breadcrumb"><ol class="flex flex-wrap items-center gap-2 text-sm">' + links + '</ol></nav>';
    }

    RD.components = RD.components || {};
    RD.components.breadcrumbs = { create: createBreadcrumbs };
})(window);
