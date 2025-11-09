const EARTH_RADIUS_KM = 6371;
const DEFAULT_SPEED_KMH = 45;
const DEFAULT_SEGMENT_COLOR = '#1976d2';
const DEFAULT_ROAD_NAME = 'duong khong ten';

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

const convertGeoJsonCoords = (coords = []) =>
  coords.map(([lon, lat]) => [lat, lon]);

const normalizeModifierKey = (modifier = '') =>
  `${modifier ?? ''}`.toLowerCase().replace(/\s+/g, '_');

const modifierTextMap = {
  left: 'trai',
  right: 'phai',
  straight: 'thang',
  slight_left: 'cheo trai',
  slight_right: 'cheo phai',
  sharp_left: 'goc trai',
  sharp_right: 'goc phai',
  uturn: 'quay dau',
};

const getModifierText = (modifier) => {
  if (!modifier) return null;
  const key = normalizeModifierKey(modifier);
  return modifierTextMap[key] ?? modifier;
};

const formatRoadName = (name) =>
  name && name.trim().length ? name.trim() : DEFAULT_ROAD_NAME;

const formatStepDistanceLabel = (distanceMeters) => {
  if (typeof distanceMeters !== 'number' || distanceMeters <= 0) return null;
  return formatDistance(distanceMeters / 1000);
};

const buildStepDescription = (step = {}, { fromName, toName } = {}) => {
  const { maneuver = {}, name } = step;
  if (maneuver.instruction) return maneuver.instruction;

  const roadName = formatRoadName(name);
  const type = (maneuver.type || '').toLowerCase();
  const normalizedModifier = normalizeModifierKey(maneuver.modifier ?? '');
  const modifierText = getModifierText(maneuver.modifier);

  switch (type) {
    case 'depart': {
      const origin = fromName ?? 'diem bat dau';
      return `Roi ${origin} va di tren ${roadName}`;
    }
    case 'arrive': {
      const destination = toName ?? 'diem den';
      return `Den ${destination}`;
    }
    case 'roundabout': {
      const exitText = maneuver.exit ? `, ra o cua thu ${maneuver.exit}` : '';
      return `Vao vong xoay${exitText} de vao ${roadName}`;
    }
    case 'fork':
      return modifierText
        ? `Tai nga ba, giu ben ${modifierText} de vao ${roadName}`
        : `Tai nga ba, di theo ${roadName}`;
    case 'merge':
      return modifierText
        ? `Nhap lan ve ben ${modifierText} de vao ${roadName}`
        : `Nhap lan de vao ${roadName}`;
    case 'end_of_road':
    case 'end of road':
      return modifierText
        ? `Cuoi duong, re ${modifierText} vao ${roadName}`
        : `Cuoi duong, di vao ${roadName}`;
    case 'turn':
      if (normalizedModifier === 'uturn') {
        return `Quay dau de vao ${roadName}`;
      }
      if (modifierText && modifierText !== 'thang') {
        return `Re ${modifierText} vao ${roadName}`;
      }
      return `Re vao ${roadName}`;
    case 'continue':
      if (modifierText && modifierText !== 'thang') {
        return `Tiep tuc ${modifierText} tren ${roadName}`;
      }
      return `Tiep tuc tren ${roadName}`;
    default: {
      if (modifierText && modifierText !== 'thang') {
        return `Di theo huong ${modifierText} tren ${roadName}`;
      }
      return `Di tren ${roadName}`;
    }
  }
};

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

const baseSegmentData = ({ from, to, fromId, toId }) => ({
  id: `${fromId}-${toId}`,
  from,
  to,
  color: DEFAULT_SEGMENT_COLOR,
});

const buildLegInstructions = ({ leg, from, to, fromId, toId }) => {
  if (!leg?.steps?.length) return [];

  return leg.steps.map((step, index) => ({
    id: `${fromId}-${toId}-instruction-${index}`,
    text: buildStepDescription(step, {
      fromName: from?.name,
      toName: to?.name,
    }),
    distanceLabel: formatStepDistanceLabel(step.distance),
  }));
};

export const buildSegmentsFromLegs = ({
  legs = [],
  routeStopIds,
  stopById,
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

    const instructions = buildLegInstructions({
      leg,
      from,
      to,
      fromId,
      toId,
    });

    return {
      ...baseSegmentData({ from, to, fromId, toId }),
      distanceKm,
      durationMinutes,
      geometry: deriveSegmentGeometry(leg, [from.position, to.position]),
      instructions,
    };
  });
};

export const buildFallbackSegments = ({
  routeStopIds,
  stopById,
}) => {
  if (!Array.isArray(routeStopIds) || routeStopIds.length < 2) return [];

  return routeStopIds.slice(0, -1).map((fromId, index) => {
    const toId = routeStopIds[index + 1];
    const from = stopById[fromId];
    const to = stopById[toId];

    const distanceKm = haversineDistance(from.position, to.position);
    const durationMinutes = (distanceKm / DEFAULT_SPEED_KMH) * 60;

    return {
      ...baseSegmentData({ from, to, fromId, toId }),
      distanceKm,
      durationMinutes,
      geometry: [from.position, to.position],
      instructions: [],
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

export const convertRouteCoordinates = (route) =>
  convertGeoJsonCoords(route?.geometry?.coordinates ?? []);
