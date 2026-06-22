import { NextResponse } from 'next/server';

// ─── Coordinate extraction — tries every known Google Maps URL format ────────
function extractLatLng(url: string): { lat: number; lng: number } | null {
  const patterns = [
    // @lat,lng,zoom  (most common for /maps/place/* and /maps?* links)
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    // ?q=lat,lng or &q=lat,lng
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    // ?ll=lat,lng
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    // /place/lat+lng or /place/lat,lng
    /\/place\/(-?\d+\.\d+)[+,](-?\d+\.\d+)/,
    // !3d<lat>!4d<lng>  (embedded URLs, directions links)
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    // center=lat,lng
    /center=(-?\d+\.\d+),(-?\d+\.\d+)/,
    // cbll=lat,lng  (Street View)
    /cbll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];

  for (const rx of patterns) {
    const m = url.match(rx);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }
  return null;
}

// ─── Extract place/CID from URL ──────────────────────────────────────────────
function extractPlaceQuery(url: string): string {
  // /maps/place/PLACE_NAME/@...
  const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
  if (placeMatch?.[1]) {
    const raw = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
    // Filter out pure coordinate strings like "-12.34+56.78"
    if (!/^-?\d+\.\d+[+,]-?\d+\.\d+$/.test(raw)) return raw;
  }
  // ?q= or &q=
  const qMatch = url.match(/[?&]q=([^&]+)/);
  if (qMatch?.[1]) return decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
  // ?query=
  const queryMatch = url.match(/[?&]query=([^&]+)/);
  if (queryMatch?.[1]) return decodeURIComponent(queryMatch[1].replace(/\+/g, ' ')).trim();

  return '';
}

// ─── Follow redirect robustly ─────────────────────────────────────────────────
async function resolveRedirect(shortUrl: string): Promise<string> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  // Try HEAD first (faster, no body)
  try {
    const res = await fetch(shortUrl, { method: 'HEAD', redirect: 'follow', headers });
    if (res.url && res.url !== shortUrl) return res.url;
  } catch { /* ignore */ }

  // Fallback: full GET
  try {
    const res = await fetch(shortUrl, { method: 'GET', redirect: 'follow', headers });
    if (res.url) return res.url;
  } catch { /* ignore */ }

  return shortUrl;
}

// ─── Build address parts from Google geocode result ───────────────────────────
function parseAddressComponents(components: any[]): { city: string; district: string; state: string; pincode: string } {
  let city = '', district = '', state = '', pincode = '';
  for (const c of components) {
    if (c.types.includes('locality'))                     city     = c.long_name;
    else if (!city && c.types.includes('sublocality_level_1')) city = c.long_name;
    if (c.types.includes('administrative_area_level_2'))  district = c.long_name;
    if (c.types.includes('administrative_area_level_1'))  state    = c.long_name;
    if (c.types.includes('postal_code'))                  pincode  = c.long_name;
  }
  return { city, district, state, pincode };
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url')?.trim();

  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration: Missing Google Maps API Key.' }, { status: 500 });
  }

  try {
    // ── Step 1: Resolve short/redirect URLs ──────────────────────────────────
    let finalUrl = rawUrl;
    const needsRedirect =
      rawUrl.includes('maps.app.goo.gl') ||
      rawUrl.includes('goo.gl/maps') ||
      rawUrl.includes('g.co/maps') ||
      (!rawUrl.includes('google.com/maps') && rawUrl.length < 80);

    if (needsRedirect) {
      finalUrl = await resolveRedirect(rawUrl);
      console.log('[resolve-map-link] Resolved short URL to:', finalUrl);
    }

    // ── Step 2: Try direct coordinate extraction from the final URL ──────────
    const coords = extractLatLng(finalUrl);
    console.log('[resolve-map-link] Coords from URL:', coords, '| URL:', finalUrl);

    if (coords) {
      // Reverse geocode with Google Geocoding API
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${API_KEY}`
      );
      const geoData = await geoRes.json();
      console.log('[resolve-map-link] Geocode status:', geoData.status);

      if (geoData.status === 'OK' && geoData.results.length > 0) {
        const result = geoData.results[0];
        const { city, district, state, pincode } = parseAddressComponents(result.address_components);
        return NextResponse.json({
          lat: coords.lat, lng: coords.lng,
          placeId: result.place_id,
          address: result.formatted_address,
          city, district, state, pincode,
          finalUrl,
        });
      }

      // Geocode API failed but we have coords — return them without address
      return NextResponse.json({
        lat: coords.lat, lng: coords.lng,
        address: '', city: '', district: '', state: '', pincode: '',
        finalUrl,
      });
    }

    // ── Step 3: Try place name / text search ─────────────────────────────────
    const placeQuery = extractPlaceQuery(finalUrl) || extractPlaceQuery(rawUrl);
    console.log('[resolve-map-link] Place query:', placeQuery);

    if (placeQuery) {
      // Use Geocoding API text search (simpler, single request)
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeQuery)}&key=${API_KEY}`
      );
      const geoData = await geoRes.json();
      console.log('[resolve-map-link] Text geocode status:', geoData.status);

      if (geoData.status === 'OK' && geoData.results.length > 0) {
        const result = geoData.results[0];
        const { lat, lng } = result.geometry.location;
        const { city, district, state, pincode } = parseAddressComponents(result.address_components);
        return NextResponse.json({
          lat, lng,
          placeId: result.place_id,
          address: result.formatted_address,
          city, district, state, pincode,
          finalUrl,
        });
      }

      // Also try Places Find Place API as extra fallback
      const findRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(placeQuery)}&inputtype=textquery&fields=place_id,geometry,formatted_address,address_components&key=${API_KEY}`
      );
      const findData = await findRes.json();
      console.log('[resolve-map-link] FindPlace status:', findData.status);

      if (findData.status === 'OK' && findData.candidates?.length > 0) {
        const c = findData.candidates[0];
        const { lat, lng } = c.geometry.location;
        const { city, district, state, pincode } = parseAddressComponents(c.address_components || []);
        return NextResponse.json({
          lat, lng,
          placeId: c.place_id,
          address: c.formatted_address,
          city, district, state, pincode,
          finalUrl,
        });
      }
    }

    // ── Final fallback: nothing worked ────────────────────────────────────────
    console.error('[resolve-map-link] All methods failed for URL:', rawUrl, '| Final URL:', finalUrl);
    return NextResponse.json(
      { error: 'Could not extract location from this Google Maps link. Please try a different link format or pin location manually on the map.' },
      { status: 400 }
    );

  } catch (err: any) {
    console.error('[resolve-map-link] Exception:', err?.message || err);
    return NextResponse.json({ error: 'Server error while resolving map link.' }, { status: 500 });
  }
}
