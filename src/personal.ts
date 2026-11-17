/**
 * Strip an email, a phone-shaped number, or a street address from a typed
 * answer before it is sent to Grok. A plain number is left alone. The
 * removed text is not logged or stored.
 *
 * A street needs 1 to 3 capitalized words between the number and the
 * street word ("123 Main Street"). The street word itself may be any case.
 * A phone-shaped number followed by "=" is an equation and stays.
 */
const STREET_WORD =
  "(?:[Ss][Tt][Rr][Ee][Ee][Tt]|[Aa][Vv][Ee][Nn][Uu][Ee]|[Bb][Oo][Uu][Ll][Ee][Vv][Aa][Rr][Dd]|[Dd][Rr][Ii][Vv][Ee]|[Cc][Oo][Uu][Rr][Tt]|[Pp][Ll][Aa][Cc][Ee]|[Ll][Aa][Nn][Ee]|[Rr][Oo][Aa][Dd]|[Bb][Ll][Vv][Dd]|[Aa][Vv][Ee]|[Ww][Aa][Yy]|[Ss][Tt]|[Rr][Dd]|[Ll][Nn]|[Dd][Rr]|[Cc][Tt]|[Pp][Ll])";

export function removePersonalDetails(answer: string): string {
  const email = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const phone =
    /(?:(?:\+1[\s.-]?)?(?:\(\d{3}\)[\s.-]?\d{3}[\s.-]\d{4}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b)|\b\d{3}-\d{4}\b)(?!\s*=)/g;
  const street = new RegExp(String.raw`\b\d+\s+(?:[A-Z][A-Za-z'.-]*\s+){1,3}${STREET_WORD}\b\.?`, "g");
  return answer.replace(email, "[removed]").replace(phone, "[removed]").replace(street, "[removed]");
}
