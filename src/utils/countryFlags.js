/**
 * TheMealDB cuisine/area -> ISO 3166-1 alpha-2 country code.
 *
 * TheMealDB labels a recipe's origin with `strArea`, which is almost always a
 * demonym ("Malaysian", "British") rather than a country name, and which spells
 * several areas oddly ("Motswana", "Ni-Vanuatu", "Salvadoran"). The lookup
 * below therefore keys on a normalised form and every entry carries the aliases
 * that reach it.
 *
 * The result is a country *code*, never artwork: components ask this module for
 * a code and render the flag through `flag-icons`, so the code is resolved in
 * exactly one place and no component can invent its own mapping.
 *
 * Why codes and not Unicode emoji flags: a regional-indicator pair (the two
 * code points that spell "ES") is only a flag if the operating system supplies
 * the glyph. Windows browsers frequently have no such font and fall back to the
 * two letters themselves, so a card would read "ES Spanish". SVG artwork from
 * the bundle renders identically on desktop and mobile and cannot degrade to
 * text.
 *
 * No React and no network access here, like `helpers.js`.
 */

/**
 * Codes the `flag-icons` package actually ships artwork for.
 *
 * This is the second half of the validation: an area can be a real country and
 * still have no flag to draw (see `CHANNEL_ISLANDER` below), and a typo in the
 * table above would otherwise produce a class with no rule behind it — an empty
 * box. Requiring both a mapping and a shipped asset means `getCountryCode` can
 * only ever return a code that renders.
 */
const FLAG_ASSET_CODES = new Set(
  (
    'ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn ' +
    'bo br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj ' +
    'dk dm do dz ec ee eg er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq ' +
    'gr gs gt gu gw gy hk hn hr ht hu id ie il im in iq ir is it je jm jo jp ke kg kh ki km ' +
    'kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo ' +
    'mp mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nu nz om pa pe pf pg ph pk pl ' +
    'pm pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st ' +
    'sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug us uy uz va vc ve vg ' +
    'vi vn vu wf ws xk ye yt za zm zw'
  ).split(' '),
);

/**
 * ISO 3166-1 alpha-2 code plus every area spelling that maps to it.
 *
 * Lower-case because that is the form the `fi-xx` class names use; `fi-es` and
 * `fi-ES` are not the same selector.
 */
const AREA_COUNTRY_CODES = [
  { code: 'af', aliases: ['Afghanistan', 'Afghan'] },
  { code: 'al', aliases: ['Albania', 'Albanian'] },
  { code: 'dz', aliases: ['Algeria', 'Algerian'] },
  { code: 'ad', aliases: ['Andorra', 'Andorran'] },
  { code: 'ao', aliases: ['Angola', 'Angolan'] },
  { code: 'ag', aliases: ['Antigua and Barbuda', 'Antiguan Barbudan', 'Antiguan'] },
  { code: 'ar', aliases: ['Argentina', 'Argentine', 'Argentinian'] },
  { code: 'am', aliases: ['Armenia', 'Armenian'] },
  { code: 'aw', aliases: ['Aruba', 'Aruban'] },
  { code: 'au', aliases: ['Australia', 'Australian'] },
  { code: 'at', aliases: ['Austria', 'Austrian'] },
  { code: 'az', aliases: ['Azerbaijan', 'Azerbaijani'] },
  { code: 'bs', aliases: ['Bahamas', 'Bahamian'] },
  { code: 'bh', aliases: ['Bahrain', 'Bahraini'] },
  { code: 'bd', aliases: ['Bangladesh', 'Bangladeshi'] },
  { code: 'bb', aliases: ['Barbados', 'Barbadian'] },
  { code: 'by', aliases: ['Belarus', 'Belarusian'] },
  { code: 'be', aliases: ['Belgium', 'Belgian'] },
  { code: 'bz', aliases: ['Belize', 'Belizean'] },
  { code: 'bj', aliases: ['Benin', 'Beninese'] },
  { code: 'bm', aliases: ['Bermuda', 'Bermudian'] },
  { code: 'bt', aliases: ['Bhutan', 'Bhutanese'] },
  { code: 'bo', aliases: ['Bolivia', 'Bolivian'] },
  { code: 'ba', aliases: ['Bosnia and Herzegovina', 'Bosnian Herzegovinian', 'Bosnian'] },
  { code: 'bw', aliases: ['Botswana', 'Motswana', 'Botswanan'] },
  { code: 'br', aliases: ['Brazil', 'Brazilian'] },
  { code: 'bn', aliases: ['Brunei', 'Bruneian'] },
  { code: 'bg', aliases: ['Bulgaria', 'Bulgarian'] },
  { code: 'bf', aliases: ['Burkina Faso', 'Burkinabe'] },
  { code: 'bi', aliases: ['Burundi', 'Burundian'] },
  { code: 'kh', aliases: ['Cambodia', 'Cambodian'] },
  { code: 'cm', aliases: ['Cameroon', 'Cameroonian'] },
  { code: 'ca', aliases: ['Canada', 'Canadian'] },
  { code: 'cv', aliases: ['Cape Verde', 'Cape Verdian', 'Cape Verdean'] },
  { code: 'ky', aliases: ['Cayman Islands', 'Caymanian'] },
  { code: 'cf', aliases: ['Central African Republic', 'Central African'] },
  { code: 'td', aliases: ['Chad', 'Chadian'] },
  { code: 'cl', aliases: ['Chile', 'Chilean'] },
  { code: 'cn', aliases: ['China', 'Chinese'] },
  { code: 'co', aliases: ['Colombia', 'Colombian'] },
  { code: 'cr', aliases: ['Costa Rica', 'Costa Rican'] },
  { code: 'hr', aliases: ['Croatia', 'Croatian'] },
  { code: 'cu', aliases: ['Cuba', 'Cuban'] },
  { code: 'cy', aliases: ['Cyprus', 'Cypriot'] },
  { code: 'cz', aliases: ['Czechia', 'Czech Republic', 'Czech'] },
  { code: 'cd', aliases: ['DR Congo', 'Democratic Republic of the Congo', 'Congolese'] },
  { code: 'cg', aliases: ['Republic of the Congo', 'Congo'] },
  { code: 'dk', aliases: ['Denmark', 'Danish'] },
  { code: 'dj', aliases: ['Djibouti'] },
  { code: 'dm', aliases: ['Dominica'] },
  { code: 'do', aliases: ['Dominican Republic', 'Dominican'] },
  { code: 'ec', aliases: ['Ecuador', 'Ecuadorean'] },
  { code: 'eg', aliases: ['Egypt', 'Egyptian'] },
  { code: 'sv', aliases: ['El Salvador', 'Salvadoran'] },
  { code: 'gq', aliases: ['Equatorial Guinea', 'Equatorial Guinean'] },
  { code: 'er', aliases: ['Eritrea', 'Eritrean'] },
  { code: 'ee', aliases: ['Estonia', 'Estonian'] },
  { code: 'et', aliases: ['Ethiopia', 'Ethiopian'] },
  { code: 'fo', aliases: ['Faroe Islands', 'Faroese'] },
  { code: 'fj', aliases: ['Fiji', 'Fijian'] },
  { code: 'fi', aliases: ['Finland', 'Finnish'] },
  { code: 'fr', aliases: ['France', 'French'] },
  { code: 'ga', aliases: ['Gabon', 'Gabonese'] },
  { code: 'gm', aliases: ['Gambia', 'Gambian'] },
  { code: 'ge', aliases: ['Georgia', 'Georgian'] },
  { code: 'de', aliases: ['Germany', 'German'] },
  { code: 'gh', aliases: ['Ghana', 'Ghanaian'] },
  { code: 'gi', aliases: ['Gibraltar'] },
  { code: 'gr', aliases: ['Greece', 'Greek'] },
  { code: 'gl', aliases: ['Greenland', 'Greenlandic'] },
  { code: 'gd', aliases: ['Grenada', 'Grenadian'] },
  { code: 'gp', aliases: ['Guadeloupe', 'Guadeloupian'] },
  { code: 'gu', aliases: ['Guam', 'Guamanian'] },
  { code: 'gt', aliases: ['Guatemala', 'Guatemalan'] },
  { code: 'gn', aliases: ['Guinea', 'Guinean'] },
  { code: 'gw', aliases: ['Guinea-Bissau', 'Guinea Bissauan', 'Bissau Guinean'] },
  { code: 'gy', aliases: ['Guyana', 'Guyanese'] },
  { code: 'ht', aliases: ['Haiti', 'Haitian'] },
  { code: 'hn', aliases: ['Honduras', 'Honduran'] },
  { code: 'hk', aliases: ['Hong Kong', 'Hong Konger'] },
  { code: 'hu', aliases: ['Hungary', 'Hungarian'] },
  { code: 'is', aliases: ['Iceland', 'Icelandic', 'Icelander'] },
  { code: 'in', aliases: ['India', 'Indian'] },
  { code: 'id', aliases: ['Indonesia', 'Indonesian'] },
  { code: 'ir', aliases: ['Iran', 'Persia', 'Iranian'] },
  { code: 'iq', aliases: ['Iraq', 'Iraqi'] },
  { code: 'ie', aliases: ['Ireland', 'Irish'] },
  { code: 'il', aliases: ['Israel', 'Israeli'] },
  { code: 'it', aliases: ['Italy', 'Italian'] },
  { code: 'ci', aliases: ['Ivory Coast', "Cote d'Ivoire", 'Ivorian'] },
  { code: 'jm', aliases: ['Jamaica', 'Jamaican'] },
  { code: 'jp', aliases: ['Japan', 'Japanese'] },
  { code: 'jo', aliases: ['Jordan', 'Jordanian'] },
  { code: 'kz', aliases: ['Kazakhstan', 'Kazakhstani', 'Kazakh'] },
  { code: 'ke', aliases: ['Kenya', 'Kenyan'] },
  { code: 'xk', aliases: ['Kosovo', 'Kosovar'] },
  { code: 'kw', aliases: ['Kuwait', 'Kuwaiti'] },
  { code: 'kg', aliases: ['Kyrgyzstan', 'Kirghiz', 'Kyrgyz'] },
  { code: 'la', aliases: ['Laos', 'Laotian', 'Lao'] },
  { code: 'lv', aliases: ['Latvia', 'Latvian'] },
  { code: 'lb', aliases: ['Lebanon', 'Lebanese'] },
  { code: 'ls', aliases: ['Lesotho', 'Mosotho', 'Basotho'] },
  { code: 'lr', aliases: ['Liberia', 'Liberian'] },
  { code: 'ly', aliases: ['Libya', 'Libyan'] },
  { code: 'li', aliases: ['Liechtenstein', 'Liechtensteiner'] },
  { code: 'lt', aliases: ['Lithuania', 'Lithuanian'] },
  { code: 'lu', aliases: ['Luxembourg', 'Luxembourger'] },
  { code: 'mg', aliases: ['Madagascar', 'Malagasy'] },
  { code: 'mw', aliases: ['Malawi', 'Malawian'] },
  { code: 'my', aliases: ['Malaysia', 'Malaysian'] },
  { code: 'mv', aliases: ['Maldives', 'Maldivan'] },
  { code: 'ml', aliases: ['Mali', 'Malian'] },
  { code: 'mt', aliases: ['Malta', 'Maltese'] },
  { code: 'mh', aliases: ['Marshall Islands', 'Marshallese'] },
  { code: 'mr', aliases: ['Mauritania', 'Mauritanian'] },
  { code: 'mu', aliases: ['Mauritius', 'Mauritian'] },
  { code: 'mx', aliases: ['Mexico', 'Mexican'] },
  { code: 'fm', aliases: ['Micronesia', 'Micronesian'] },
  { code: 'md', aliases: ['Moldova', 'Moldovan'] },
  { code: 'mc', aliases: ['Monaco', 'Monegasque'] },
  { code: 'mn', aliases: ['Mongolia', 'Mongolian'] },
  { code: 'me', aliases: ['Montenegro', 'Montenegrin'] },
  { code: 'ma', aliases: ['Morocco', 'Moroccan'] },
  { code: 'mz', aliases: ['Mozambique', 'Mozambican'] },
  { code: 'mm', aliases: ['Myanmar', 'Burmese', 'Burma'] },
  { code: 'na', aliases: ['Namibia', 'Namibian'] },
  { code: 'np', aliases: ['Nepal', 'Nepalese', 'Nepali'] },
  { code: 'nl', aliases: ['Netherlands', 'Dutch'] },
  { code: 'nz', aliases: ['New Zealand', 'New Zealander', 'Kiwi'] },
  { code: 'ni', aliases: ['Nicaragua', 'Nicaraguan'] },
  { code: 'ne', aliases: ['Niger', 'Nigerien'] },
  { code: 'ng', aliases: ['Nigeria', 'Nigerian'] },
  { code: 'kp', aliases: ['North Korea', 'North Korean'] },
  { code: 'mk', aliases: ['North Macedonia', 'Macedonia', 'Macedonian'] },
  { code: 'no', aliases: ['Norway', 'Norwegian'] },
  { code: 'om', aliases: ['Oman', 'Omani'] },
  { code: 'pk', aliases: ['Pakistan', 'Pakistani'] },
  { code: 'ps', aliases: ['Palestine', 'Palestinian'] },
  { code: 'pa', aliases: ['Panama', 'Panamanian'] },
  { code: 'pg', aliases: ['Papua New Guinea', 'Papua New Guinean'] },
  { code: 'py', aliases: ['Paraguay', 'Paraguayan'] },
  { code: 'pe', aliases: ['Peru', 'Peruvian'] },
  { code: 'ph', aliases: ['Philippines', 'Filipino', 'Filipina'] },
  { code: 'pl', aliases: ['Poland', 'Polish'] },
  { code: 'pt', aliases: ['Portugal', 'Portuguese'] },
  { code: 'pr', aliases: ['Puerto Rico', 'Puerto Rican'] },
  { code: 'qa', aliases: ['Qatar', 'Qatari'] },
  { code: 'ro', aliases: ['Romania', 'Romanian'] },
  { code: 'ru', aliases: ['Russia', 'Russian'] },
  { code: 'rw', aliases: ['Rwanda', 'Rwandan'] },
  { code: 'lc', aliases: ['Saint Lucia', 'Saint Lucian'] },
  { code: 'ws', aliases: ['Samoa', 'Samoan'] },
  { code: 'sm', aliases: ['San Marino', 'Sammarinese'] },
  { code: 'sa', aliases: ['Saudi Arabia', 'Saudi', 'Saudi Arabian'] },
  { code: 'sn', aliases: ['Senegal', 'Senegalese'] },
  { code: 'rs', aliases: ['Serbia', 'Serbian'] },
  { code: 'sc', aliases: ['Seychelles', 'Seychellois'] },
  { code: 'sl', aliases: ['Sierra Leone', 'Sierra Leonean'] },
  { code: 'sg', aliases: ['Singapore', 'Singaporean'] },
  { code: 'sk', aliases: ['Slovakia', 'Slovak'] },
  { code: 'si', aliases: ['Slovenia', 'Slovene', 'Slovenian'] },
  { code: 'sb', aliases: ['Solomon Islands', 'Solomon Islander'] },
  { code: 'so', aliases: ['Somalia', 'Somali'] },
  { code: 'za', aliases: ['South Africa', 'South African'] },
  { code: 'kr', aliases: ['South Korea', 'South Korean', 'Korea'] },
  { code: 'ss', aliases: ['South Sudan', 'South Sudanese'] },
  { code: 'es', aliases: ['Spain', 'Spanish'] },
  { code: 'lk', aliases: ['Sri Lanka', 'Sri Lankan'] },
  { code: 'sd', aliases: ['Sudan', 'Sudanese'] },
  { code: 'sr', aliases: ['Suriname', 'Surinamer', 'Surinamese'] },
  { code: 'se', aliases: ['Sweden', 'Swedish'] },
  { code: 'ch', aliases: ['Switzerland', 'Swiss'] },
  { code: 'sy', aliases: ['Syria', 'Syrian'] },
  { code: 'tw', aliases: ['Taiwan', 'Taiwanese'] },
  { code: 'tj', aliases: ['Tajikistan', 'Tadzhik', 'Tajik'] },
  { code: 'tz', aliases: ['Tanzania', 'Tanzanian'] },
  { code: 'th', aliases: ['Thailand', 'Thai'] },
  { code: 'tg', aliases: ['Togo', 'Togolese'] },
  { code: 'to', aliases: ['Tonga', 'Tongan'] },
  { code: 'tt', aliases: ['Trinidad and Tobago', 'Trinidadian'] },
  { code: 'tn', aliases: ['Tunisia', 'Tunisian'] },
  { code: 'tr', aliases: ['Turkey', 'Turkish', 'Turkiye'] },
  { code: 'tm', aliases: ['Turkmenistan', 'Turkmen'] },
  { code: 'tv', aliases: ['Tuvalu', 'Tuvaluan'] },
  { code: 'ug', aliases: ['Uganda', 'Ugandan'] },
  { code: 'ua', aliases: ['Ukraine', 'Ukrainian'] },
  { code: 'ae', aliases: ['United Arab Emirates', 'Emirati', 'UAE'] },
  { code: 'gb', aliases: ['United Kingdom', 'British', 'Britain', 'England', 'UK'] },
  { code: 'us', aliases: ['United States', 'American', 'USA', 'US'] },
  { code: 'uy', aliases: ['Uruguay', 'Uruguayan'] },
  { code: 'uz', aliases: ['Uzbekistan', 'Uzbekistani'] },
  { code: 'vu', aliases: ['Vanuatu', 'Ni-Vanuatu', 'Ni Vanuatu'] },
  { code: 've', aliases: ['Venezuela', 'Venezuelan'] },
  { code: 'vn', aliases: ['Vietnam', 'Vietnamese'] },
  { code: 'ye', aliases: ['Yemen', 'Yemeni'] },
  { code: 'zm', aliases: ['Zambia', 'Zambian'] },
  { code: 'zw', aliases: ['Zimbabwe', 'Zimbabwean'] },
];

/**
 * TheMealDB areas that are deliberately left unmapped.
 *
 * Kept as documentation rather than a code path: "Channel Islander" names two
 * bailiwicks, each with its own banner, so there is no single country to show
 * and guessing one would state something false. These render the neutral
 * placeholder instead.
 */
export const UNMAPPED_AREAS = ['Channel Islander'];

/**
 * Text shown when TheMealDB supplies no usable area.
 *
 * TheMealDB omits `strArea` on some records, so a card can genuinely have no
 * country. It is stated rather than left blank, and no country is inferred from
 * the recipe name — the app does not claim a provenance it has not been told.
 */
export const UNKNOWN_CUISINE_LABEL = 'Cuisine not specified';

/**
 * Reduces a lookup key to a comparable form.
 *
 * Case, accents and punctuation are all noise here: TheMealDB sends "Malaysian",
 * a user might type "malaysian", "MALAYSIAN" or "Ni-Vanuatu", and the same code
 * has to answer for all of them. Decoding also folds the apostrophe in
 * "Cote d'Ivoire" into a space, so the alias matches either spelling.
 */
function normalizeKey(value) {
  if (value === undefined || value === null) return '';

  return String(value)
    .normalize('NFD')
    // Drop the combining marks left behind by the decomposition.
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    // Any run of punctuation or whitespace becomes a single space.
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    // "Thai cuisine" / "the Netherlands" should resolve like the bare name.
    .replace(/^(?:the)\s+/, '')
    .replace(/\s+cuisine$/, '')
    .trim();
}

/**
 * Builds the normalised alias -> code map once, at module load.
 *
 * Splitting this out of the declaration keeps the table above readable and
 * means a later entry that collides with an existing alias is simply ignored
 * rather than silently changing an established mapping.
 */
const CODES_BY_AREA = (() => {
  const map = new Map();

  for (const { code, aliases } of AREA_COUNTRY_CODES) {
    for (const alias of aliases) {
      const key = normalizeKey(alias);
      if (key && !map.has(key)) map.set(key, code);
    }
  }

  return map;
})();

/**
 * Resolves a TheMealDB `strArea` to an ISO 3166-1 alpha-2 country code.
 *
 * Accepts either spelling — "Malaysia" and "Malaysian" both give `my` — and
 * ignores case, accents, punctuation and stray whitespace.
 *
 * Returns `null` for a missing, empty or unmapped area, and for a mapped
 * country the flag library has no artwork for. Callers must treat `null` as "no
 * flag to draw" and show a neutral placeholder; there is deliberately no
 * default country, because guessing one would be presenting a guess as fact.
 *
 * @param {string} [area] A `strArea` value, in any capitalisation.
 * @returns {string|null} A lower-case alpha-2 code, or null.
 */
export function getCountryCode(area) {
  const code = CODES_BY_AREA.get(normalizeKey(area));

  // Both conditions matter: the mapping decides *which* country, the asset list
  // decides whether there is anything to draw for it.
  return code && FLAG_ASSET_CODES.has(code) ? code : null;
}

/**
 * Builds the `flag-icons` class list for an area.
 *
 * The one place the library's class names are assembled. Returning the whole
 * class list — rather than a bare code — means a component cannot emit a class
 * like `fi fi-null`: an unusable area yields `null` here, and the component
 * renders the placeholder branch instead.
 *
 * @param {string} [area] A `strArea` value, in any capitalisation.
 * @returns {string|null} e.g. `'fi fi-es'`, or null when no flag can be shown.
 */
export function getFlagClassName(area) {
  const code = getCountryCode(area);
  return code ? `fi fi-${code}` : null;
}

/** True when the area has a flag to draw, so no placeholder is shown for it. */
export function hasCountryFlag(area) {
  return getCountryCode(area) !== null;
}

export { normalizeKey, AREA_COUNTRY_CODES, FLAG_ASSET_CODES };
