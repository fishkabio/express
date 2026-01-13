/**
 * Converts JS timestamp or date to ISO 8601 format (without milliseconds).
 * Example: "2012-07-20T01:19:13Z".
 * @Internal
 */
export function toApiDateString(value: number | Date): string {
  const resultWithMillis = (typeof value === 'number' ? new Date(value) : value).toISOString();
  return `${resultWithMillis.substring(0, resultWithMillis.length - 5)}Z`;
}
