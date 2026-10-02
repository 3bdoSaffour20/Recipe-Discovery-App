/**
 * Country flag resolver.
 *
 * TheMealDB identifies a recipe's origin through two fields:
 *   - strArea    the demonym, e.g. "British", "Russian", "Japanese"
 *   - strCountry the country name, e.g. "United Kingdom", "Russia", "Japan"
 *
 * `strArea` is only present on full records, and filter.php listings can even
 * return it as null, so every lookup below tries both shapes. Names are mapped
 * to ISO 3166-1 alpha-2 codes, which is what both the flag image url and the
 * Unicode fallback are built from.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    /**
     * Flag artwork is fetched as SVG so a single url covers every card size.
     * Windows has no flag glyphs in Segoe UI Emoji, so the graphic cannot be
     * a Unicode emoji; the emoji is only an onerror fallback.
     */
    var FLAG_CDN = 'https://flagcdn.com/';

    /**
     * Every `strArea` value published by TheMealDB (list.php?a=list) mapped to
     * its ISO 3166-1 alpha-2 code. A few entries are not straight country
     * names and are commented where the choice is not obvious.
     */
    var AREA_CODES = {
        'afghan': 'AF',
        'albanian': 'AL',
        'algerian': 'DZ',
        'andorran': 'AD',
        'angolan': 'AO',
        'antiguan': 'AG',
        'argentine': 'AR',
        'armenian': 'AM',
        'aruban': 'AW',
        'australian': 'AU',
        'austrian': 'AT',
        'azerbaijani': 'AZ',
        'bahamian': 'BS',
        'bahraini': 'BH',
        'bangladeshi': 'BD',
        'barbadian': 'BB',
        'barbudan': 'BB',
        'belarusian': 'BY',
        'belgian': 'BE',
        'belizean': 'BZ',
        'beninese': 'BJ',
        'bermudian': 'BM',
        'bhutanese': 'BT',
        'bolivian': 'BO',
        'bosnian': 'BA',
        'brazilian': 'BR',
        'bruneian': 'BN',
        'bulgarian': 'BG',
        'burkinabe': 'BF',
        'burundian': 'BI',
        'cambodian': 'KH',
        'cameroonian': 'CM',
        'canadian': 'CA',
        'cape verdian': 'CV',
        'caymanian': 'KY',
        'central african': 'CF',
        'chadian': 'TD',
        'chilean': 'CL',
        'chinese': 'CN',
        'colombian': 'CO',
        'congolese': 'CG',
        'costa rican': 'CR',
        'croatian': 'HR',
        'cuban': 'CU',
        'cypriot': 'CY',
        'czech': 'CZ',
        'danish': 'DK',
        'djiboutian': 'DJ',
        'dominica': 'DM',
        'dominican': 'DO',
        'ecuadorean': 'EC',
        'egyptian': 'EG',
        'emirati': 'AE',
        'equatorial guinean': 'GQ',
        'eritrean': 'ER',
        'estonian': 'EE',
        'ethiopian': 'ET',
        'faroese': 'FO',
        'fijian': 'FJ',
        'finnish': 'FI',
        'french': 'FR',
        'gabonese': 'GA',
        'gambian': 'GM',
        'georgian': 'GE',
        'german': 'DE',
        'ghanaian': 'GH',
        'gibraltar': 'GI',
        'greek': 'GR',
        'greenlandic': 'GL',
        'grenadian': 'GD',
        'guadeloupean': 'GP',
        'guadeloupian': 'GP',
        'guamanian': 'GU',
        'guatemalan': 'GT',
        'guinean': 'GN',
        'guinea-bissauan': 'GW',
        'guyanese': 'GY',
        'haitian': 'HT',
        'honduran': 'HN',
        'hong konger': 'HK',
        'hungarian': 'HU',
        'icelander': 'IS',
        'indian': 'IN',
        'indonesian': 'ID',
        'iranian': 'IR',
        'iraqi': 'IQ',
        'irish': 'IE',
        'israeli': 'IL',
        'italian': 'IT',
        'ivorian': 'CI',
        'jamaican': 'JM',
        'japanese': 'JP',
        'jordanian': 'JO',
        'kazakhstani': 'KZ',
        'kenyan': 'KE',
        'kirghiz': 'KG',
        'kosovar': 'XK',
        'kuwaiti': 'KW',
        'laotian': 'LA',
        'latvian': 'LV',
        'lebanese': 'LB',
        'liberian': 'LR',
        'libyan': 'LY',
        'liechtensteiner': 'LI',
        'lithuanian': 'LT',
        'luxembourger': 'LU',
        'malagasy': 'MG',
        'malawian': 'MW',
        'malaysian': 'MY',
        'maldivan': 'MV',
        'malian': 'ML',
        'maltese': 'MT',
        'mauritian': 'MU',
        'mexican': 'MX',
        'moldovan': 'MD',
        'mongolian': 'MN',
        'montenegrin': 'ME',
        'moroccan': 'MA',
        'mosotho': 'LS',
        'motswana': 'BW',
        'mozambican': 'MZ',
        'burmese': 'MM',
        'namibian': 'NA',
        'nepalese': 'NP',
        'dutch': 'NL',
        'new zealander': 'NZ',
        'nicaraguan': 'NI',
        'nigerien': 'NE',
        'nigerian': 'NG',
        'north korean': 'KP',
        'macedonian': 'MK',
        'norwegian': 'NO',
        'omani': 'OM',
        'pakistani': 'PK',
        'palestinian': 'PS',
        'panamanian': 'PA',
        'papua new guinean': 'PG',
        'paraguayan': 'PY',
        'peruvian': 'PE',
        'filipino': 'PH',
        'polish': 'PL',
        'portuguese': 'PT',
        'puerto rican': 'PR',
        'qatari': 'QA',
        'romanian': 'RO',
        'russian': 'RU',
        'rwandan': 'RW',
        'saint lucian': 'LC',
        'samoan': 'WS',
        'sammarinese': 'SM',
        'saudi arabian': 'SA',
        'senegalese': 'SN',
        'serbian': 'RS',
        'seychellois': 'SC',
        'sierra leonean': 'SL',
        'singaporean': 'SG',
        'slovak': 'SK',
        'slovene': 'SI',
        'solomon islander': 'SB',
        'somali': 'SO',
        'south african': 'ZA',
        'south korean': 'KR',
        'south sudanese': 'SS',
        'spanish': 'ES',
        'sri lankan': 'LK',
        'sudanese': 'SD',
        'surinamer': 'SR',
        'swedish': 'SE',
        'swiss': 'CH',
        'syrian': 'SY',
        'taiwanese': 'TW',
        'tadzhik': 'TJ',
        'tanzanian': 'TZ',
        'thai': 'TH',
        'togolese': 'TG',
        'tongan': 'TO',
        'trinidadian': 'TT',
        'tunisian': 'TN',
        'turkish': 'TR',
        'turkmen': 'TM',
        'tuvaluan': 'TV',
        'ugandan': 'UG',
        'ukrainian': 'UA',
        'british': 'GB',
        'american': 'US',
        'uruguayan': 'UY',
        'uzbekistani': 'UZ',
        'ni-vanuatu': 'VU',
        'venezuelan': 'VE',
        'vietnamese': 'VN',
        'yemeni': 'YE',
        'zambian': 'ZM',
        'zimbabwean': 'ZW',
        // Territories TheMealDB lists by a name rather than a demonym.
        'channel islander': 'JE',
        'salvadoran': 'SV',
        'herzegovinian': 'BA'
    };

    /**
     * Country names and common spellings that Intl.DisplayNames does not
     * produce verbatim, or that readers are likely to pass in.
     */
    var NAME_CODES = {
        'united states of america': 'US',
        'united states': 'US',
        'america': 'US',
        'u.s.': 'US',
        'u.s.a.': 'US',
        'usa': 'US',
        'uk': 'GB',
        'u.k.': 'GB',
        'united kingdom of great britain and northern ireland': 'GB',
        'great britain': 'GB',
        'england': 'GB',
        'scotland': 'GB',
        'wales': 'GB',
        'northern ireland': 'GB',
        'russian federation': 'RU',
        'czechia': 'CZ',
        'czech republic': 'CZ',
        'cape verde': 'CV',
        'eswatini': 'SZ',
        'swaziland': 'SZ',
        'east timor': 'TL',
        'timor-leste': 'TL',
        'ivory coast': 'CI',
        'cote d’ivoire': 'CI',
        "cote d'ivoire": 'CI',
        'vatican': 'VA',
        'vatican city': 'VA',
        'holy see': 'VA',
        'palestinian territory': 'PS',
        'palestine': 'PS',
        'macedonia': 'MK',
        'north macedonia': 'MK',
        'hong kong': 'HK',
        'macau': 'MO',
        'macao': 'MO',
        'reunion': 'RE',
        'la reunion': 'RE',
        'curacao': 'CW',
        'saint martin': 'MF',
        'st. martin': 'MF',
        'sint maarten': 'SX',
        'bosnia and herzegovina': 'BA',
        'bosnia & herzegovina': 'BA',
        'republic of the congo': 'CG',
        'congo-brazzaville': 'CG',
        'congo': 'CD',
        'democratic republic of the congo': 'CD',
        'democratic republic of congo': 'CD',
        'dr congo': 'CD',
        'drc': 'CD',
        'south korea': 'KR',
        'republic of korea': 'KR',
        'korea, south': 'KR',
        'north korea': 'KP',
        'korea, north': 'KP',
        'salvador': 'SV',
        'el salvador': 'SV',
        'myanmar': 'MM',
        'burma': 'MM',
        'netherlands': 'NL',
        'the netherlands': 'NL',
        'holland': 'NL',
        'turkey': 'TR',
        'türkiye': 'TR',
        'bolivia': 'BO',
        'iran': 'IR',
        'laos': 'LA',
        'tanzania': 'TZ',
        'moldova': 'MD',
        'brunei': 'BN',
        'cape verde islands': 'CV',
        'united republic of tanzania': 'TZ'
    };

    var CODE_PATTERN = /^[a-z]{2}$/;
    var EMOJI_PATTERN = /[\uD83C-\uDBFF][\uDC00-\uDFFF]/;

    var nameIndex = null;
    var displayNames = null;

    function getDisplayNames() {
        if (displayNames === null) {
            displayNames = (typeof Intl !== 'undefined' && Intl.DisplayNames)
                ? new Intl.DisplayNames(['en'], { type: 'region' })
                : false;
        }

        return displayNames;
    }

    /** Cached "English country name" -> code index built from Intl.DisplayNames. */
    function buildNameIndex() {
        if (nameIndex) {
            return nameIndex;
        }

        var names = getDisplayNames();
        var index = {};

        if (names) {
            Object.keys(AREA_CODES).forEach(function (area) {
                var code = AREA_CODES[area];
                var label = names.of(code);

                if (label) {
                    // Indexed through normalize() so the Intl spelling of a
                    // country and the TheMealDB spelling of the same country
                    // collapse onto one key.
                    index[normalize(label)] = code;
                }
            });
        }

        nameIndex = index;
        return nameIndex;
    }

    /** True when the two letter value is a real region code. */
    function isRegionCode(value) {
        var names = getDisplayNames();
        var label = names ? names.of(value.toUpperCase()) : '';

        return Boolean(label) && label.toLowerCase() !== 'unknown region';
    }

    function normalize(value) {
        return String(value || '')
            // Intl spells these "St. Lucia" / "Antigua & Barbuda" while
            // TheMealDB uses "Saint Lucia" / "Antigua and Barbuda".
            .replace(/\bst\./g, 'saint')
            .replace(/&/g, ' and ')
            .replace(/[.,]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    /**
     * @param {...*} values Candidate names, tried in order.
     * @returns {string} ISO 3166-1 alpha-2 code, or '' when nothing matched.
     */
    function resolveCode() {
        var values = Array.prototype.slice.call(arguments);

        for (var index = 0; index < values.length; index += 1) {
            var value = values[index];

            if (!value || typeof value !== 'string') {
                continue;
            }

            // TheMealDB ships a few areas as one comma joined string, e.g.
            // "Antiguan, Barbudan" or "Bosnian, Herzegovinian".
            var parts = value.split(',');

            for (var part = 0; part < parts.length; part += 1) {
                var name = normalize(parts[part]);

                if (!name) {
                    continue;
                }

                if (AREA_CODES[name]) {
                    return AREA_CODES[name];
                }

                if (NAME_CODES[name]) {
                    return NAME_CODES[name];
                }

                if (CODE_PATTERN.test(name) && isRegionCode(name)) {
                    return name.toUpperCase();
                }

                var known = buildNameIndex()[name];

                if (known) {
                    return known;
                }

                // "British Food" / "Japanese Cuisine" style values.
                var partial = Object.keys(AREA_CODES).find(function (area) {
                    return name.indexOf(area) !== -1;
                });

                if (partial) {
                    return AREA_CODES[partial];
                }
            }
        }

        return '';
    }

    /**
     * ISO 3166-1 alpha-2 -> regional indicator symbol pair.
     * U+1F1E6 is the first regional indicator, one per ASCII letter.
     */
    function codeToEmoji(code) {
        return String(code)
            .toUpperCase()
            .split('')
            .map(function (character) {
                return String.fromCodePoint(0x1F1E6 + character.charCodeAt(0) - 65);
            })
            .join('');
    }

    /**
     * @param {...*} values Country/area names, tried in order.
     * @returns {string} Flag emoji, or '' when the origin is unknown.
     */
    function emoji() {
        for (var index = 0; index < arguments.length; index += 1) {
            var value = arguments[index];

            if (value && typeof value === 'string' && EMOJI_PATTERN.test(value)) {
                return value;
            }
        }

        var code = resolveCode.apply(null, arguments);
        return code ? codeToEmoji(code) : '';
    }

    /**
     * Replaces a flag <img> that failed to load with the Unicode emoji, and
     * failing that with the bare ISO code, so a blocked CDN degrades instead
     * of leaving a broken image behind. Wired up through the inline onerror
     * attribute in markup().
     */
    function fallbackImage(img) {
        if (!img || !img.parentNode) {
            return;
        }

        var code = img.getAttribute('data-flag-code') || '';
        var span = document.createElement('span');

        span.className = 'country-flag country-flag--fallback';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = code ? (codeToEmoji(code) || code) : '';

        img.parentNode.replaceChild(span, img);
    }

    /**
     * @param {...*} values Country/area names, tried in order.
     * @returns {string} Flag image url, or '' when the origin is unknown.
     */
    function imageUrl() {
        var code = resolveCode.apply(null, arguments);

        return code ? FLAG_CDN + code.toLowerCase() + '.svg' : '';
    }

    /**
     * The country name to display, i.e. the first non-empty value given.
     *
     * @param {IArguments|Array} values
     * @returns {string}
     */
    function displayName(values) {
        for (var index = 0; index < values.length; index += 1) {
            if (typeof values[index] === 'string' && values[index].trim()) {
                return values[index].trim();
            }
        }

        return '';
    }

    /**
     * Flag image plus country name, used by both the cards and the detail view
     * so every surface renders the origin identically.
     *
     * The graphic is an SVG <img> rather than a Unicode flag emoji because
     * Windows ships no flag glyphs in Segoe UI Emoji: the regional indicator
     * pairs render as bare letters ("CO", "AU", "CU"). The emoji is kept as an
     * onerror fallback for platforms that cannot reach the CDN.
     *
     * @param {...*} values Country/area names, tried in order.
     * @returns {string} Markup, or '' when neither a name nor a flag is known.
     */
    function markup() {
        var values = arguments;
        var name = displayName(values);
        var code = resolveCode.apply(null, values);

        if (!name && !code) {
            return '';
        }

        var flag = code
            ? '<span class="country-flag">' +
                '<img src="' + FLAG_CDN + code.toLowerCase() + '.svg" alt="" loading="lazy" decoding="async" ' +
                'data-flag-code="' + code + '" onerror="RD.flags.fallbackImage(this)">' +
            '</span>'
            : '';

        return flag + (name ? ' <span class="country-name">' + RD.utils.escapeHtml(name) + '</span>' : '');
    }

    RD.flags = {
        AREA_CODES: AREA_CODES,
        NAME_CODES: NAME_CODES,
        FLAG_CDN: FLAG_CDN,
        resolveCode: resolveCode,
        codeToEmoji: codeToEmoji,
        emoji: emoji,
        imageUrl: imageUrl,
        markup: markup,
        fallbackImage: fallbackImage,
        countryName: function (value) {
            var names = getDisplayNames();
            var code = resolveCode(value);
            return names && code ? names.of(code) : '';
        }
    };
})(window);
