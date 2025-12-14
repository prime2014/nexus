import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SidebarMenu from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import { useArduinoWatcher } from "./hooks/useArduinoWatcher";
import { Provider } from "react-redux";
import { store } from "./store";
import Analytics from "./pages/Analytics";
import { DoctorProvider } from "./context/DoctorContext"; 
import DeviceDetail from "./pages/DeviceDetail";
import PatientList from "./pages/PatientList";
import PatientTestDashboard from "./pages/PatientTestDashboard";
import { ArduinoDevice } from "./store/arduinoSlice";


// src/App.tsx (MODIFIED)

// ... (other imports) ...
// ... (Redux and Context imports) ...
import { useState, useEffect, useCallback } from "react"; // <-- Import required hooks
import { invoke } from "@tauri-apps/api/core";
import { useDispatch } from "react-redux";
import { setDevices } from "./store/arduinoSlice";
import { listen, UnlistenFn } from '@tauri-apps/api/event';
// NOTE: You must ensure cleanDeviceForRedux is available/imported here or within the functions below.
// Assuming ArduinoDevice type is available globally or imported.

const getNormalizedString = (s?: string | null): string => {
    if (!s) return '';
    return String(s).trim().replace(/\s+/g, ' ');
};

const getNormalizedValue = (s?: string | null): string | undefined => {
    const normalized = getNormalizedString(s);
    return normalized === '' ? undefined : normalized;
}

const cleanDeviceForRedux = (d: any): ArduinoDevice => ({
    port: getNormalizedValue(d.port) || 'N/A', 
    vid: d.vid,
    pid: d.pid,
    product: getNormalizedValue(d.product),
    serial_number: getNormalizedValue(d.serial_number),
    custom_name: getNormalizedValue(d.custom_name),
    board_name: getNormalizedValue(d.board_name),
    status: getNormalizedValue(d.status) === 'connected' ? 'connected' : 'disconnected', 
});

// 🚨 NEW: AppInitializer Component - Handles the strict sequential setup
function AppInitializer({ children }) {
    // Get the core functions from the watcher hook
    const { isAppReady, setupListenersAndStartScan } = useArduinoWatcher();
    
    const dispatch = useDispatch(); // Get dispatch for Redux actions
    
    // Local state to track the first step: DB load completion
    const [isDbLoaded, setIsDbLoaded] = useState(false);

    // 1. Initial Load Effect: Run DB fetch on mount
    useEffect(() => {
        let unlistenScan: UnlistenFn | null = null; // Assuming UnlistenFn is imported

        const fetchInitialDevicesFromDb = async () => {
            try {
                // Fetch known devices from the DB (with custom names)
                const rawDbDevices: any[] = await invoke('fetch_all_known_devices');
                const dbDevices: ArduinoDevice[] = rawDbDevices.map(d => cleanDeviceForRedux(d));
                dispatch(setDevices(dbDevices)); // Dispatch to Redux
                console.log("AppInitializer: STEP 1 (DB Load) complete. Custom names loaded.");
            } catch (err) {
                console.error("AppInitializer: DB Load FAILED. The actual error object received is:", err);

                // If the error object is large or complex, use JSON.stringify:
                try {
                    console.error("AppInitializer: DB Load FAILED. Stringified Error:", JSON.stringify(err, null, 2));
                } catch (e) {
                    console.error("AppInitializer: Failed to stringify error. Error toString:", err.toString());
                }
            }
        };

        const initializeDb = async () => {
            await fetchInitialDevicesFromDb();
            setIsDbLoaded(true); // Signal step 1 complete
        };
        
        const timer = setTimeout(() => {
            initializeDb();
        }, 1000);
        
        // Cleanup is handled in the next effect
        return () => {
            if (unlistenScan) unlistenScan();
            clearTimeout(timer);
        }

    }, [dispatch]); // Only runs once on mount


    // 2. Watcher Setup Effect: Run only after DB load is complete
    useEffect(() => {
        let unlistenScan: UnlistenFn | null = null; 

        if (isDbLoaded) {
            console.log("AppInitializer: STEP 2 - DB Load confirmed. Initializing Watcher and Scan.");
            
            // This sets up listeners and triggers the scan. 
            // The scan event will set isAppReady=true inside the watcher hook.
            setupListenersAndStartScan()
                .then(unlisten => {
                    unlistenScan = unlisten;
                    console.log("AppInitializer: STEP 2 (Watcher Init + Live Scan Trigger) complete.");
                })
                .catch(err => {
                    console.error("Failed to setup watcher and start scan:", err);
                });
        }
        
        // Cleanup: Stop the listener when the component unmounts
        return () => {
            if (unlistenScan) unlistenScan();
        }
        
    }, [isDbLoaded, setupListenersAndStartScan]); 


    // 3. Render Gate: Wait for both steps to complete
    if (!isAppReady) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh', 
                fontSize: '24px' 
            }}>
                Loading Application Resources...
            </div>
        );
    }

    // 4. Initialization complete: Render the children (AppContent)
    return children;
}


// 🚨 ORIGINAL AppContent Component (REMOVED Watcher Hook Call)
function AppContent() {
   
    
    return (
        <Router>
            <div style={{ display: "flex", height: "100vh", margin: 0, padding: 0 }}>
                <SidebarMenu />
                <div style={{ flex: 1, marginLeft: 220, padding: "2rem" }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/logs" element={<Logs />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/analytics/:patientId" element={<Analytics />} />
                        <Route path="/device/:portName" element={<DeviceDetail />} />
                        <Route path="/test/:admissionNo" element={<PatientTestDashboard />} />
                        <Route path="/patients" element={<PatientList />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

// The main export just wraps the entire application in providers
export default function App() {
    return (
        <Provider store={store}>
            <DoctorProvider>
                {/* 🚨 Use the new initializer component as the gate */}
                <AppInitializer>
                    <AppContent /> 
                </AppInitializer>
            </DoctorProvider>
        </Provider>
    );
}