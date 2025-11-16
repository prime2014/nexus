// src/store/arduinoSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ArduinoDevice {
  port: string;
  vid: number;
  pid: number;
  product?: string;
  serial_number?: string,
  custom_name?: string,
  status: 'connected' | 'disconnected';
}

interface ArduinoState {
  devices: ArduinoDevice[];
  scanning: boolean;
}

const initialState: ArduinoState = {
  devices: [],
  scanning: false,
};

const arduinoSlice = createSlice({
  name: 'arduino',
  initialState,
  reducers: {
    setScanning: (state, action: PayloadAction<boolean>) => {
      state.scanning = action.payload;
    },
    setDevices: (state, action: PayloadAction<ArduinoDevice[]>) => {
      state.devices = action.payload;
    },
    updateDevice: (state, action: PayloadAction<ArduinoDevice>) => {
      const idx = state.devices.findIndex(d => d.port === action.payload.port);
      if (action.payload.status === 'disconnected') {
        if (idx >= 0) state.devices.splice(idx, 1);
      } else {
        if (idx >= 0) state.devices[idx] = action.payload;
        else state.devices.push(action.payload);
      }
    },
  },
});

export const { setScanning, setDevices, updateDevice } = arduinoSlice.actions;
export default arduinoSlice.reducer;