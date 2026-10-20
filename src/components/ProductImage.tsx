import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

interface ProductImageProps {
  src: string | null;
  alt: string;
  accent: string;
}

export function ProductImage({ src, alt, accent }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    const style = { '--accent': accent } as CSSProperties;

    return (
      <div className="product__placeholder" style={style} aria-hidden="true">
        {alt.trim().slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      className="product__image"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
