import osrmTextInstructionsFactory from 'osrm-text-instructions';

const createTextInstructions =
  typeof osrmTextInstructionsFactory === 'function'
    ? osrmTextInstructionsFactory
    : osrmTextInstructionsFactory?.default;

const EARTH_RADIUS_KM = 6371;
const DEFAULT_SPEED_KMH = 45;
const DEFAULT_SEGMENT_COLOR = '#1976d2';
const DEFAULT_ROAD_NAME = 'đường không tên';
const INSTRUCTION_LANGUAGE = 'vi';

const textInstructionCompiler = (() => {
  if (!createTextInstructions) return null;
  try {
    return createTextInstructions('v5');
  } catch (error) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.warn('Failed to initialize OSRM text instructions', error);
    }
    return null;
  }
})();

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
  if (minutes < 1) return '< 1 phút';
  if (minutes < 60) return `${Math.round(minutes)} phút`;

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours} giờ` : `${hours} giờ ${mins} phút`;
};

const convertGeoJsonCoords = (coords = []) =>
  coords.map(([lon, lat]) => [lat, lon]);

const normalizeModifierKey = (modifier = '') =>
  `${modifier ?? ''}`.toLowerCase().replace(/\s+/g, '_');

const modifierTextMap = {
  left: 'trái',
  right: 'phải',
  straight: 'thẳng',
  slight_left: 'chéo trái',
  slight_right: 'chéo phải',
  sharp_left: 'góc trái',
  sharp_right: 'góc phải',
  uturn: 'quay đầu',
};

const getModifierText = (modifier) => {
  if (!modifier) return null;
  const key = normalizeModifierKey(modifier);
  return modifierTextMap[key] ?? modifier;
};

const compileOsrmInstruction = (step = {}, options = {}) => {
  if (!textInstructionCompiler || !step?.maneuver) return null;
  try {
    const text = textInstructionCompiler.compile(INSTRUCTION_LANGUAGE, step, {
      legIndex: options.legIndex ?? 0,
      legCount: options.legCount ?? 1,
      waypointName: options.toName,
    });
    return typeof text === 'string' && text.trim().length ? text.trim() : null;
  } catch {
    return null;
  }
};

const formatRoadName = (name) =>
  name && name.trim().length ? name.trim() : DEFAULT_ROAD_NAME;

const formatStepDistanceLabel = (distanceMeters) => {
  if (typeof distanceMeters !== 'number' || distanceMeters <= 0) return null;
  return formatDistance(distanceMeters / 1000);
};

const buildFallbackStepDescription = (step = {}, { fromName, toName } = {}) => {
  const { maneuver = {}, name } = step;
  if (maneuver.instruction) return maneuver.instruction;

  const roadName = formatRoadName(name);
  const type = (maneuver.type || '').toLowerCase();
  const normalizedModifier = normalizeModifierKey(maneuver.modifier ?? '');
  const modifierText = getModifierText(maneuver.modifier);

  switch (type) {
    case 'depart': {
      const origin = fromName ?? 'diem bat dau';
      return `Rời ${origin} và đi trên ${roadName}`;
    }
    case 'arrive': {
      const destination = toName ?? 'diem den';
      return `Den ${destination}`;
    }
    case 'roundabout': {
      const exitText = maneuver.exit ? `, ra ở cửa thứ ${maneuver.exit}` : '';
      return `Vào vòng xoay${exitText} để vào ${roadName}`;
    }
    case 'fork':
      return modifierText
        ? `Tại ngã ba, giữ bên ${modifierText} để vào ${roadName}`
        : `Tại ngã ba, đi theo ${roadName}`;
    case 'merge':
      return modifierText
        ? `Nhập làn về bên ${modifierText} để vào ${roadName}`
        : `Nhập làn để vào ${roadName}`;
    case 'end_of_road':
    case 'end of road':
      return modifierText
        ? `Cuối đường, rẽ ${modifierText} vào ${roadName}`
        : `Cuối đường, đi vào ${roadName}`;
    case 'turn':
      if (normalizedModifier === 'uturn') {
        return `Quay đầu để vào ${roadName}`;
      }
      if (modifierText && modifierText !== 'thang') {
        return `Rẽ ${modifierText} vào ${roadName}`;
      }
      return `Rẽ vào ${roadName}`;
    case 'continue':
      if (modifierText && modifierText !== 'thang') {
        return `Tiếp tục ${modifierText} trên ${roadName}`;
      }
      return `Tiếp tục trên ${roadName}`;
    default: {
      if (modifierText && modifierText !== 'thang') {
        return `Đi theo hướng ${modifierText} trên ${roadName}`;
      }
      return `Đi trên ${roadName}`;
    }
  }
};

const buildStepDescription = (step = {}, context = {}) => {
  if (step?.maneuver?.instruction) return step.maneuver.instruction;

  const compiled = compileOsrmInstruction(step, context);
  if (compiled) return compiled;

  return buildFallbackStepDescription(step, context);
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

const buildLegInstructions = ({
  leg,
  from,
  to,
  fromId,
  toId,
  legIndex = 0,
  legCount = 1,
}) => {
  if (!leg?.steps?.length) return [];

  return leg.steps.map((step, index) => {
    const maneuverType = step?.maneuver?.type?.toLowerCase?.() ?? null;
    const normalizedModifier = normalizeModifierKey(step?.maneuver?.modifier ?? '');

    return {
      id: `${fromId}-${toId}-instruction-${index}`,
      text: buildStepDescription(step, {
        fromName: from?.name,
        toName: to?.name,
        legIndex,
        legCount,
      }),
      distanceLabel: formatStepDistanceLabel(step.distance),
      maneuverType,
      maneuverModifier: normalizedModifier || null,
    };
  });
};

export const buildSegmentsFromLegs = ({
  legs = [],
  routeStopIds,
  stopById,
}) => {
  if (!Array.isArray(routeStopIds) || routeStopIds.length < 2) return [];

  const legCount = routeStopIds.length - 1;

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
      legIndex: index,
      legCount,
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
