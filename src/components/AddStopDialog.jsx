import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';

const DEFAULT_FORM = {
  name: '',
  description: '',
  latitude: '',
  longitude: '',
  trafficLevel: 'moderate',
};

const isValidCoordinate = (value, min, max) => {
  const number = Number(value);
  return !Number.isNaN(number) && number >= min && number <= max;
};

const AddStopDialog = ({ open, onClose, onSubmit, trafficPresets }) => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setForm(DEFAULT_FORM);
      setErrors({});
    }
  }, [open]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSave = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Vui long nhap ten diem dung';
    }

    if (!isValidCoordinate(form.latitude, -90, 90)) {
      nextErrors.latitude = 'Vi do khong hop le';
    }

    if (!isValidCoordinate(form.longitude, -180, 180)) {
      nextErrors.longitude = 'Kinh do khong hop le';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      position: [Number(form.latitude), Number(form.longitude)],
      trafficLevel: form.trafficLevel,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Them diem dung moi</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Ten diem dung"
            value={form.name}
            onChange={handleChange('name')}
            error={Boolean(errors.name)}
            helperText={errors.name}
            autoFocus
          />

          <TextField
            label="Mo ta (tuy chon)"
            value={form.description}
            onChange={handleChange('description')}
            multiline
            minRows={2}
          />

          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
            gap={2}
          >
            <TextField
              label="Vi do"
              value={form.latitude}
              onChange={handleChange('latitude')}
              error={Boolean(errors.latitude)}
              helperText={errors.latitude ?? 'VD: 21.0285'}
            />
            <TextField
              label="Kinh do"
              value={form.longitude}
              onChange={handleChange('longitude')}
              error={Boolean(errors.longitude)}
              helperText={errors.longitude ?? 'VD: 105.8542'}
            />
          </Box>

          <TextField
            label="Giao thong gia lap"
            value={form.trafficLevel}
            onChange={handleChange('trafficLevel')}
            select
          >
            {Object.entries(trafficPresets).map(([key, value]) => (
              <MenuItem key={key} value={key}>
                {value.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Huy</Button>
        <Button variant="contained" onClick={handleSave}>
          Luu diem dung
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStopDialog;
