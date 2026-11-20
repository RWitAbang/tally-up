// Savings, Current, and Utility Card are Naira accounts; Domiciliary and
// Domiciliary Card are foreign-currency accounts (Dollar or Pound). The two
// groups never mix. Shared by Account Setup (one account) and the
// multi-account workbook import (several at once), so the rule can't drift
// between the two.
export function isDomiciliaryType(type) {
  return type === 'domiciliary' || type === 'domiciliary_card';
}

export function allowedCurrenciesForType(type) {
  return isDomiciliaryType(type) ? ['USD', 'GBP'] : ['NGN'];
}

// Disables whichever of a currency <select>'s options aren't valid for
// `type`. Takes the select element itself rather than assuming a single
// page-level one, so the same rule applies whether there's one select
// (Account Setup) or one per row in a list (workbook import).
export function restrictCurrencyOptions(currencySelect, type) {
  const allowed = allowedCurrenciesForType(type);
  for (const option of currencySelect.options) {
    option.disabled = !allowed.includes(option.value);
  }
}
