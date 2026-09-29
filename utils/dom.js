/**
 * Small shared helpers used by the components and pages.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    function escapeHtml(value) {
        if (value === undefined || value === null) {
            return '';
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** "chicken_breast" -> "Chicken Breast" */
    function humanize(value) {
        if (!value) {
            return '';
        }

        return String(value)
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, function (character) {
                return character.toUpperCase();
            });
    }

    function pluralize(count, singular, plural) {
        return count + ' ' + (count === 1 ? singular : (plural || singular + 's'));
    }

    function truncate(value, length) {
        var text = String(value || '').trim();
        if (text.length <= length) {
            return text;
        }
        return text.slice(0, length).trim() + '...';
    }

    /**
     * Keeps a reference to every meal currently rendered so the detail modal
     * can open instantly without an extra API round trip.
     */
    var mealStore = {
        meals: {},
        set: function (meal) {
            if (meal && meal.idMeal) {
                this.meals[meal.idMeal] = meal;
            }
            return meal;
        },
        setMany: function (meals) {
            (meals || []).forEach(this.set, this);
            return meals;
        },
        get: function (id) {
            return this.meals[id] || null;
        }
    };

    RD.utils = {
        escapeHtml: escapeHtml,
        humanize: humanize,
        pluralize: pluralize,
        truncate: truncate
    };

    RD.mealStore = mealStore;
})(window);
