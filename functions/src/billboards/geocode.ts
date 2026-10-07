/**
 * Turns a US street address into map coordinates, for the Notion "Address"
 * column when it is a Place (map) property. Notion's API can't geocode by
 * itself; it only accepts latitude/longitude.
 *
 * Uses the US Census Bureau geocoder: free, no API key, US addresses only
 * (which matches our US-only shipping). New buildings, PO boxes and typos
 * may not match; callers treat "no match" as normal and fall back to text.
 */
import type { ShippingAddress } from '../contact/types';

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/address';

export interface GeoPoint {
  lat: number;
  lon: number;
}

interface CensusResponse {
  result?: {
    addressMatches?: Array<{ coordinates?: { x?: number; y?: number } }>;
  };
}

/** Coordinates for the address, or `undefined` if the Census has no match. */
export async function geocodeUsAddress(a: ShippingAddress): Promise<GeoPoint | undefined> {
  const params = new URLSearchParams({
    street: a.street,
    city: a.city,
    state: a.state,
    zip: a.zip,
    benchmark: 'Public_AR_Current',
    format: 'json',
  });
  const res = await fetch(`${CENSUS_URL}?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Census geocoder ${res.status}`);
  const body = (await res.json()) as CensusResponse;
  const c = body.result?.addressMatches?.[0]?.coordinates;
  if (typeof c?.x !== 'number' || typeof c?.y !== 'number') return undefined;
  return { lat: c.y, lon: c.x };
}
