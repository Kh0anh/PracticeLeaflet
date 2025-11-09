import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CssBaseline,
  Snackbar,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import Sidebar from './components/Sidebar.jsx';
import MapView from './components/MapView.jsx';
import AddStopDialog from './components/AddStopDialog.jsx';
import { MAP_CONFIG } from './config/mapConfig.js';
import {
  buildFallbackSegments,
  buildSegmentsFromLegs,
  buildTurnInstructions,
  convertRouteCoordinates,
  getRouteTotals,
  haversineDistance,
} from './utils/routeUtils.js';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#00a152',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
});

const ROUTE_RESET = {
  status: 'idle',
  coordinates: [],
  legs: [],
  distanceKm: 0,
  durationMinutes: 0,
  error: null,
};

const MANUAL_ROUTE_RESET = {
  status: 'idle',
  coordinates: [],
  distanceKm: 0,
  durationMinutes: 0,
  error: null,
  instructions: [],
};

const MANUAL_MODE = {
  NEAREST: 'nearest',
  CUSTOM: 'custom',
};

function App() {
  const { base, stops, defaultZoom } = MAP_CONFIG;

  const [routeStopIds, setRouteStopIds] = useState([]);
  const [customStops, setCustomStops] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [routeDetails, setRouteDetails] = useState(ROUTE_RESET);
  const [manualMode, setManualMode] = useState(MANUAL_MODE.NEAREST);
  const [manualPoints, setManualPoints] = useState([]);
  const [manualDestination, setManualDestination] = useState(null);
  const [manualRoute, setManualRoute] = useState(MANUAL_ROUTE_RESET);
  const manualRouteAbortRef = useRef(null);

  const nonBaseStops = useMemo(
    () => [...stops, ...customStops],
    [stops, customStops],
  );

  const stopById = useMemo(() => {
    const map = { [base.id]: base };
    nonBaseStops.forEach((stop) => {
      map[stop.id] = stop;
    });
    return map;
  }, [base, nonBaseStops]);

  useEffect(() => {
    if (routeStopIds.length < 2) {
      setRouteDetails(ROUTE_RESET);
      return;
    }

    const coordinates = routeStopIds
      .map((id) => stopById[id]?.position)
      .filter(Boolean);

    if (coordinates.length !== routeStopIds.length) return;

    const controller = new AbortController();

    setRouteDetails((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
    }));

    const query = coordinates
      .map(([lat, lon]) => `${lon},${lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${query}?overview=full&steps=true&annotations=duration,distance&geometries=geojson`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`OSRM tra ve loi ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const route = data.routes?.[0];
        if (!route) {
          throw new Error('Khong tim thay lo trinh phu hop');
        }
        setRouteDetails({
          status: 'success',
          coordinates: convertRouteCoordinates(route),
          legs: route.legs ?? [],
          distanceKm: route.distance ? route.distance / 1000 : 0,
          durationMinutes: route.duration ? route.duration / 60 : 0,
          error: null,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setRouteDetails({
          status: 'error',
          coordinates: [],
          legs: [],
          distanceKm: 0,
          durationMinutes: 0,
          error: error.message ?? 'Khong the ket noi dich vu chi duong',
        });
      });

    return () => controller.abort();
  }, [routeStopIds, stopById]);

  useEffect(
    () => () => {
      manualRouteAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    manualRouteAbortRef.current?.abort();
    setManualPoints([]);
    setManualDestination(null);
    setManualRoute(MANUAL_ROUTE_RESET);
  }, [manualMode]);

  const routeStops = useMemo(
    () => routeStopIds.map((id) => stopById[id]).filter(Boolean),
    [routeStopIds, stopById],
  );

  const availableStops = useMemo(
    () =>
      nonBaseStops.filter((stop) => !routeStopIds.includes(stop.id)),
    [nonBaseStops, routeStopIds],
  );

  const segments = useMemo(() => {
    if (routeStopIds.length < 2) return [];

    if (routeDetails.status === 'success') {
      return buildSegmentsFromLegs({
        legs: routeDetails.legs,
        routeStopIds,
        stopById,
      });
    }

    return buildFallbackSegments({
      routeStopIds,
      stopById,
    });
  }, [routeDetails, routeStopIds, stopById]);

  const totals = useMemo(() => {
    if (routeDetails.status === 'success') {
      return {
        distanceKm: routeDetails.distanceKm,
        durationMinutes: routeDetails.durationMinutes,
      };
    }
    return getRouteTotals(segments);
  }, [routeDetails, segments]);

  const turnInstructions = useMemo(() => {
    if (routeDetails.status !== 'success') return [];

    return buildTurnInstructions({
      legs: routeDetails.legs,
      routeStopIds,
      stopById,
    });
  }, [routeDetails, routeStopIds, stopById]);

  const handleAddStop = (stopId) => {
    if (!stopId || routeStopIds.includes(stopId)) return;
    setRouteStopIds((prev) => [...prev, stopId]);
    setSnackbar({ message: 'Da them diem dung vao lo trinh', severity: 'success' });
  };

  const handleRemoveStop = (stopId) => {
    setRouteStopIds((prev) => prev.filter((id) => id !== stopId));
  };

  const handleMoveStop = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= routeStopIds.length) return;
    setRouteStopIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleResetRoute = () => {
    if (routeStopIds.length === 0) return;
    setRouteStopIds([]);
    setSnackbar({ message: 'Da huy lo trinh hien tai', severity: 'info' });
  };

  const fetchManualRoute = useCallback(
    (points, destination) => {
      if (!Array.isArray(points) || points.length !== 2) return;

      manualRouteAbortRef.current?.abort();
      const controller = new AbortController();
      manualRouteAbortRef.current = controller;

      setManualRoute({
        status: 'loading',
        coordinates: [],
        distanceKm: 0,
        durationMinutes: 0,
        error: null,
        instructions: [],
      });
      setManualDestination(destination ?? null);

      const [[startLat, startLng], [endLat, endLng]] = points;
      const query = `${startLng},${startLat};${endLng},${endLat}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${query}?overview=full&steps=true&geometries=geojson`;

      fetch(url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`OSRM tra ve loi ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          const route = data.routes?.[0];
          if (!route) {
            throw new Error('Khong tim thay lo trinh phu hop');
          }

          const legs = route.legs ?? [];
          const manualStopIds = ['manual-start', 'manual-end'];
          const startName =
            manualMode === MANUAL_MODE.NEAREST ? 'Vi tri cua ban' : 'Diem bat dau';
          const destinationName =
            destination?.name ??
            (manualMode === MANUAL_MODE.NEAREST ? 'Cua hang gan nhat' : 'Diem ket thuc');

          const manualStopMap = {
            'manual-start': {
              id: 'manual-start',
              name: startName,
              position: points[0],
            },
            'manual-end': {
              id: 'manual-end',
              name: destinationName,
              position: points[1],
            },
          };

          const instructions = buildTurnInstructions({
            legs,
            routeStopIds: manualStopIds,
            stopById: manualStopMap,
          });

          setManualRoute({
            status: 'success',
            coordinates: convertRouteCoordinates(route),
            distanceKm: route.distance ? route.distance / 1000 : 0,
            durationMinutes: route.duration ? route.duration / 60 : 0,
            error: null,
            instructions,
          });
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setManualRoute({
            status: 'error',
            coordinates: [],
            distanceKm: 0,
            durationMinutes: 0,
            error: error.message ?? 'Khong the tinh duong di',
            instructions: [],
          });
          setManualDestination(null);
        });
    },
    [manualMode],
  );

  const handleManualMapClick = useCallback(
    (latlng) => {
      const point = [latlng.lat, latlng.lng];

      if (manualMode === MANUAL_MODE.NEAREST) {
        const nearestStop = nonBaseStops.reduce(
          (acc, stop) => {
            const distance = haversineDistance(point, stop.position);
            if (!acc || distance < acc.distance) {
              return { stop, distance };
            }
            return acc;
          },
          null,
        );

        if (!nearestStop) {
          manualRouteAbortRef.current?.abort();
          setManualPoints([point]);
          setManualDestination(null);
          setManualRoute({
            ...MANUAL_ROUTE_RESET,
            error: 'Khong tim thay cua hang gan nhat',
          });
          return;
        }

        const destinationStop = nearestStop.stop;
        const nextPoints = [point, destinationStop.position];

        setManualPoints(nextPoints);
        fetchManualRoute(nextPoints, destinationStop);
        return;
      }

      if (manualPoints.length === 0) {
        manualRouteAbortRef.current?.abort();
        setManualDestination(null);
        setManualRoute(MANUAL_ROUTE_RESET);
        setManualPoints([point]);
        return;
      }

      if (manualPoints.length === 1) {
        const nextPoints = [manualPoints[0], point];
        setManualPoints(nextPoints);
        fetchManualRoute(nextPoints, { name: 'Diem ket thuc', position: point });
        return;
      }

      manualRouteAbortRef.current?.abort();
      setManualRoute(MANUAL_ROUTE_RESET);
      setManualDestination(null);
      setManualPoints([point]);
    },
    [fetchManualRoute, manualMode, manualPoints, nonBaseStops],
  );

  const handleManualPointRemove = useCallback(
    (index) => {
      manualRouteAbortRef.current?.abort();
      setManualRoute(MANUAL_ROUTE_RESET);
      setManualDestination(null);
      setManualPoints((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        if (manualMode === MANUAL_MODE.NEAREST || index === 0) {
          return [];
        }
        return prev.filter((_, idx) => idx !== index);
      });
    },
    [manualMode],
  );

  const handleManualReset = useCallback(() => {
    manualRouteAbortRef.current?.abort();
    setManualPoints([]);
    setManualDestination(null);
    setManualRoute(MANUAL_ROUTE_RESET);
  }, []);

  const handleManualModeChange = useCallback((mode) => {
    setManualMode(mode);
  }, []);

  const handleCreateCustomStop = (payload) => {
    const newStopId = `custom-${Date.now()}`;
    const newStop = {
      id: newStopId,
      ...payload,
    };

    setCustomStops((prev) => [...prev, newStop]);
    setRouteStopIds((prev) => [...prev, newStopId]);
    setIsAddDialogOpen(false);
    setSnackbar({ message: 'Da tao diem dung moi', severity: 'success' });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden',
          backgroundColor: 'background.default',
        }}
      >
        <Sidebar
          routeStops={routeStops}
          availableStops={availableStops}
          segments={segments}
          totals={totals}
          routeStatus={routeDetails.status}
          routeError={routeDetails.error}
          turnInstructions={turnInstructions}
          manualMode={manualMode}
          onManualModeChange={handleManualModeChange}
          manualRoute={manualRoute}
          manualDestination={manualDestination}
          manualPoints={manualPoints}
          onManualReset={handleManualReset}
          onResetRoute={handleResetRoute}
          onAddStop={handleAddStop}
          onRemoveStop={handleRemoveStop}
          onMoveStop={handleMoveStop}
          onOpenAddDialog={() => setIsAddDialogOpen(true)}
        />

        <MapView
          base={base}
          allStops={nonBaseStops}
          routeStops={routeStops}
          segments={segments}
          routeCoordinates={routeDetails.coordinates}
          defaultZoom={defaultZoom}
          onAddStop={handleAddStop}
          manualMode={manualMode}
          manualPoints={manualPoints}
          manualRoute={manualRoute}
          manualDestination={manualDestination}
          onManualMapClick={handleManualMapClick}
          onManualPointRemove={handleManualPointRemove}
        />
      </Box>

      <AddStopDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSubmit={handleCreateCustomStop}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert
            onClose={() => setSnackbar(null)}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        ) : null}
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
