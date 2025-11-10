import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';

const DEFAULT_FORM = {
  name: '',
  description: '',
  latitude: '',
  longitude: '',
};

const isValidCoordinate = (value, min, max) => {
  const number = Number(value);
  return !Number.isNaN(number) && number >= min && number <= max;
};

const AddStopDialog = ({ open, onClose, onSubmit }) => {
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
      nextErrors.name = 'Vui lòng nhập tên điểm dừng';
    }

    if (!isValidCoordinate(form.latitude, -90, 90)) {
      nextErrors.latitude = 'Vĩ độ không hợp lệ';
    }

    if (!isValidCoordinate(form.longitude, -180, 180)) {
      nextErrors.longitude = 'Kinh độ không hợp lệ';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      position: [Number(form.latitude), Number(form.longitude)],
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Thêm điểm dừng mới</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Tên điểm dừng"
            value={form.name}
            onChange={handleChange('name')}
            error={Boolean(errors.name)}
            helperText={errors.name}
            autoFocus
          />

          <TextField
            label="Mô tả (tùy chọn)"
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
              label="Vĩ độ"
              value={form.latitude}
              onChange={handleChange('latitude')}
              error={Boolean(errors.latitude)}
              helperText={errors.latitude ?? 'VD: 21.0285'}
            />
            <TextField
              label="Kinh độ"
              value={form.longitude}
              onChange={handleChange('longitude')}
              error={Boolean(errors.longitude)}
              helperText={errors.longitude ?? 'VD: 105.8542'}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={handleSave}>
          Lưu điểm dừng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStopDialog;
