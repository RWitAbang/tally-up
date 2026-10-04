const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Dates arrive as "YYYY-MM-DD" text from Supabase and from <input type="date">.
// Parsing that string directly with `new Date(...)` reads it as UTC midnight,
// which can roll back a day once converted to local time — building the Date
// from its own parts in local time avoids that entirely.
export function parseDateLocal(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "YYYY-MM-DD" is unambiguous but not friendly to read, and a raw numeric
// format like 04/10/2026 is genuinely ambiguous (4 Oct or 10 April,
// depending on the reader). Spelling the month out removes the ambiguity.
export function formatDateFriendly(dateString) {
  const d = parseDateLocal(dateString);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
