import { Box, Chip, Stack, Typography } from '@mui/material';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import RoomIcon from '@mui/icons-material/Room';
import { formatDistance, formatDuration } from '../utils/routeUtils.js';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);

  return null;
};

const TrafficLegend = ({ trafficPresets }) => (
  <Box
    sx={{
      position: 'absolute',
      bottom: 16,
      right: 16,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 2,
      boxShadow: 3,
      p: 2,
      minWidth: 200,
    }}
  >
    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
      Muc do giao thong
    </Typography>
    <Stack spacing={1}>
      {Object.entries(trafficPresets).map(([key, value]) => (
        <Stack
          key={key}
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: '4px',
                backgroundColor: value.color,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
            <Typography variant="body2">{value.label}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            ~ {value.speedKmh} km/h
          </Typography>
        </Stack>
      ))}
    </Stack>
  </Box>
);

const MapView = ({
  base,
  allStops,
  routeStops,
  segments,
  routeStatus,
  routeError,
  routeCoordinates,
  trafficPresets,
  defaultZoom,
}) => {
  const boundsPoints = useMemo(() => {
    if (routeCoordinates.length) {
      return routeCoordinates;
    }
    if (routeStops.length) {
      return routeStops.map((stop) => stop.position);
    }
    return [base.position];
  }, [routeCoordinates, routeStops, base.position]);

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

        {allStops.map((stop) => (
          <Marker position={stop.position} key={stop.id}>
            <Popup>
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
            </Popup>
          </Marker>
        ))}

        <Marker
          position={base.position}
          icon={L.divIcon({
            className: 'base-marker-icon',
            html: `<div id="base-pin"></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -28],
          })}
        >
          <Popup>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>
                {base.name}
              </Typography>
              {base.description && (
                <Typography variant="body2" color="text.secondary">
                  {base.description}
                </Typography>
              )}
            </Stack>
          </Popup>
        </Marker>

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

        <FitBounds points={boundsPoints} />
      </MapContainer>

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

      <TrafficLegend trafficPresets={trafficPresets} />

      <style>{`
        .base-marker-icon #base-pin {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1976d2, #64b5f6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 10px rgba(25, 118, 210, 0.45);
          font-family: 'Roboto', sans-serif;
        }
      `}</style>
    </Box>
  );
};

export default MapView;
