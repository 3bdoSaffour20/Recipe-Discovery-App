/**
 * Inline SVG icon set. These replace the emoji previously used in the
 * loading / empty / error states so every surface matches the project theme.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    function svg(paths, className) {
        return '<svg class="' + (className || 'w-12 h-12') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' + paths + '</svg>';
    }

    RD.icons = {
        bowl: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M3 11h18M5 11a7 7 0 0 0 14 0M4 20h16M8 4c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3M16 4c0 1.5 1 1.5 1 3"></path>',
                className
            );
        },
        sad: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M15.182 16.318A4.486 4.486 0 0 0 12 14a4.486 4.486 0 0 0-3.182 2.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9h.008v.008H9.75V9Zm4.5 0h.008v.008h-.008V9Z"></path>',
                className
            );
        },
        warning: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 9v4m0 3h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path>',
                className
            );
        },
        search: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"></path>',
                className
            );
        },
        sparkles: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 3l1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6L12 3Zm6.5 9 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z"></path>',
                className
            );
        },
        globe: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.2 3.8-5.2 3.8-9S14.5 5.2 12 3m0 18c-2.5-2.2-3.8-5.2-3.8-9S9.5 5.2 12 3M3.5 9h17M3.5 15h17"></path>',
                className
            );
        },
        check: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="m4.5 12.75 6 6 9-13.5"></path>',
                className
            );
        },
        book: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"></path>',
                className
            );
        },
        tag: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M6 6h.008v.008H6V6Z"></path>',
                className
            );
        },
        clock: function (className) {
            return svg(
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"></path>',
                className
            );
        }
    };
})(window);
