let mapsPromise = null;

// Load Google Maps JS API (with Places) once and return google object
export async function loadGoogleMaps() {
  if (typeof window === 'undefined') return null;
  if (window.google?.maps) return window.google;
  if (mapsPromise) return mapsPromise;

  mapsPromise = (async () => {
    const res = await fetch('/api/maps-key');
    const data = await res.json().catch(() => ({}));
    const apiKey = data.apiKey || '';
    if (!apiKey) throw new Error('Maps API key missing');

    const scriptId = 'google-maps-js';
    const existing = document.getElementById(scriptId);
    if (!existing) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
      });
      document.head.appendChild(script);
    } else if (existing.dataset.loaded === 'true' || window.google?.maps) {
      // already loaded
    } else {
      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
      }, { once: true });
    }

    if (!window.google?.maps) {
      await new Promise((resolve, reject) => {
        const script = document.getElementById(scriptId);
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), { once: true });
      });
    }

    if (!window.google?.maps) throw new Error('Google Maps not available');
    return window.google;
  })();

  return mapsPromise;
}
