// Shrinks an element's font-size step by step until its content fits on
// one line, down to a minimum floor. Call after the element is in the DOM
// and visible, so scrollWidth/clientWidth reflect real layout.
export function fitText(el, { max = 1.3, min = 0.8, step = 0.05 } = {}) {
  el.style.whiteSpace = 'nowrap';
  let size = max;
  el.style.fontSize = `${size}rem`;
  while (el.scrollWidth > el.clientWidth && size > min) {
    size = Math.round((size - step) * 100) / 100;
    el.style.fontSize = `${size}rem`;
  }
}
