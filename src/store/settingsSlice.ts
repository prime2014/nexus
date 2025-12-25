import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define the settings interface
interface MyAppSettings {
    theme: string;
    baud_rate_default: number;
    auto_connect_enabled: boolean;
    default_doctor_name: string;
    log_level: string;
    log_file_location: string;
    sqlite_file_path: string;
}

// Initial state with proper defaults
const initialState: MyAppSettings = {
    theme: "system",
    baud_rate_default: 9600,
    auto_connect_enabled: true,
    default_doctor_name: "",
    log_level: "info",
    log_file_location: "",
    sqlite_file_path: ""
};

// Create the slice
const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        // Replace entire settings object (useful when loading from backend)
        setSettings: (state, action: PayloadAction<MyAppSettings>) => {
            return action.payload; // Immer allows direct return of new state
        },

        // Optional: Individual setters for fine-grained updates
        setTheme: (state, action: PayloadAction<string>) => {
            state.theme = action.payload;
        },
        setBaudRate: (state, action: PayloadAction<number>) => {
            state.baud_rate_default = action.payload;
        },
        setAutoConnect: (state, action: PayloadAction<boolean>) => {
            state.auto_connect_enabled = action.payload;
        },
        setDefaultDoctor: (state, action: PayloadAction<string>) => {
            state.default_doctor_name = action.payload;
        },
        setLogLevel: (state, action: PayloadAction<string>) => {
            state.log_level = action.payload;
        },
        setLogLocation: (state, action: PayloadAction<string>) => {
            state.log_file_location = action.payload;
        },
        setDatabaseLocation: (state, action: PayloadAction<string>) => {
            state.sqlite_file_path = action.payload;
        },
    }
});

// Export actions
export const {
    setSettings,
    setTheme,
    setBaudRate,
    setAutoConnect,
    setDefaultDoctor,
    setLogLevel,
    setLogLocation,
    setDatabaseLocation
} = settingsSlice.actions;

// Export reducer
export default settingsSlice.reducer;