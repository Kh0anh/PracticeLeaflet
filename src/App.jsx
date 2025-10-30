import { useEffect, useMemo, useState } from 'react';
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
  convertRouteCoordinates,
  getRouteTotals,
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

function App() {
  const { base, stops, defaultZoom } = MAP_CONFIG;

  const initialRoute = useMemo(
    () => stops.slice(0, 2).map((stop) => stop.id),
    [stops],
  );

  const [routeStopIds, setRouteStopIds] = useState(initialRoute);
  const [customStops, setCustomStops] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [routeDetails, setRouteDetails] = useState(ROUTE_RESET);

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
          routeStatus={routeDetails.status}
          routeError={routeDetails.error}
          routeCoordinates={routeDetails.coordinates}
          defaultZoom={defaultZoom}
          onAddStop={handleAddStop}
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
