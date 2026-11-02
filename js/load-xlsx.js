// SheetJS's full build is ~950KB — too heavy to load on every page visit
// when most visits never touch Export or Import. Loaded on demand instead,
// the first time it's actually needed, and cached so later calls are free.
let xlsxPromise = null;

export function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxPromise) return xlsxPromise;

  xlsxPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => {
      xlsxPromise = null;
      reject(new Error("couldn't load the Excel library — check your connection and try again"));
    };
    document.head.appendChild(script);
  });

  return xlsxPromise;
}
