import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RoomIcon from '@mui/icons-material/Room';
import CloseIcon from '@mui/icons-material/Close';
import availableStopPng from '../assets/available-stop-marker.png';
import routeEndPng from '../assets/route-end-marker.png';
import routeStartPng from '../assets/route-start-marker.png';
import routeStopPng from '../assets/route-stop-marker.png';
import {
  formatDistance,
  formatDuration,
  haversineDistance,
} from '../utils/routeUtils.js';

const markerSize = {
  iconSize: [44, 64],
  iconAnchor: [22, 64],
  popupAnchor: [0, -56],
};

const startMarkerIcon = L.icon({
  iconUrl: routeStartPng,
  iconRetinaUrl: routeStartPng,
  ...markerSize,
});

const endMarkerIcon = L.icon({
  iconUrl: routeEndPng,
  iconRetinaUrl: routeEndPng,
  ...markerSize,
});

const routeMarkerIcon = L.icon({
  iconUrl: routeStopPng,
  iconRetinaUrl: routeStopPng,
  ...markerSize,
});

const availableMarkerIcon = L.icon({
  iconUrl: availableStopPng,
  iconRetinaUrl: availableStopPng,
  ...markerSize,
});

const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    const uniquePoints = new Set(points.map((point) => point.join(',')));
    if (uniquePoints.size < 2) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);

  return null;
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(event) {
      if (!onMapClick) return;
      const target = event.originalEvent?.target;
      if (target?.closest('.leaflet-interactive')) return;
      onMapClick(event);
    },
  });

  return null;
};

const MapView = ({
  base,
  allStops,
  routeStops,
  segments,
  routeStatus,
  routeError,
  routeCoordinates,
  defaultZoom,
  onAddStop,
  onAddCoordinateStop,
  onCreateStoreAtPoint,
  onBuildNearestRoute,
}) => {
  const routeStopIdSet = useMemo(
    () => new Set(routeStops.map((stop) => stop.id)),
    [routeStops],
  );
  const startStopId = routeStops[0]?.id ?? null;
  const endStopId =
    routeStops.length > 1 ? routeStops[routeStops.length - 1]?.id ?? null : null;

  const boundsPoints = useMemo(() => {
    if (routeCoordinates.length) {
      return routeCoordinates;
    }
    if (routeStops.length) {
      return routeStops.map((stop) => stop.position);
    }
    return [base.position];
  }, [routeCoordinates, routeStops, base.position]);

  const [mapContextInfo, setMapContextInfo] = useState(null);

  const handleMapClick = useCallback(
    (event) => {
      if (!event?.latlng) return;
      const clickPosition = [event.latlng.lat, event.latlng.lng];
      let nearest = null;

      allStops.forEach((stop) => {
        if (!stop || stop.ephemeral || !stop.position) return;
        const distanceKm = haversineDistance(clickPosition, stop.position);
        if (!Number.isFinite(distanceKm)) return;
        if (!nearest || distanceKm < nearest.distanceKm) {
          nearest = { stop, distanceKm };
        }
      });

      setMapContextInfo({
        latlng: event.latlng,
        position: {
          x: event.containerPoint?.x ?? 0,
          y: event.containerPoint?.y ?? 0,
        },
        nearest,
        showNearest: false,
      });
    },
    [allStops],
  );

  const handleCloseContext = useCallback(() => {
    setMapContextInfo(null);
  }, []);

  useEffect(() => {
    if (!mapContextInfo) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMapContextInfo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapContextInfo]);

  const handleNearestRoute = useCallback(() => {
    if (
      !mapContextInfo ||
      !mapContextInfo.nearest ||
      !mapContextInfo.nearest.stop?.id ||
      !onBuildNearestRoute
    ) {
      return;
    }
    const { latlng, nearest } = mapContextInfo;
    onBuildNearestRoute([latlng.lat, latlng.lng], nearest.stop.id);
    setMapContextInfo(null);
  }, [mapContextInfo, onBuildNearestRoute]);

  const handleQuickAddStop = useCallback(() => {
    if (!mapContextInfo || !onAddCoordinateStop) return;
    const { latlng } = mapContextInfo;
    onAddCoordinateStop([latlng.lat, latlng.lng]);
    setMapContextInfo(null);
  }, [mapContextInfo, onAddCoordinateStop]);

  const handleCreateStore = useCallback(() => {
    if (!mapContextInfo || !onCreateStoreAtPoint) return;
    const { latlng } = mapContextInfo;
    onCreateStoreAtPoint([latlng.lat, latlng.lng]);
    setMapContextInfo(null);
  }, [mapContextInfo, onCreateStoreAtPoint]);

  const coordinateLabel = useMemo(() => {
    if (!mapContextInfo) return '';
    return `${mapContextInfo.latlng.lat.toFixed(5)}, ${mapContextInfo.latlng.lng.toFixed(5)}`;
  }, [mapContextInfo]);

  return (
    <Box component="section" sx={{ position: 'relative', flex: 1 }}>
      <MapContainer
        center={base.position}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {allStops.map((stop) => {
          const isStopInRoute = routeStopIdSet.has(stop.id);
          const isStartStop = startStopId === stop.id;
          const isEndStop = endStopId === stop.id && !isStartStop;

          let markerIcon = availableMarkerIcon;
          if (isStartStop) {
            markerIcon = startMarkerIcon;
          } else if (isEndStop) {
            markerIcon = endMarkerIcon;
          } else if (isStopInRoute) {
            markerIcon = routeMarkerIcon;
          }

          let actionLabel = 'Them vao lo trinh';
          let actionDisabled = false;

          if (isStartStop) {
            actionLabel = 'Dang la diem bat dau';
            actionDisabled = true;
          } else if (isEndStop) {
            actionLabel = 'Dang la diem ket thuc';
            actionDisabled = true;
          } else if (isStopInRoute) {
            actionLabel = 'Da nam trong lo trinh';
            actionDisabled = true;
          }

          return (
            <Marker position={stop.position} key={stop.id} icon={markerIcon}>
              <Popup>
                <Stack spacing={1}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {stop.name}
                    </Typography>
                    {stop.description && (
                      <Typography variant="body2" color="text.secondary">
                        {stop.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {stop.position[0].toFixed(5)}, {stop.position[1].toFixed(5)}
                    </Typography>
                  </Stack>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={actionDisabled}
                    onClick={() => {
                      if (!actionDisabled && onAddStop) {
                        onAddStop(stop.id);
                      }
                    }}
                    fullWidth
                  >
                    {actionLabel}
                  </Button>
                </Stack>
              </Popup>
            </Marker>
          );
        })}

        {segments.map((segment) => (
          <Polyline
            key={segment.id}
            positions={segment.geometry}
            pathOptions={{
              color: segment.color,
              weight: 6,
              opacity: 0.9,
            }}
          />
        ))}

        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#1e88e5',
              weight: 4,
              opacity: 0.35,
            }}
          />
        )}

        <MapClickHandler onMapClick={handleMapClick} />
        <FitBounds points={boundsPoints} />
      </MapContainer>

      {mapContextInfo && (
        <Box
          sx={{
            position: 'absolute',
            transform: 'translate(-50%, -110%)',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: 4,
            p: 2,
            minWidth: 280,
            maxWidth: 320,
            zIndex: (theme) => (theme?.zIndex?.modal ?? 1300) + 1,
            pointerEvents: 'auto',
          }}
          style={{
            top: mapContextInfo.position.y,
            left: mapContextInfo.position.x,
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" fontWeight={700}>
                Diem vua chon
              </Typography>
              <IconButton size="small" onClick={handleCloseContext}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {coordinateLabel}
            </Typography>

            <Button
              variant="outlined"
              size="small"
              onClick={handleNearestRoute}
              disabled={!mapContextInfo.nearest || !onBuildNearestRoute}
            >
              Tim cua hang co duong di ngan nhat
            </Button>
            {mapContextInfo.showNearest && mapContextInfo.nearest && (
              <Box
                sx={{
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 1,
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {mapContextInfo.nearest.stop.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Khoang cach: {formatDistance(mapContextInfo.nearest.distanceKm)}
                </Typography>
              </Box>
            )}
            <Button
              variant="contained"
              size="small"
              color="primary"
              onClick={handleQuickAddStop}
              disabled={!onAddCoordinateStop}
            >
              Them diem vao diem dung
            </Button>

            <Button
              variant="contained"
              size="small"
              color="secondary"
              onClick={handleCreateStore}
              disabled={!onCreateStoreAtPoint}
            >
              Them cua hang tai diem nay
            </Button>
          </Stack>
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          boxShadow: 3,
          p: 2,
          minWidth: 240,
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <RoomIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              Lo trinh hien tai
            </Typography>
          </Stack>

          {routeStatus === 'loading' ? (
            <Typography variant="body2" color="text.secondary">
              Dang truy van tu OSRM, vui long doi...
            </Typography>
          ) : routeStops.length < 2 ? (
            <Typography variant="body2" color="text.secondary">
              Chon toi thieu hai diem de xay dung lo trinh.
            </Typography>
          ) : (
            segments.map((segment) => (
              <Stack
                key={segment.id}
                spacing={0.5}
                sx={{
                  borderRadius: 1,
                  px: 1,
                  py: 0.75,
                  backgroundColor: 'rgba(25, 118, 210, 0.06)',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {`${segment.from.name} -> ${segment.to.name}`}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    label={formatDuration(segment.durationMinutes)}
                    sx={{
                      backgroundColor: segment.color,
                      color: 'white',
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDistance(segment.distanceKm)}
                  </Typography>
                </Stack>
              </Stack>
            ))
          )}

          {routeError && (
            <Typography variant="caption" color="error">
              {routeError}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default MapView;
