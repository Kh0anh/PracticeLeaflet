import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
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
import RouteIcon from '@mui/icons-material/Route';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlagCircleIcon from '@mui/icons-material/FlagCircle';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import NavigationIcon from '@mui/icons-material/Navigation';
import StraightIcon from '@mui/icons-material/Straight';
import TurnLeftIcon from '@mui/icons-material/TurnLeft';
import TurnRightIcon from '@mui/icons-material/TurnRight';
import TurnSharpLeftIcon from '@mui/icons-material/TurnSharpLeft';
import TurnSharpRightIcon from '@mui/icons-material/TurnSharpRight';
import TurnSlightLeftIcon from '@mui/icons-material/TurnSlightLeft';
import TurnSlightRightIcon from '@mui/icons-material/TurnSlightRight';
import UTurnLeftIcon from '@mui/icons-material/UTurnLeft';
import UTurnRightIcon from '@mui/icons-material/UTurnRight';
import { formatDistance, formatDuration } from '../utils/routeUtils.js';

const INSTRUCTION_ICON_MAP = {
  depart: MyLocationIcon,
  arrive: FlagCircleIcon,
  straight: StraightIcon,
  continue: StraightIcon,
  left: TurnLeftIcon,
  right: TurnRightIcon,
  slight_left: TurnSlightLeftIcon,
  slight_right: TurnSlightRightIcon,
  sharp_left: TurnSharpLeftIcon,
  sharp_right: TurnSharpRightIcon,
  merge: MergeTypeIcon,
  fork: CallSplitIcon,
  uturn_left: UTurnLeftIcon,
  uturn_right: UTurnRightIcon,
  roundabout: NavigationIcon,
  default: NavigationIcon,
};

const getInstructionIcon = (symbol) =>
  INSTRUCTION_ICON_MAP[symbol] ?? INSTRUCTION_ICON_MAP.default;

const Sidebar = ({
  routeStops,
  availableStops,
  segments,
  totals,
  routeStatus,
  routeError,
  turnInstructions,
  manualMode,
  onManualModeChange,
  manualRoute,
  manualDestination,
  manualPoints,
  onManualReset,
  onResetRoute,
  onAddStop,
  onOpenAddDialog,
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

  const manualInstructions = manualRoute?.instructions ?? [];
  const activeInstructions =
    turnInstructions.length > 0 ? turnInstructions : manualInstructions;
  const instructionsTitle =
    turnInstructions.length > 0
      ? 'Huong dan chi tiet'
      : manualInstructions.length > 0
        ? `Huong dan den ${manualDestination?.name ?? 'cua hang gan nhat'}`
        : 'Huong dan chi tiet';

  const manualStatus = manualRoute?.status ?? 'idle';
  const manualPointsCount = manualPoints?.length ?? 0;
  const manualDistance = manualRoute?.distanceKm ?? 0;
  const manualDuration = manualRoute?.durationMinutes ?? 0;
  const manualError = manualRoute?.error;
  const manualSuccess = manualStatus === 'success';
  const manualLoading = manualStatus === 'loading';
  const isNearestMode = manualMode === 'nearest';
  const isCustomMode = manualMode === 'custom';

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

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
            }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Lo trinh hien tai
                </Typography>
                {routeStops.length > 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={onResetRoute}
                    disabled={routeStatus === 'loading'}
                    sx={{ textTransform: 'none' }}
                  >
                    Huy lo trinh
                  </Button>
                )}
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
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="body2" fontWeight={600}>
                        {segment.from.name}
                      </Typography>
                      <ArrowForwardIcon fontSize="small" sx={{ color: segment.color, opacity: 0.9 }} />
                      <Typography variant="body2" fontWeight={600}>
                        {segment.to.name}
                      </Typography>
                    </Stack>
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
                <Alert severity="warning" sx={{ m: 0 }}>
                  {routeError}. He thong dang su dung loi di thang lam phuong an du phong.
                </Alert>
              )}

              {activeInstructions.length > 0 && (
                <Box
                  sx={{
                    borderRadius: 1,
                    px: 1.25,
                    py: 1.1,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                    {instructionsTitle}
                  </Typography>

                  <Stack spacing={0.75} mt={0.75}>
                    {activeInstructions.slice(0, 12).map((instruction) => {
                      const InstructionIcon = getInstructionIcon(instruction.symbol);
                      const hasDistance = Boolean(instruction.distanceText);
                      const chipLabel = hasDistance
                        ? instruction.distanceText
                        : instruction.kind === 'arrive'
                          ? 'Den dich'
                          : instruction.kind === 'depart'
                            ? 'Bat dau'
                            : 'Huong';
                      const chipProps = hasDistance
                        ? {
                            variant: 'outlined',
                            sx: { minWidth: 68, fontWeight: 600 },
                          }
                        : {
                            color:
                              instruction.kind === 'arrive'
                                ? 'success'
                                : instruction.kind === 'depart'
                                  ? 'primary'
                                  : 'default',
                            sx: { fontWeight: 600 },
                          };
                      const iconColor =
                        instruction.symbol === 'arrive'
                          ? 'success.main'
                          : instruction.symbol === 'depart'
                            ? 'primary.main'
                            : 'text.secondary';

                      return (
                        <Stack
                          key={instruction.id}
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <InstructionIcon fontSize="small" sx={{ color: iconColor }} />
                          <Chip size="small" label={chipLabel} {...chipProps} />
                          <Typography variant="caption" color="text.primary" sx={{ lineHeight: 1.4 }}>
                            {instruction.text}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>

                  {activeInstructions.length > 12 && (
                    <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
                      ... va {activeInstructions.length - 12} huong dan khac.
                    </Typography>
                  )}
                </Box>
              )}

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tinh duong tu ban do (click)
                </Typography>

                <ButtonGroup
                  size="small"
                  sx={{ mt: 0.25, mb: 0.5 }}
                  disableElevation
                >
                  <Button
                    variant={isNearestMode ? 'contained' : 'outlined'}
                    onClick={() => onManualModeChange('nearest')}
                    sx={{ textTransform: 'none' }}
                  >
                    Cua hang gan nhat
                  </Button>
                  <Button
                    variant={isCustomMode ? 'contained' : 'outlined'}
                    onClick={() => onManualModeChange('custom')}
                    sx={{ textTransform: 'none' }}
                  >
                    Chon 2 diem
                  </Button>
                </ButtonGroup>

                {manualLoading && (
                  <Typography variant="caption" color="text.secondary">
                    {isNearestMode
                      ? 'Dang tim cua hang gan nhat va tinh duong...'
                      : 'Dang tinh duong ngan nhat giua hai diem...'}
                  </Typography>
                )}

                {manualSuccess && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      color="success"
                      label={formatDistance(manualDistance)}
                      sx={{ fontWeight: 600 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDuration(manualDuration)}
                    </Typography>
                  </Stack>
                )}

                {manualSuccess && manualDestination && (
                  <Typography variant="caption" color="text.secondary">
                    Dich den: {manualDestination.name}
                  </Typography>
                )}

                {manualError && (
                  <Typography variant="caption" color="error">
                    {manualError}
                  </Typography>
                )}

                {!manualSuccess && !manualLoading && !manualError && (
                  <Typography variant="caption" color="text.secondary">
                    {isNearestMode
                      ? 'Click vi tri bat ky tren ban do de tim duong den cua hang gan nhat.'
                      : manualPointsCount === 1
                        ? 'Da chon diem bat dau, hay click diem ket thuc.'
                        : 'Click hai vi tri tren ban do (bat dau va ket thuc) de tinh duong ngan nhat.'}
                  </Typography>
                )}

                {manualPointsCount >= 2 && manualStatus !== 'loading' && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {isNearestMode
                        ? 'Click vi tri moi tren ban do de tim lai cua hang gan nhat khac, hoac click vao pin de huy.'
                        : 'Click vi tri moi tren ban do de bat dau lai, hoac click vao pin de huy.'}
                    </Typography>
                    <Divider orientation="vertical" flexItem />
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      onClick={onManualReset}
                      sx={{ textTransform: 'none' }}
                    >
                      Huy duong
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Box>
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
          </Stack>

        </Stack>
      </Box>
    </Box>
  );
};

export default Sidebar;
