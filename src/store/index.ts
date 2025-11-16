import { configureStore } from '@reduxjs/toolkit';
import arduinoReducer from './arduinoSlice';

export const store = configureStore({
  reducer: {
    arduino: arduinoReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;