export function formatAmount(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseAmount(input) {
  const cleaned = String(input ?? '').replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

// Reformats an amount input live as the person types: adds thousands
// commas and caps the decimal part at 2 digits, while keeping the
// cursor in the same spot relative to the digits around it.
export function attachLiveAmountFormatting(inputEl) {
  inputEl.addEventListener('input', () => {
    const prevValue = inputEl.value;
    const cursorPos = inputEl.selectionStart;
    const dotIndexPrev = prevValue.indexOf('.');
    const isAfterDot = dotIndexPrev !== -1 && cursorPos > dotIndexPrev;

    let raw = prevValue.replace(/[^0-9.]/g, '');
    const firstDot = raw.indexOf('.');
    if (firstDot !== -1) {
      raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
    }

    let [intPart, decPart] = raw.split('.');
    if (decPart !== undefined) {
      decPart = decPart.slice(0, 2);
    }

    const formattedInt = intPart ? Number(intPart).toLocaleString('en-US') : '';

    let newValue = formattedInt;
    if (decPart !== undefined) {
      newValue += '.' + decPart;
    } else if (raw.endsWith('.')) {
      newValue += '.';
    }

    inputEl.value = newValue;

    let newPos;
    if (isAfterDot) {
      // Cursor was in (or right after) the decimal part — keep it there,
      // relative to how many decimal digits come before it.
      let decimalDigitsBeforeCursor = prevValue
        .slice(dotIndexPrev + 1, cursorPos)
        .replace(/[^0-9]/g, '').length;
      const decimalDigitsInNew = decPart !== undefined ? decPart.length : 0;
      decimalDigitsBeforeCursor = Math.min(decimalDigitsBeforeCursor, decimalDigitsInNew);
      const dotIndexNew = newValue.indexOf('.');
      newPos = dotIndexNew + 1 + decimalDigitsBeforeCursor;
    } else {
      // Cursor was in the integer part (or there's no decimal point yet).
      const digitsBeforeCursor = prevValue.slice(0, cursorPos).replace(/[^0-9]/g, '').length;
      if (digitsBeforeCursor === 0) {
        newPos = 0;
      } else {
        newPos = newValue.length;
        let count = 0;
        for (let i = 0; i < newValue.length; i++) {
          if (/[0-9]/.test(newValue[i])) {
            count++;
            if (count === digitsBeforeCursor) {
              newPos = i + 1;
              break;
            }
          }
        }
      }
    }
    inputEl.setSelectionRange(newPos, newPos);
  });
}
