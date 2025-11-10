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

  const [routeStopIds, setRouteStopIds] = useState([]);
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
    setCustomStops((prev) => {
      if (!prev.some((stop) => stop.ephemeral)) return prev;
      const routeSet = new Set(routeStopIds);
      let changed = false;
      const next = prev.filter((stop) => {
        if (stop.ephemeral && !routeSet.has(stop.id)) {
          changed = true;
          return false;
        }
        return true;
      });
      return changed ? next : prev;
    });
  }, [routeStopIds]);

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
          throw new Error(`OSRM trả về lỗi ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const route = data.routes?.[0];
        if (!route) {
          throw new Error('Không tìm thấy lộ trình phù hợp');
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
          error: error.message ?? 'Không thể kết nối dịch vụ chỉ đường',
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
      nonBaseStops.filter(
        (stop) => !stop.ephemeral && !routeStopIds.includes(stop.id),
      ),
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
    setSnackbar({ message: 'Đã thêm điểm dừng vào lộ trình', severity: 'success' });
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

  const handleClearRouteStops = () => {
    if (!routeStopIds.length) return;
    setRouteStopIds([]);
    setSnackbar({
      message: 'Đã xóa tất cả điểm dừng',
      severity: 'info',
    });
  };

  const createCustomStop = (payload, { addToRoute = true, ephemeral = false } = {}) => {
    const newStopId = `custom-${Date.now()}`;
    const newStop = {
      id: newStopId,
      ...payload,
      ephemeral,
    };

    setCustomStops((prev) => [...prev, newStop]);
    if (addToRoute) {
      setRouteStopIds((prev) => [...prev, newStopId]);
    }
    return newStop;
  };

  const isValidPosition = (position) =>
    Array.isArray(position) &&
    position.length === 2 &&
    position.every((value) => typeof value === 'number' && Number.isFinite(value));

  const formatPositionLabel = (position) => {
    if (!isValidPosition(position)) return '';
    const [lat, lon] = position;
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  };

  const handleCreateCustomStop = (payload) => {
    createCustomStop(payload, { addToRoute: true });
    setIsAddDialogOpen(false);
    setSnackbar({ message: 'Da tao diem dung moi', severity: 'success' });
  };

  const handleAddCoordinateAsRouteStop = (position) => {
    if (!isValidPosition(position)) return;

    createCustomStop(
      {
        name: `Điểm tạm thời (${formatPositionLabel(position)})`,
        description: 'Được tạo từ bản đồ',
        position,
      },
      { addToRoute: true, ephemeral: true },
    );
    setSnackbar({
      message: 'Đã thêm điểm tạm thời vào lộ trình',
      severity: 'success',
    });
  };

  const handleCreateStoreAtPoint = (position) => {
    if (!isValidPosition(position)) return;

    createCustomStop(
      {
        name: `Cửa hàng mới (${formatPositionLabel(position)})`,
        description: 'Được thêm từ bản đồ',
        position,
      },
      { addToRoute: false },
    );
    setSnackbar({
      message: 'Đã thêm cửa hàng mới vào danh sách',
      severity: 'success',
    });
  };

  const handleBuildRouteToNearestStop = (position, stopId) => {
    if (!isValidPosition(position) || !stopId) return;
    const targetStop = stopById[stopId];
    if (!targetStop) return;

    const newStop = createCustomStop(
      {
        name: `Điểm chọn (${formatPositionLabel(position)})`,
        description: 'Tạo từ chức năng tìm cửa hàng gần nhất',
        position,
      },
      { addToRoute: false, ephemeral: true },
    );

    setRouteStopIds([newStop.id, stopId]);
    setSnackbar({
      message: `Đã tạo lộ trình tới ${targetStop.name}`,
      severity: 'info',
    });
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
          onClearRoute={handleClearRouteStops}
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
          onAddCoordinateStop={handleAddCoordinateAsRouteStop}
          onCreateStoreAtPoint={handleCreateStoreAtPoint}
          onBuildNearestRoute={handleBuildRouteToNearestStop}
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
