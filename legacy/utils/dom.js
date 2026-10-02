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
     * TheMealDB returns two very different shapes for the same meal:
     *
     *   - filter.php (category / ingredient listings) returns a summary with
     *     only strMeal, strMealThumb, idMeal, strArea and strCountry.
     *   - lookup.php?i= returns the full record, including strInstructions and
     *     the strIngredient1..20 / strMeasure1..20 pairs.
     *
     * A summary record therefore looks identical to "this recipe has no
     * ingredients and no instructions", which is what made the detail page
     * render its empty states until the user refreshed the page (the refresh
     * emptied the in-memory store and forced a lookup.php request).
     */
    function hasDetailData(meal) {
        if (!meal) {
            return false;
        }

        if (meal.strInstructions && String(meal.strInstructions).trim()) {
            return true;
        }

        for (var i = 1; i <= 20; i += 1) {
            var ingredient = meal['strIngredient' + i];

            if (ingredient && String(ingredient).trim()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Keeps a reference to every meal currently rendered so the detail views
     * can open instantly when the full record is already in memory, without
     * an extra API round trip. Records are merged rather than replaced so a
     * filter.php summary can never discard detail data that was already
     * fetched, and `getDetails` is the only supported way to read a meal for
     * display because it guarantees a full record.
     */
    var mealStore = {
        meals: {},
        pending: {},

        /** True when the record carries the data the detail view renders. */
        isComplete: hasDetailData,

        /**
         * Merges a record into the cache, keeping the more complete of the two
         * as the base and only filling in fields that are still empty.
         */
        set: function (meal) {
            if (!meal || !meal.idMeal) {
                return meal;
            }

            var existing = this.meals[meal.idMeal];

            if (!existing) {
                this.meals[meal.idMeal] = meal;
                return meal;
            }

            if (existing === meal) {
                return existing;
            }

            var base = hasDetailData(existing) ? existing : meal;
            var other = base === existing ? meal : existing;
            var merged = {};
            var key;

            for (key in base) {
                if (Object.prototype.hasOwnProperty.call(base, key)) {
                    merged[key] = base[key];
                }
            }

            for (key in other) {
                if (!Object.prototype.hasOwnProperty.call(other, key)) {
                    continue;
                }

                if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
                    merged[key] = other[key];
                }
            }

            this.meals[meal.idMeal] = merged;
            return merged;
        },

        setMany: function (meals) {
            (meals || []).forEach(this.set, this);
            return meals;
        },

        get: function (id) {
            return this.meals[id] || null;
        },

        /**
         * Resolves a meal that is safe to render in full.
         *
         * @param {string} id
         * @returns {Promise<Object|null>} A full record, or null when the
         *   meal does not exist. Resolves from the cache when the record is
         *   already complete, otherwise fetches lookup.php. Concurrent callers
         *   share a single request.
         */
        getDetails: function (id) {
            var key = String(id || '');

            if (!key) {
                return Promise.resolve(null);
            }

            if (hasDetailData(this.meals[key])) {
                return Promise.resolve(this.meals[key]);
            }

            var self = this;

            if (!this.pending[key]) {
                this.pending[key] = RD.api.getMealDetails(key)
                    .then(function (meal) {
                        delete self.pending[key];
                        return meal ? self.set(meal) : null;
                    })
                    .catch(function (error) {
                        delete self.pending[key];
                        throw error;
                    });
            }

            return this.pending[key];
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
