import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RouteIcon from '@mui/icons-material/Route';
import { formatDistance, formatDuration } from '../utils/routeUtils.js';

const StopListItem = ({
  stop,
  index,
  isFirst,
  isLast,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => (
  <ListItem
    divider
    secondaryAction={
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Tooltip title="Di chuyen len">
          <span>
            <IconButton
              size="small"
              onClick={onMoveUp}
              disabled={!canMoveUp}
            >
              <ArrowUpwardIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Di chuyen xuong">
          <span>
            <IconButton
              size="small"
              onClick={onMoveDown}
              disabled={!canMoveDown}
            >
              <ArrowDownwardIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Xoa diem dung">
          <span>
            <IconButton size="small" onClick={onRemove}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    }
  >
    <ListItemText
      primary={
        <Stack direction="row" spacing={1} alignItems="center">
          {isFirst && (
            <Chip size="small" color="primary" label="Diem bat dau" />
          )}
          {isLast && !isFirst && (
            <Chip size="small" color="secondary" label="Diem ket thuc" />
          )}
          <Typography fontWeight={600}>{stop.name}</Typography>
        </Stack>
      }
      secondary={
        stop.description ?? `Lat: ${stop.position[0]}, Lng: ${stop.position[1]}`
      }
    />
  </ListItem>
);

const SegmentList = ({ segments }) => (
  <List dense disablePadding>
    {segments.map((segment) => (
      <ListItem key={segment.id} divider alignItems="flex-start">
        <ListItemText
          primary={
            <Stack direction="row" spacing={1} alignItems="center">
              <RouteIcon fontSize="small" sx={{ color: segment.color }} />
              <Typography variant="body2">
                {`${segment.from.name} -> ${segment.to.name}`}
              </Typography>
            </Stack>
          }
          secondary={
            <Stack spacing={1}>
              <Stack
                direction="row"
                spacing={1.5}
                divider={<Divider flexItem orientation="vertical" />}
              >
                <Typography variant="caption">
                  Quang duong: {formatDistance(segment.distanceKm)}
                </Typography>
                <Typography variant="caption">
                  Thoi gian: {formatDuration(segment.durationMinutes)}
                </Typography>
              </Stack>

              {segment.instructions?.length ? (
                <Stack spacing={0.75}>
                  {segment.instructions.map((instruction, index) => (
                    <Stack
                      key={instruction.id}
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: 16 }}
                      >
                        {index + 1}.
                      </Typography>
                      <Stack spacing={0.25} sx={{ flex: 1 }}>
                        <Typography variant="caption">
                          {instruction.text}
                        </Typography>
                        {instruction.distanceLabel && (
                          <Typography variant="caption" color="text.secondary">
                            Khoang cach: {instruction.distanceLabel}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Chi tiet chi duong se hien khi co du lieu OSRM.
                </Typography>
              )}
            </Stack>
          }
        />
      </ListItem>
    ))}
  </List>
);

const Sidebar = ({
  routeStops,
  availableStops,
  segments,
  totals,
  routeStatus,
  routeError,
  onAddStop,
  onRemoveStop,
  onMoveStop,
  onOpenAddDialog,
  onClearRoute,
}) => {
  const [selectedStop, setSelectedStop] = useState(null);

  const availableOptions = useMemo(
    () =>
      availableStops.map((stop) => ({
        label: stop.name,
        id: stop.id,
        description: stop.description,
      })),
    [availableStops],
  );

  const handleSelect = (_event, option) => {
    if (option) {
      onAddStop(option.id);
      setSelectedStop(null);
    }
  };

  const showSegments = segments.length > 0;
  return (
    <Box
      component="aside"
      sx={{
        width: { xs: '100%', md: 360 },
        borderRight: { md: 1 },
        borderBottom: { xs: 1, md: 0 },
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        zIndex: 2,
      }}
    >
      <Box px={3} py={3} sx={{ overflowY: 'auto' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Bang dieu khien lo trinh
        </Typography>

        <Stack spacing={2}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Tong quan
            </Typography>
            <Typography variant="h5" fontWeight={700} mt={1}>
              {formatDistance(totals.distanceKm)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Thoi gian du kien: {formatDuration(totals.durationMinutes)}
            </Typography>
            {routeStatus === 'loading' && (
              <Typography
                variant="caption"
                color="primary"
                display="block"
                mt={1}
              >
                Dang tinh toan lo trinh qua OSRM...
              </Typography>
            )}
          </Box>

          {routeError && (
            <Alert severity="warning">
              {routeError}. He thong dang su dung loi di thang lam phuong an du
              phong.
            </Alert>
          )}

          <Stack direction="row" spacing={1}>
            <Autocomplete
              options={availableOptions}
              value={selectedStop}
              onChange={handleSelect}
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Them diem dung"
                  placeholder="Chon diem co san"
                />
              )}
            />
            <Tooltip title="Tao diem moi">
              <Button
                variant="contained"
                color="secondary"
                onClick={onOpenAddDialog}
                sx={{ minWidth: 0, px: 1.2 }}
              >
                <AddIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Xoa tat ca diem dung">
              <span>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={onClearRoute}
                  disabled={!routeStops.length}
                  sx={{ minWidth: 0, px: 1.2 }}
                >
                  <DeleteSweepIcon />
                </Button>
              </span>
            </Tooltip>
          </Stack>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Danh sach diem dung
            </Typography>
            <List dense disablePadding>
              {routeStops.map((stop, index) => (
                <StopListItem
                  key={stop.id}
                  stop={stop}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === routeStops.length - 1}
                  canMoveUp={index > 0}
                  canMoveDown={index < routeStops.length - 1}
                  onMoveUp={() => onMoveStop(index, index - 1)}
                  onMoveDown={() => onMoveStop(index, index + 1)}
                  onRemove={() => onRemoveStop(stop.id)}
                />
              ))}
            </List>
            {routeStops.length < 2 && (
              <Typography variant="caption" color="text.secondary">
                Can it nhat hai diem de tinh lo trinh.
              </Typography>
            )}
          </Box>

          {showSegments && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Chi duong chi tiet hon
              </Typography>
              <SegmentList segments={segments} />
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default Sidebar;
