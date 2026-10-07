/**
 * Responsive image primitive.
 *
 * Renders a `<picture>` so a WebP source can be offered ahead of the JPEG
 * fallback, and applies the loading/decoding hints every image in the app
 * needs. The hero is the only eager image; everything else is lazy.
 *
 * @param {object} props
 * @param {string} props.src Fallback image URL.
 * @param {string} [props.srcSet] WebP sources, as `url width, url width`.
 * @param {string} props.alt Alternative text. Pass '' for decorative images.
 * @param {string} [props.sizes] `sizes` attribute for the srcSet.
 * @param {boolean} [props.eager] Load immediately (above-the-fold images only).
 * @param {string} [props.className]
 */
export function Picture({
  src,
  srcSet,
  alt,
  sizes,
  eager = false,
  className,
  width,
  height,
  ...rest
}) {
  return (
    <picture>
      {srcSet ? <source type="image/webp" srcSet={srcSet} sizes={sizes} /> : null}
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        // `high` on the hero only: it is the Largest Contentful Paint element.
        // Lowercase on purpose — React 18 forwards unknown attributes verbatim
        // and warns about the camelCase spelling.
        fetchpriority={eager ? 'high' : 'auto'}
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'sync' : 'async'}
        {...rest}
      />
    </picture>
  );
}

export default Picture;