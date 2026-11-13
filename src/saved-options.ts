/** Keep each page's settings independent; storage may be unavailable or outdated. */
export function rememberOptions(root: HTMLElement, page: 'generate' | 'simulation') {
  const key = `palindrome-${page}-options-v1`;
  const controls = [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.generation-options input, .generation-options select')];
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const control of controls) {
        const value = (saved as Record<string, unknown>)[control.id];
        if (control instanceof HTMLInputElement && control.type === 'checkbox') {
          if (typeof value === 'boolean') control.checked = value;
        } else if (typeof value === 'string') {
          if (!(control instanceof HTMLSelectElement) || [...control.options].some(option => option.value === value)) control.value = value;
        }
      }
    }
  } catch { /* Keep defaults if saved settings cannot be read. */ }

  const save = () => {
    const values = Object.fromEntries(controls.map(control => [control.id,
      control instanceof HTMLInputElement && control.type === 'checkbox' ? control.checked : control.value,
    ]));
    try { localStorage.setItem(key, JSON.stringify(values)); } catch { /* Settings still work without storage. */ }
  };
  for (const control of controls) {
    control.addEventListener('input', save);
    control.addEventListener('change', save);
  }
}
