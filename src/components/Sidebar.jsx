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
import { createFilterOptions } from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AssistantDirectionIcon from '@mui/icons-material/AssistantDirection';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import FlagCircleIcon from '@mui/icons-material/FlagCircle';
import ForkLeftIcon from '@mui/icons-material/ForkLeft';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import MergeIcon from '@mui/icons-material/Merge';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RouteIcon from '@mui/icons-material/Route';
import RoundaboutLeftIcon from '@mui/icons-material/RoundaboutLeft';
import RoundaboutRightIcon from '@mui/icons-material/RoundaboutRight';
import StraightIcon from '@mui/icons-material/Straight';
import TurnLeftIcon from '@mui/icons-material/TurnLeft';
import TurnRightIcon from '@mui/icons-material/TurnRight';
import TurnSharpLeftIcon from '@mui/icons-material/TurnSharpLeft';
import TurnSharpRightIcon from '@mui/icons-material/TurnSharpRight';
import TurnSlightLeftIcon from '@mui/icons-material/TurnSlightLeft';
import TurnSlightRightIcon from '@mui/icons-material/TurnSlightRight';
import UTurnLeftIcon from '@mui/icons-material/UTurnLeft';
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
        <Tooltip title="Di chuyển lên">
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
        <Tooltip title="Di chuyển xuống">
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
        <Tooltip title="Xóa điểm dừng">
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
            <Chip size="small" color="primary" label="Điểm bắt đầu" />
          )}
          {isLast && !isFirst && (
            <Chip size="small" color="secondary" label="Điểm kết thúc" />
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

const formatCoordinateLabel = (position) => {
  if (
    !Array.isArray(position) ||
    position.length !== 2 ||
    !position.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    return '';
  }
  const [lat, lon] = position;
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};

const buildSearchValue = ({ label, description, coordinateLabel }) => {
  const tokens = [label, description];
  if (coordinateLabel) {
    const compact = coordinateLabel.replace(/\s+/g, '');
    const spaced = coordinateLabel.replace(', ', ' ');
    tokens.push(coordinateLabel, spaced, compact);
  }
  return tokens.filter(Boolean).join(' ');
};

const modifierIconMap = {
  left: TurnLeftIcon,
  right: TurnRightIcon,
  slight_left: TurnSlightLeftIcon,
  slight_right: TurnSlightRightIcon,
  sharp_left: TurnSharpLeftIcon,
  sharp_right: TurnSharpRightIcon,
  straight: StraightIcon,
  uturn: UTurnLeftIcon,
};

const getInstructionIconComponent = (instruction = {}) => {
  const type = instruction.maneuverType;
  const modifier = instruction.maneuverModifier;

  if (type === 'depart') return PlayCircleOutlineIcon;
  if (type === 'arrive') return FlagCircleIcon;

  if (type === 'roundabout' || type === 'rotary') {
    if (modifier?.includes('left')) return RoundaboutLeftIcon;
    return RoundaboutRightIcon;
  }

  if (type === 'fork') {
    if (modifier?.includes('left')) return ForkLeftIcon;
    if (modifier?.includes('right')) return ForkRightIcon;
    return ForkRightIcon;
  }

  if (type === 'merge') {
    return MergeIcon;
  }

  if (modifier && modifierIconMap[modifier]) {
    return modifierIconMap[modifier];
  }

  return AssistantDirectionIcon;
};

const InstructionStepIcon = ({ instruction }) => {
  const IconComponent = getInstructionIconComponent(instruction);
  return (
    <Box
      sx={{
        width: 24,
        display: 'flex',
        justifyContent: 'center',
        pt: '3px',
        flexShrink: 0,
      }}
    >
      <IconComponent fontSize="small" sx={{ color: 'text.secondary' }} />
    </Box>
  );
};

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
                  Quãng đường: {formatDistance(segment.distanceKm)}
                </Typography>
                <Typography variant="caption">
                  Thời gian: {formatDuration(segment.durationMinutes)}
                </Typography>
              </Stack>

              {segment.instructions?.length ? (
                <Stack spacing={0.75}>
                  {segment.instructions.map((instruction) => (
                    <Stack
                      key={instruction.id}
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                    >
                      <InstructionStepIcon instruction={instruction} />
                      <Stack spacing={0.25} sx={{ flex: 1 }}>
                        <Typography variant="caption">
                          {instruction.text}
                        </Typography>
                        {instruction.distanceLabel && (
                          <Typography variant="caption" color="text.secondary">
                            Khoảng cách: {instruction.distanceLabel}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Chi tiết chỉ đường sẽ hiện khi có dữ liệu OSRM.
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
      availableStops.map((stop) => {
        const coordinateLabel = formatCoordinateLabel(stop.position);
        return {
          label: stop.name,
          id: stop.id,
          description: stop.description,
          coordinateLabel,
          searchValue: buildSearchValue({
            label: stop.name,
            description: stop.description,
            coordinateLabel,
          }),
        };
      }),
    [availableStops],
  );

  const filterOptions = useMemo(
    () =>
      createFilterOptions({
        stringify: (option) =>
          option?.searchValue ?? option?.label ?? option ?? '',
        trim: true,
      }),
    [],
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
              Tổng quan
            </Typography>
            <Typography variant="h5" fontWeight={700} mt={1}>
              {formatDistance(totals.distanceKm)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Thời gian dự kiến: {formatDuration(totals.durationMinutes)}
            </Typography>
            {routeStatus === 'loading' && (
              <Typography
                variant="caption"
                color="primary"
                display="block"
                mt={1}
              >
                Đang tính toán lộ trình qua OSRM...
              </Typography>
            )}
          </Box>

          {routeError && (
            <Alert severity="warning">
              {routeError}. Hệ thống đang sử dụng lối đi thẳng làm phương án dự
              phòng.
            </Alert>
          )}

          <Stack direction="row" spacing={1}>
            <Autocomplete
              options={availableOptions}
              filterOptions={filterOptions}
              value={selectedStop}
              onChange={handleSelect}
              getOptionLabel={(option) => option?.label ?? ''}
              renderOption={(props, option) => {
                const secondary = option.coordinateLabel
                  ? option.description
                    ? `${option.description} - ${option.coordinateLabel}`
                    : option.coordinateLabel
                  : option.description ?? '';
                return (
                  <li {...props}>
                    <ListItemText
                      primary={option.label}
                      secondary={secondary}
                    />
                  </li>
                );
              }}
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Thêm điểm dừng"
                  placeholder="Tìm theo tên hoặc tọa độ"
                />
              )}
            />
            <Tooltip title="Tạo điểm mới">
              <Button
                variant="contained"
                color="secondary"
                onClick={onOpenAddDialog}
                sx={{ minWidth: 0, px: 1.2 }}
              >
                <AddIcon />
              </Button>
            </Tooltip>
            <Tooltip title="Xóa tất cả điểm dừng">
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
              Danh sách điểm dừng
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
                Cần ít nhất hai điểm để tính lộ trình.
              </Typography>
            )}
          </Box>

          {showSegments && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Chỉ đường
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
