const EARTH_RADIUS_KM = 6371;
const DEFAULT_SPEED_KMH = 45;

const toRadians = (deg) => (deg * Math.PI) / 180;

export const haversineDistance = (coordsA, coordsB) => {
  const [lat1, lon1] = coordsA;
  const [lat2, lon2] = coordsB;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

export const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

export const formatDuration = (minutes) => {
  if (minutes < 1) return '< 1 phut';
  if (minutes < 60) return `${Math.round(minutes)} phut`;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours} gio` : `${hours} gio ${mins} phut`;
};

export const getSegmentKey = (fromId, toId) =>
  [fromId, toId].sort().join('__');

export const buildInitialTrafficMap = (roadNetwork = []) => {
  const traffic = {};
  roadNetwork.forEach(({ from, to, traffic: level }) => {
    traffic[getSegmentKey(from, to)] = level;
  });
  return traffic;
};

const convertGeoJsonCoords = (coords = []) =>
  coords.map(([lon, lat]) => [lat, lon]);

const mergeStepsGeometry = (steps = []) => {
  const merged = [];
  steps.forEach((step, index) => {
    const coords = convertGeoJsonCoords(step.geometry?.coordinates ?? []);
    if (!coords.length) return;
    if (index === 0) {
      merged.push(...coords);
    } else {
      merged.push(...coords.slice(1));
    }
  });
  return merged;
};

const deriveSegmentGeometry = (leg, fallbackGeometry) => {
  if (!leg) return fallbackGeometry;
  if (leg.steps?.length) {
    const coords = mergeStepsGeometry(leg.steps);
    if (coords.length) return coords;
  }
  if (leg.geometry?.coordinates?.length) {
    const coords = convertGeoJsonCoords(leg.geometry.coordinates);
    if (coords.length) return coords;
  }
  return fallbackGeometry;
};

const baseSegmentData = ({
  from,
  to,
  trafficMap,
  trafficPresets,
  fromId,
  toId,
}) => {
  const trafficLevel = trafficMap[getSegmentKey(fromId, toId)] ?? 'moderate';
  const trafficInfo = trafficPresets[trafficLevel];

  return {
    id: `${fromId}-${toId}`,
    from,
    to,
    trafficLevel,
    color: trafficInfo?.color ?? '#1976d2',
    label: trafficInfo?.label ?? 'Dang cap nhat',
    speedKmh: trafficInfo?.speedKmh ?? DEFAULT_SPEED_KMH,
  };
};

export const buildSegmentsFromLegs = ({
  legs = [],
  routeStopIds,
  stopById,
  trafficMap,
  trafficPresets,
}) => {
  if (!Array.isArray(routeStopIds) || routeStopIds.length < 2) return [];

  return routeStopIds.slice(0, -1).map((fromId, index) => {
    const toId = routeStopIds[index + 1];
    const from = stopById[fromId];
    const to = stopById[toId];
    const leg = legs[index];

    const distanceKm = leg?.distance ? leg.distance / 1000 : haversineDistance(from.position, to.position);
    const durationMinutes = leg?.duration
      ? leg.duration / 60
      : (distanceKm / DEFAULT_SPEED_KMH) * 60;

    return {
      ...baseSegmentData({ from, to, trafficMap, trafficPresets, fromId, toId }),
      distanceKm,
      durationMinutes,
      geometry: deriveSegmentGeometry(leg, [from.position, to.position]),
    };
  });
};

export const buildFallbackSegments = ({
  routeStopIds,
  stopById,
  trafficMap,
  trafficPresets,
}) => {
  if (!Array.isArray(routeStopIds) || routeStopIds.length < 2) return [];

  return routeStopIds.slice(0, -1).map((fromId, index) => {
    const toId = routeStopIds[index + 1];
    const from = stopById[fromId];
    const to = stopById[toId];

    const distanceKm = haversineDistance(from.position, to.position);
    const durationMinutes = (distanceKm / DEFAULT_SPEED_KMH) * 60;

    return {
      ...baseSegmentData({ from, to, trafficMap, trafficPresets, fromId, toId }),
      distanceKm,
      durationMinutes,
      geometry: [from.position, to.position],
    };
  });
};

export const getRouteTotals = (segments) =>
  segments.reduce(
    (acc, segment) => ({
      distanceKm: acc.distanceKm + segment.distanceKm,
      durationMinutes: acc.durationMinutes + segment.durationMinutes,
    }),
    { distanceKm: 0, durationMinutes: 0 },
  );

const TRAFFIC_SEQUENCE = ['light', 'moderate', 'heavy'];

const moveTrafficLevel = (current, direction) => {
  const idx = TRAFFIC_SEQUENCE.indexOf(current);
  if (idx === -1) return current;
  const nextIndex = Math.min(
    TRAFFIC_SEQUENCE.length - 1,
    Math.max(0, idx + direction),
  );
  return TRAFFIC_SEQUENCE[nextIndex];
};

export const randomizeTraffic = (trafficMap) => {
  const entries = Object.entries(trafficMap);
  if (!entries.length) return trafficMap;

  const updated = { ...trafficMap };

  entries.forEach(([key, level]) => {
    const roll = Math.random();

    if (roll < 0.2) {
      updated[key] = moveTrafficLevel(level, -1);
    } else if (roll > 0.8) {
      updated[key] = moveTrafficLevel(level, 1);
    }
  });

  return updated;
};

export const convertRouteCoordinates = (route) =>
  convertGeoJsonCoords(route?.geometry?.coordinates ?? []);
