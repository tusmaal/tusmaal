import { BRAND } from '../../config/brandAssets';

/**
 * @param {'onDark'|'onLight'} variant — onDark = white wordmark, onLight = navy wordmark
 * @param {'nav'|'footer'|'auth'|'sidebar'} size
 */
export default function BrandLogo({
  variant = 'onDark',
  size = 'nav',
  iconOnly = false,
  className = '',
  alt = 'Tusmaal',
}) {
  const src = variant === 'onLight' ? BRAND.logoOnLight : BRAND.logoOnDark;
  const sizeClass = iconOnly ? 'brand-logo--icon' : `brand-logo--${size}`;

  return (
    <img
      src={src}
      alt={alt}
      className={`brand-logo ${sizeClass}${className ? ` ${className}` : ''}`}
      decoding="async"
    />
  );
}

export { BRAND };
