// Decoder for the encoded-polyline format OpenRouteService returns for a
// route's geometry (the same format Google published; precision 5).
//
// We store routes encoded rather than as GeoJSON because it is six times
// smaller — 1 KB instead of 6 KB for a 33 km route — and the 15 preset
// destinations ship their geometry with the page.

/**
 * @param {string} encoded
 * @returns {Array<[number, number]>} [lat, lon] pairs, in Leaflet's order
 */
export function decodePolyline(encoded) {
  if (typeof encoded !== 'string' || encoded.length === 0) return [];

  const points = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    // Each coordinate is a zig-zag encoded delta, in 5-bit chunks.
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lon / 1e5]);
  }

  return points;
}
