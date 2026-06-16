export interface GeocodeResult {
  country: string;
  state: string;
  district: string;
  city: string;
  locality: string;
  village: string;
  road: string;
  postalCode: string;
  formattedAddress: string;
}

/**
 * Performs reverse geocoding on coordinates using the OpenStreetMap Nominatim API.
 * Ensures custom User-Agent compliance and includes an abort-based timeout (8 seconds).
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<GeocodeResult> => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'OXY-HR-PRO-Address-Verification/1.0 (admin@oxyhotels.com)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Nominatim HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.address) {
      throw new Error('No address details resolved for these coordinates.');
    }

    const addr = data.address;

    // Standardized fallback mapping of Nominatim addresses
    const country = addr.country || '';
    const state = addr.state || addr.region || '';
    
    // District could be represented in multiple keys
    const district = addr.state_district || addr.district || addr.county || '';
    
    // City could fall back to town, municipality, or suburb (if city is missing)
    const city = addr.city || addr.town || addr.municipality || addr.city_district || '';
    
    // Locality corresponds to suburb, neighbourhood, quarter or locality
    const locality = addr.suburb || addr.neighbourhood || addr.locality || addr.quarter || '';
    
    // Village mapping
    const village = addr.village || addr.hamlet || addr.isolated_dwelling || '';
    
    // Road mappings
    const road = addr.road || addr.pedestrian || addr.path || addr.square || '';
    
    const postalCode = addr.postcode || '';
    const formattedAddress = data.display_name || '';

    return {
      country,
      state,
      district,
      city,
      locality,
      village,
      road,
      postalCode,
      formattedAddress
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Reverse geocoding request timed out after 8 seconds.');
    }
    throw new Error(err.message || 'Failed to resolve address coordinates.');
  }
};
