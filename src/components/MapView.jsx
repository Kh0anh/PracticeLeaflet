import { Box, Button, Stack, Typography } from '@mui/material';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Fragment, useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import availableStopPng from '../assets/available-stop-marker.png';
import routeEndPng from '../assets/route-end-marker.png';
import routeStartPng from '../assets/route-start-marker.png';
import routeStopPng from '../assets/route-stop-marker.png';

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

const ROUTE_PRIMARY_STYLE = {
  color: '#2e7d32',
  weight: 7,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
};

const ROUTE_GLOW_STYLE = {
  color: '#a5d6a7',
  weight: 4,
  opacity: 0.9,
  lineCap: 'round',
  lineJoin: 'round',
};

const ManualRouteEvents = ({ onMapClick }) => {
  useMapEvents({
    click: (event) => {
      if (onMapClick) {
        onMapClick(event.latlng);
      }
    },
  });

  return null;
};

const FitBounds = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);

  return null;
};

const MapView = ({
  base,
  allStops,
  routeStops,
  segments,
  routeCoordinates = [],
  defaultZoom,
  onAddStop,
  manualMode = 'nearest',
  manualPoints = [],
  manualRoute = {},
  manualDestination,
  onManualMapClick,
  onManualPointRemove,
}) => {
  const routeStopIdSet = useMemo(
    () => new Set(routeStops.map((stop) => stop.id)),
    [routeStops],
  );
  const startStopId = routeStops[0]?.id ?? null;
  const endStopId =
    routeStops.length > 1 ? routeStops[routeStops.length - 1]?.id ?? null : null;

  const manualCoordinates = useMemo(
    () => manualRoute.coordinates ?? [],
    [manualRoute.coordinates],
  );

  const boundsPoints = useMemo(() => {
    if (manualCoordinates.length) {
      return manualCoordinates;
    }
    if (routeCoordinates.length) {
      return routeCoordinates;
    }
    if (manualPoints.length) {
      return manualPoints;
    }
    if (routeStops.length) {
      return routeStops.map((stop) => stop.position);
    }
    return [base.position];
  }, [manualCoordinates, routeCoordinates, manualPoints, routeStops, base.position]);

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

        <ManualRouteEvents onMapClick={onManualMapClick} />

        {manualPoints.map((point, index) => {
          const isStart = index === 0;
          const color = isStart ? '#00a152' : '#c62828';
          const tooltipText = isStart
            ? manualMode === 'nearest'
              ? 'Vi tri cua ban (click de huy)'
              : 'Diem bat dau (click de huy)'
            : manualDestination?.name
              ? `${manualDestination.name} (click de doi)`
              : 'Diem ket thuc (click de doi)';

          return (
            <CircleMarker
              key={`manual-point-${index}`}
              center={point}
              radius={8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onManualPointRemove?.(index),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} permanent>
                {tooltipText}
              </Tooltip>
            </CircleMarker>
          );
        })}

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
          <Fragment key={segment.id}>
            <Polyline positions={segment.geometry} pathOptions={ROUTE_PRIMARY_STYLE} />
            <Polyline positions={segment.geometry} pathOptions={ROUTE_GLOW_STYLE} />
          </Fragment>
        ))}

        {routeCoordinates.length > 0 && (
          <Fragment>
            <Polyline positions={routeCoordinates} pathOptions={ROUTE_PRIMARY_STYLE} />
            <Polyline positions={routeCoordinates} pathOptions={ROUTE_GLOW_STYLE} />
          </Fragment>
        )}

        {manualCoordinates.length > 0 && (
          <Fragment>
            <Polyline positions={manualCoordinates} pathOptions={ROUTE_PRIMARY_STYLE} />
            <Polyline positions={manualCoordinates} pathOptions={ROUTE_GLOW_STYLE} />
          </Fragment>
        )}

        <FitBounds points={boundsPoints} />
      </MapContainer>
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
