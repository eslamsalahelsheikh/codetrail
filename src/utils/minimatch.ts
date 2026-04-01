/**
 * Lightweight glob matching — handles ** and * patterns
 * without pulling in an npm dependency.
 */
export function minimatch(filePath: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*');

  return new RegExp(`^${regexStr}$`).test(filePath);
}
