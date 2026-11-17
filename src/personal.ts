/**
 * Strip an email, a phone-shaped number, or a street address from a typed
 * answer before it is sent to Grok. A plain number is left alone. The
 * removed text is not logged or stored.
 */
export function removePersonalDetails(answer: string): string {
  const email = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const phone =
    /(?:\+1[\s.-]?)?(?:\(\d{3}\)[\s.-]?\d{3}[\s.-]\d{4}|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b)|\b\d{3}-\d{4}\b/g;
  const street =
    /\b\d+\s+(?:[A-Za-z][A-Za-z'.-]*\s+){0,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\b\.?/gi;
  return answer.replace(email, "[removed]").replace(phone, "[removed]").replace(street, "[removed]");
}
