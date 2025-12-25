import { configureStore } from '@reduxjs/toolkit';
import arduinoReducer from './arduinoSlice';
import settingsReducer from "./settingsSlice";

export const store = configureStore({
  reducer: {
    arduino: arduinoReducer,
    settings: settingsReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;