const ACCOUNT_TYPE_LABELS = {
  savings: 'Savings',
  current: 'Current',
  domiciliary: 'Domiciliary',
  utility_card: 'Utility Card',
  domiciliary_card: 'Domiciliary Card',
};

export function accountTypeLabel(type) {
  return ACCOUNT_TYPE_LABELS[type] || type;
}
