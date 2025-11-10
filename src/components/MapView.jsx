import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
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
import CloseIcon from '@mui/icons-material/Close';
import availableStopPng from '../assets/available-stop-marker.png';
import routeEndPng from '../assets/route-end-marker.png';
import routeStartPng from '../assets/route-start-marker.png';
import routeStopPng from '../assets/route-stop-marker.png';
import { formatDistance, haversineDistance } from '../utils/routeUtils.js';

const markerSize = {
  iconSize: [42, 42],
  iconAnchor: [22, 42],
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

          let actionLabel = 'Thêm vào lộ trình';
          let actionDisabled = false;

          if (isStartStop) {
            actionLabel = 'Đang là điểm bắt đầu';
            actionDisabled = true;
          } else if (isEndStop) {
            actionLabel = 'Đang là điểm kết thúc';
            actionDisabled = true;
          } else if (isStopInRoute) {
            actionLabel = 'Đã nằm trong lộ trình';
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
            transform: 'translate(16px, -100%)',
            backgroundColor: 'background.paper',
            overflow: 'visible',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 4,
            p: 2,
            minWidth: 280,
            maxWidth: 320,
            zIndex: (theme) => (theme?.zIndex?.modal ?? 1300) + 1,
            pointerEvents: 'auto',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -16,
              bottom: 0,
              width: 0,
              height: 0,
              borderTop: '12px solid transparent',
              borderBottom: '12px solid transparent',
              borderRight: (theme) => `16px solid ${theme.palette.divider}`,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              left: -14,
              bottom: 2,
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderRight: (theme) => `14px solid ${theme.palette.background.paper}`,
            },
          }}
          style={{
            top: mapContextInfo.position.y,
            left: mapContextInfo.position.x,
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" fontWeight={700}>
                Điểm vừa chọn
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
              Tìm cửa hàng gần đây
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
                  Khoảng cách: {formatDistance(mapContextInfo.nearest.distanceKm)}
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
              Thêm điểm vào điểm dừng
            </Button>

            <Button
              variant="contained"
              size="small"
              color="secondary"
              onClick={handleCreateStore}
              disabled={!onCreateStoreAtPoint}
            >
              Thêm cửa hàng tại điểm này
            </Button>
          </Stack>
        </Box>
      )}

    </Box>
  );
};

export default MapView;
