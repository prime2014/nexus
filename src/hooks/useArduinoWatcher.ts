// src/hooks/useArduinoWatcher.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { setDevices } from '../store/arduinoSlice';
import type { ArduinoDevice } from '../store/arduinoSlice';
// Removed unused: getCurrentWindow 

// --- Helper Functions (Preserved for completeness) ---

const getDeviceKey = (d: ArduinoDevice): string => 
    `${d.vid}-${d.pid}-${d.serial_number || ''}`;

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


export function useArduinoWatcher() {
    const dispatch = useDispatch();
    const knownDevices = useSelector((state: RootState) => state.arduino.devices);
    
    // State to control application rendering
    const [isAppReady, setIsAppReady] = useState(false);
    
    // Refs to track completion status
    const initialScanPerformed = useRef(false);

    // Ref to hold the latest knownDevices state for use in callbacks
    const knownDevicesRef = useRef(knownDevices);

    // Effect to keep the ref updated with the latest Redux state
    useEffect(() => {
        knownDevicesRef.current = knownDevices;
    }, [knownDevices]);


    /* ------------------------------------------------------------- */
    /* CORE FUNCTIONS (scanNow, checkGlobalReady, mergeScanResults)  */
    /* ------------------------------------------------------------- */

    // Command to trigger an immediate device scan
    const scanNow = useCallback(async () => { 
        try {
            console.log('useArduinoWatcher.ts: SCAN_NOW: Invoking backend scan.');
            await invoke('scan_arduino_now'); 
        } catch (error) {
            console.error('Failed to trigger device scan:', error);
        }
    }, []);


    // Helper function to check and set global readiness
    const checkGlobalReady = useCallback(() => {
        if (initialScanPerformed.current) {
            console.log('useArduinoWatcher.ts: GLOBAL READY: Initial scan complete. Setting isAppReady=true.');
            setIsAppReady(true);
        }
    }, []); 


    // Device merging logic (Logic remains the same, assuming it's correct)
    const mergeScanResults = useCallback((connectedDevices: ArduinoDevice[]) => {
        
        // ... (Merging logic here, referencing knownDevicesRef.current) ...
        
        // The merging logic is preserved exactly as you provided it,
        // relying on knownDevicesRef.current being populated by the Dashboard DB load.

        const currentKnownDevices = knownDevicesRef.current;
        const disconnectedPort = 'N/A';
        
        const connectedMap = new Map<string, ArduinoDevice>();
        connectedDevices.forEach(d => {
            connectedMap.set(getDeviceKey(d), d);
        });
        
        let mergedList: ArduinoDevice[] = currentKnownDevices.map(knownDevice => {
            const key = getDeviceKey(knownDevice);
            
            if (connectedMap.has(key)) {
                const liveDevice = connectedMap.get(key)!;
                const newLivePort = getNormalizedValue(liveDevice.port) || disconnectedPort;

                // Check if the device identity is stable (not swapped/reflashed)
                const isIdentityStable = 
                    knownDevice.status === 'connected' &&
                    getNormalizedString(knownDevice.product) === getNormalizedString(liveDevice.product) &&
                    getNormalizedString(knownDevice.board_name) === getNormalizedString(liveDevice.board_name);
                
                const isPortStable = knownDevice.port === newLivePort;
                
                if (isIdentityStable && isPortStable) {
                    return knownDevice; // Identity and connection stable, no change needed
                }

                if (isIdentityStable) {
                    // Identity stable, but port changed (re-enumeration)
                    return { ...knownDevice, port: newLivePort };
                }
                
                // Identity not stable (or initial connection after disconnect)
                return {
                    vid: liveDevice.vid,
                    pid: liveDevice.pid,
                    serial_number: liveDevice.serial_number,
                    custom_name: knownDevice.custom_name, // <-- PRESERVE CUSTOM NAME
                    port: newLivePort, 
                    product: getNormalizedValue(liveDevice.product), 
                    board_name: getNormalizedValue(liveDevice.board_name),
                    status: 'connected',
                };
            } else {
                // Device is known but not in the current live scan results (disconnected)
                const isAlreadyDisconnected = 
                    knownDevice.status === 'disconnected' &&
                    knownDevice.port === disconnectedPort &&
                    knownDevice.product === undefined &&
                    knownDevice.board_name === undefined;

                if (isAlreadyDisconnected) {
                    return knownDevice; // Already marked disconnected
                }
                
                // Mark as disconnected
                return {
                    ...knownDevice,
                    port: disconnectedPort, 
                    status: 'disconnected',
                    product: undefined, 
                    board_name: undefined, 
                };
            }
        });

        // Add newly connected devices that were not previously known
        connectedDevices.forEach(liveDevice => {
            const key = getDeviceKey(liveDevice);
            if (!currentKnownDevices.some(d => getDeviceKey(d) === key)) {
                const newLivePort = getNormalizedValue(liveDevice.port) || disconnectedPort;
                mergedList.push({ 
                    vid: liveDevice.vid,
                    pid: liveDevice.pid,
                    serial_number: liveDevice.serial_number,
                    custom_name: undefined, // New device has no custom name yet
                    port: newLivePort,
                    product: getNormalizedValue(liveDevice.product), 
                    board_name: getNormalizedValue(liveDevice.board_name),
                    status: 'connected' 
                }); 
            }
        });
        
        const isListIdenticalByReference = 
            mergedList.length === currentKnownDevices.length &&
            mergedList.every((device, index) => device === currentKnownDevices[index]);

        if (isListIdenticalByReference) {
            return;
        }
        
        console.log('MERGED LIST OF DEVICES', mergedList);
        dispatch(setDevices(mergedList));

    }, [dispatch]);


    /* ------------------------------------------------------------- */
    /* NEW: EXPOSED INITIALIZATION FUNCTION                          */
    /* ------------------------------------------------------------- */

    // 🛑 NEW: Function to encapsulate the event listener setup AND start the scan
    const setupListenersAndStartScan = useCallback(async () => {
        let unlistenScan: UnlistenFn | null = null;

        // Register listener for scan results
        unlistenScan = await listen('arduino-scan-complete', (event) => {
            const connectedDevices = event.payload as ArduinoDevice[];
            mergeScanResults(connectedDevices);
            
            // Signal Initial Scan completion (only the first time)
            if (!initialScanPerformed.current) {
                initialScanPerformed.current = true;
                checkGlobalReady(); 
            }
        });

        // 🚀 Trigger the scan. This event will be handled by the listener above.
        // It runs AFTER the listener is set up, but the Dashboard ensures the DB load preceded this call.
        scanNow();
        
        return unlistenScan;

    }, [scanNow, mergeScanResults, checkGlobalReady]);


    // 🛑 REMOVED: The old useEffect hook that ran automatically on mount is removed.

    return { 
        scanNow, 
        isAppReady, 
        setupListenersAndStartScan // 🛑 This is the new function Dashboard must call
    };
}