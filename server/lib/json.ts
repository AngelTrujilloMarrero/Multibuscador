export function extractJsonObjectAfter(
  source: string,
  marker: string
): Record<string, unknown> | null {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const start = source.indexOf('{', markerIndex + marker.length);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1)) as Record<
            string,
            unknown
          >;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}
