import type { CSSProperties } from 'react';

interface StoreBadgeProps {
  name: string;
  shortName: string;
  color: string;
}

export function StoreBadge({ name, shortName, color }: StoreBadgeProps) {
  const style = { '--store-color': color } as CSSProperties;

  return (
    <span className="store-badge" style={style}>
      <span className="store-badge__mark">{shortName}</span>
      <span className="store-badge__name">{name}</span>
    </span>
  );
}
