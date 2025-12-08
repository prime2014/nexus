// import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
// import { RefreshCw, Zap, Save, Cpu } from 'lucide-react';
// import "./Arduino.css";

// // --- TypeScript Interfaces ---

// // Interface for the minimal data received from the Tauri/Rust side during a scan
// interface TauriDeviceResponse {
//     portName: string | null;
//     stableId: string;
// }

// // Interface for the full device object managed in the component state
// interface Device {
//     stableId: string;
//     customName: string;
//     currentPort: string | null;
// }

// // Type for the state dictionary (keyed by stableId)
// type DeviceMap = Record<string, Device>;

// // --- Hardcoded Device Data Simulation (Same as before) ---
// const INITIAL_TAURI_DATA: TauriDeviceResponse[] = [
//     { portName: 'COM3', stableId: 'ARDUINO_UNO_A9K3T' },
//     { portName: '/dev/ttyACM0', stableId: 'ARDUINO_MEGA_B7R5P' },
//     { portName: null, stableId: 'ESP32_DEV_C8L1F' },
// ];

// const loadCustomNames = (): Record<string, string> => {
//     try {
//         const storedNames = localStorage.getItem('arduinoCustomNames');
//         if (storedNames) {
//             return JSON.parse(storedNames) as Record<string, string>;
//         }
//     } catch (e) {
//         console.error("Could not load custom names from localStorage:", e);
//     }
//     return {};
// };

// // Simulate the Tauri API
// const invoke = async (command: string, _args?: any): Promise<TauriDeviceResponse[]> => {
//     console.log(`[TAURI INVOKE SIMULATION]: ${command}`);
//     if (command === 'get_connected_devices') {
//         await new Promise(resolve => setTimeout(resolve, 500)); 
//         return INITIAL_TAURI_DATA.filter(d => d.portName !== null);
//     }
//     return [];
// };


// // Component Props
// interface DeviceCardProps {
//     device: Device;
//     handleNameChange: (stableId: string, newName: string) => void;
//     saveName: (stableId: string, customName: string) => void;
//     isSaving: boolean;
// }

// // Component to represent a single connectable device
// const DeviceCard: React.FC<DeviceCardProps> = ({ device, handleNameChange, saveName, isSaving }) => {
//     const { stableId, customName, currentPort } = device;

//     const isConnected = !!currentPort;
//     const statusColor = isConnected ? '#10B981' : '#EF4444'; // Green-500 or Red-500
//     const statusBg = isConnected ? '#D1FAE5' : '#FEE2E2'; // Green-100 or Red-100
//     const statusText = isConnected ? 'Connected' : 'Disconnected';
//     const currentPortDisplay = currentPort || 'N/A';
    
//     const displayName = customName || stableId;

//     return (
//         <div className={`device-card ${isConnected ? 'card-connected' : 'card-disconnected'}`}>
//             <div className="card-header">
//                 <h3 className="card-title" style={{ color: isConnected ? '#1E3A8A' : '#374151' }}>
//                     <Cpu style={{ color: statusColor, marginRight: '0.5rem' }} size={20} />
//                     {displayName}
//                 </h3>
//                 <span className="card-status" style={{ backgroundColor: statusBg, color: statusColor }}>
//                     {statusText}
//                 </span>
//             </div>

//             <div className="card-details">
//                 <p>
//                     <span className="detail-label">Current Port:</span>
//                     <span className="detail-value-port">{currentPortDisplay}</span>
//                 </p>
//                 <p className="detail-truncated">
//                     <span className="detail-label">Stable ID:</span>
//                     <span className="detail-value-id">{stableId}</span>
//                 </p>
//             </div>
            
//             <div className="card-actions">
//                 <input
//                     type="text"
//                     className="input-name"
//                     placeholder={`Enter custom name for ${stableId}`}
//                     value={customName || ''}
//                     onChange={(e) => handleNameChange(stableId, e.target.value)}
//                 />
//                 <button
//                     onClick={() => saveName(stableId, customName)}
//                     disabled={isSaving}
//                     className={`button-save ${isSaving ? 'button-saving' : ''}`}
//                 >
//                     <Save style={{ marginRight: '0.25rem' }} size={16} />
//                     {isSaving ? 'Saving...' : 'Save Name'}
//                 </button>
//             </div>
//         </div>
//     );
// };


// const ArduinoMapper: React.FC = () => {
//     const [deviceMap, setDeviceMap] = useState<DeviceMap>({}); 
//     const [isScanning, setIsScanning] = useState<boolean>(false);
//     const [isSaving, setIsSaving] = useState<boolean>(false);

//     // --- 1. LOCAL STORAGE INITIALIZATION ---
//     useEffect(() => {
//         const customNames = loadCustomNames();
//         const initialMap: DeviceMap = {};

//         INITIAL_TAURI_DATA.forEach(device => {
//             const stableId = device.stableId;
//             initialMap[stableId] = {
//                 stableId: stableId,
//                 currentPort: device.portName,
//                 customName: customNames[stableId] || '',
//             };
//         });
//         setDeviceMap(initialMap);
//     }, []);

//     // --- 2. LOGIC TO SIMULATE PORT SCAN AND MERGE ---
//     const scanDevices = useCallback(async () => {
//         setIsScanning(true);
//         try {
//             const connectedDevices: TauriDeviceResponse[] = await invoke('get_connected_devices');

//             setDeviceMap(currentMap => {
//                 const newMap: DeviceMap = {};
                
//                 const allStableIds = new Set([
//                     ...Object.keys(currentMap), 
//                     ...connectedDevices.map(d => d.stableId)
//                 ]);

//                 allStableIds.forEach(stableId => {
//                     const deviceData = connectedDevices.find(d => d.stableId === stableId);
//                     const existingDevice = currentMap[stableId];
                    
//                     if (deviceData) {
//                         newMap[stableId] = {
//                             stableId: stableId,
//                             currentPort: deviceData.portName,
//                             customName: existingDevice?.customName || '',
//                         };
//                     } else if (existingDevice) {
//                         newMap[stableId] = {
//                             ...existingDevice,
//                             currentPort: null,
//                         };
//                     }
//                 });
                
//                 return newMap;
//             });

//         } catch (error) {
//             console.error("Failed to scan devices:", error);
//         } finally {
//             setIsScanning(false);
//         }
//     }, []);

//     // --- 3. HANDLERS FOR UI INTERACTIONS ---

//     const handleNameChange = (stableId: string, newName: string) => {
//         setDeviceMap(currentMap => ({
//             ...currentMap,
//             [stableId]: {
//                 ...currentMap[stableId],
//                 customName: newName,
//             }
//         }));
//     };

//     const saveName = (stableId: string, customName: string) => {
//         setIsSaving(true);
        
//         setDeviceMap(currentMap => {
//             const newMap = {
//                 ...currentMap,
//                 [stableId]: {
//                     ...currentMap[stableId],
//                     customName: customName || '',
//                 }
//             };

//             const allCustomNames: Record<string, string> = Object.values(newMap).reduce((acc, device) => {
//                 if (device.customName) {
//                     acc[device.stableId] = device.customName;
//                 }
//                 return acc;
//             }, {} as Record<string, string>);
            
//             try {
//                 localStorage.setItem('arduinoCustomNames', JSON.stringify(allCustomNames));
//                 console.log(`Saved name for ${stableId} to localStorage.`);
//             } catch (e) {
//                 console.error("Failed to save to localStorage:", e);
//             }
            
//             return newMap;
//         });

//         setTimeout(() => setIsSaving(false), 500);
//     };

//     // Prepare the list of devices for rendering
//     const devicesList: Device[] = Object.values(deviceMap).sort((a, b) => {
//         // Sort connected devices first
//         if (a.currentPort && !b.currentPort) return -1;
//         if (!a.currentPort && b.currentPort) return 1;
//         return a.stableId.localeCompare(b.stableId);
//     });


//     return (
//         <div className="app-container">
            
//             <div className="main-content">
//                 <header className="app-header">
//                     <h1 className="app-title">
//                         <Zap className="app-title-icon" size={28} />
//                         Arduino Port Mapper (Offline-Ready)
//                     </h1>
//                     <p className="app-subtitle">Device identification using stable USB IDs and local storage persistence.</p>
//                 </header>

//                 <div className="scan-container">
//                     <button
//                         onClick={scanDevices}
//                         disabled={isScanning}
//                         className="button-scan"
//                     >
//                         <RefreshCw className={`button-scan-icon ${isScanning ? 'animate-spin' : ''}`} size={16} />
//                         {isScanning ? 'Scanning...' : 'Simulate Port Scan'}
//                     </button>
//                 </div>

//                 <div className="device-list">
//                     {devicesList.length === 0 && (
//                         <div className="empty-state">
//                             No devices found or initialized.
//                         </div>
//                     )}

//                     {devicesList.map((device) => (
//                         <DeviceCard
//                             key={device.stableId}
//                             device={device}
//                             handleNameChange={handleNameChange}
//                             saveName={saveName}
//                             isSaving={isSaving}
//                         />
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default ArduinoMapper;

// src/pages/arduino_customization.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { RefreshCw, Zap, Save, Cpu } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import toast from 'react-hot-toast';
import "./Arduino.css";

interface Device {
  stableId: string;
  customName: string;
  currentPort: string | null;
  vid: number;
  pid: number;
  product?: string;
}

const loadCustomNames = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem('arduinoCustomNames');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveCustomNames = (names: Record<string, string>) => {
  localStorage.setItem('arduinoCustomNames', JSON.stringify(names));
};

const ArduinoMapper: React.FC = () => {
  const dispatch = useDispatch();
  const { devices } = useSelector((state: RootState) => state.arduino);
  const [isScanning, setIsScanning] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load custom names from localStorage
  const [customNames, setCustomNames] = useState<Record<string, string>>(loadCustomNames());

  // Generate stable ID: VID:PID:Serial or fallback to port
  const getStableId = (device: any): string => {
    if (device.serial_number) {
      return `${device.vid}-${device.pid}-${device.serial_number}`;
    }
    return device.port; // fallback (less stable)
  };

  // Build device list with custom names
  const deviceList: Device[] = devices.map(d => ({
    stableId: getStableId(d),
    customName: customNames[getStableId(d)] || '',
    currentPort: d.status === 'connected' ? d.port : null,
    vid: d.vid,
    pid: d.pid,
    product: d.product,
  }));

  // Sort: connected first
  const sortedDevices = [...deviceList].sort((a, b) => {
    if (a.currentPort && !b.currentPort) return -1;
    if (!a.currentPort && b.currentPort) return 1;
    return a.stableId.localeCompare(b.stableId);
  });

  const handleNameChange = (stableId: string, name: string) => {
    setCustomNames(prev => ({ ...prev, [stableId]: name }));
  };

  const saveName = async (stableId: string, name: string) => {
    setSavingId(stableId);
    const cleanedName = name.trim();
    const newNames = { ...customNames, [stableId]: cleanedName || '' };
    setCustomNames(newNames);
    saveCustomNames(newNames);
    toast.success(`Name saved: ${cleanedName || 'cleared'}`);
    setTimeout(() => setSavingId(null), 500);
  };

  const scanNow = async () => {
    setIsScanning(true);
    try {
      await invoke("scan_arduino_now");
      toast.success("Scan complete");
    } catch (err: any) {
      toast.error("Scan failed: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <header className="app-header">
          <h1 className="app-title">
            <Zap className="app-title-icon" size={28} />
            Arduino Port Mapper
          </h1>
          <p className="app-subtitle">
            Give friendly names to your devices — survives unplug/replug
          </p>
        </header>

        <div className="scan-container">
          <button
            onClick={scanNow}
            disabled={isScanning}
            className="button-scan"
          >
            <RefreshCw className={`button-scan-icon ${isScanning ? 'animate-spin' : ''}`} size={16} />
            {isScanning ? 'Scanning...' : 'Rescan Devices'}
          </button>
        </div>

        <div className="device-list">
          {sortedDevices.length === 0 ? (
            <div className="empty-state">
              No Arduino devices detected. Plug one in and click Rescan.
            </div>
          ) : (
            sortedDevices.map(device => (
              <DeviceCard
                key={device.stableId}
                device={device}
                handleNameChange={handleNameChange}
                saveName={saveName}
                isSaving={savingId === device.stableId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Re-use your beautiful DeviceCard exactly as-is!
const DeviceCard: React.FC<{
  device: Device;
  handleNameChange: (id: string, name: string) => void;
  saveName: (id: string, name: string) => void;
  isSaving: boolean;
}> = ({ device, handleNameChange, saveName, isSaving }) => {
  const { stableId, customName, currentPort, product } = device;
  const isConnected = !!currentPort;
  const statusColor = isConnected ? '#10B981' : '#EF4444';
  const statusBg = isConnected ? '#D1FAE5' : '#FEE2E2';
  const displayName = customName || product || stableId.split('-').pop() || stableId;

  return (
    <div className={`device-card ${isConnected ? 'card-connected' : 'card-disconnected'}`}>
      <div className="card-header">
        <h3 className="card-title" style={{ color: isConnected ? '#1E3A8A' : '#374151' }}>
          <Cpu style={{ color: statusColor, marginRight: '0.5rem' }} size={20} />
          {displayName}
        </h3>
        <span className="card-status" style={{ backgroundColor: statusBg, color: statusColor }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="card-details">
        <p>
          <span className="detail-label">Port:</span>
          <span className="detail-value-port">{currentPort || 'Not connected'}</span>
        </p>
        <p className="detail-truncated">
          <span className="detail-label">ID:</span>
          <span className="detail-value-id">{stableId}</span>
        </p>
      </div>

      <div className="card-actions">
        <input
          type="text"
          className="input-name"
          placeholder="Custom name (optional)"
          value={customName}
          onChange={(e) => handleNameChange(stableId, e.target.value)}
        />
        <button
          onClick={() => saveName(stableId, customName)}
          disabled={isSaving}
          className={`button-save ${isSaving ? 'button-saving' : ''}`}
        >
          <Save style={{ marginRight: '0.25rem' }} size={16} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default ArduinoMapper;