// src/hooks/useArduinoWatcher.ts
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { setDevices } from '../store/arduinoSlice';
import type { ArduinoDevice } from '../store/arduinoSlice';

// Helper function to create a unique hardware key for merging devices
const getDeviceKey = (d: ArduinoDevice): string => 
    `${d.vid}-${d.pid}-${d.serial_number || ''}`;

// Helper: Ultra-robust string normalization for COMPARISON
const getNormalizedString = (s?: string | null): string => {
    if (!s) return '';
    // Aggressively trim and normalize all whitespace characters (including non-breaking spaces)
    return String(s).trim().replace(/\s+/g, ' ');
};

// Helper: Normalizes string and returns undefined if empty, for Redux STATE storage
const getNormalizedValue = (s?: string | null): string | undefined => {
    const normalized = getNormalizedString(s);
    return normalized === '' ? undefined : normalized;
}

/**
 * Ensures the device object only contains fields defined in ArduinoDevice
 * and standardizes values (e.g., status, port) for a clean Redux state.
 */
const cleanDeviceForRedux = (d: any): ArduinoDevice => ({
    port: getNormalizedValue(d.port) || 'N/A', 
    vid: d.vid,
    pid: d.pid,
    product: getNormalizedValue(d.product),
    serial_number: getNormalizedValue(d.serial_number),
    custom_name: getNormalizedValue(d.custom_name),
    board_name: getNormalizedValue(d.board_name),
    // Standardize status
    status: getNormalizedValue(d.status) === 'connected' ? 'connected' : 'disconnected', 
});

export function useArduinoWatcher() {
    const dispatch = useDispatch();
    const knownDevices = useSelector((state: RootState) => state.arduino.devices);
    
    const initialScanPerformed = useRef(false);

    // 1. Ref to hold the latest knownDevices state, updated via an effect below.
    const knownDevicesRef = useRef(knownDevices);

    // Effect to keep the ref updated with the latest Redux state
    useEffect(() => {
        knownDevicesRef.current = knownDevices;
    }, [knownDevices]);

    // Assuming the existing implementation of scanNow
    const scanNow = async () => { 
        try {
            console.log('useArduinoWatcher.ts: SCAN_NOW: Invoking backend scan.');
            await invoke('scan_arduino_now'); 
        } catch (error) {
            console.error('Failed to trigger device scan:', error);
        }
    };


    const mergeScanResults = useCallback((connectedDevices: ArduinoDevice[]) => {
        
        // Access the current state from the ref
        const currentKnownDevices = knownDevicesRef.current;
        
        const connectedMap = new Map<string, ArduinoDevice>();
        const disconnectedPort = 'N/A';
        
        // 1. Map currently connected devices by their unique key
        connectedDevices.forEach(d => {
            connectedMap.set(getDeviceKey(d), d);
        });

        // 2. Map existing devices, only creating a new object if status or ephemeral data changes
        let mergedList: ArduinoDevice[] = currentKnownDevices.map(knownDevice => {
            const key = getDeviceKey(knownDevice);
            
            if (connectedMap.has(key)) {
                const liveDevice = connectedMap.get(key)!;
                
                const newLivePort = getNormalizedValue(liveDevice.port) || disconnectedPort;

                // Check 1: Identity Stability (Ignoring Port)
                const isIdentityStable = 
                    knownDevice.status === 'connected' &&
                    getNormalizedString(knownDevice.product) === getNormalizedString(liveDevice.product) &&
                    getNormalizedString(knownDevice.board_name) === getNormalizedString(liveDevice.board_name);
                
                const isPortStable = knownDevice.port === newLivePort;

                console.log(`useArduinoWatcher.ts: DECISION for ${key}: Identity Stable=${isIdentityStable}, Port Stable=${isPortStable}`); // LOG B
                
                if (isIdentityStable && isPortStable) {
                    // Case A: Stable AND Port stable. RETURN ORIGINAL REFERENCE.
                    console.log(`useArduinoWatcher.ts: HIT Case A: Returning original knownDevice.`); 
                    return knownDevice; 
                }

                if (isIdentityStable) {
                    // Case B: Identity stable BUT Port changed.
                    console.log(`useArduinoWatcher.ts: HIT Case B: Port changed. Creating new object.`);
                    // Use spread to preserve existing properties' references (except port)
                    return {
                        ...knownDevice,
                        port: newLivePort, // UPDATED
                    };
                }
                
                // Case C: Identity is NOT stable (e.g., disconnected -> connected, or device data changed). 
                // Create a new object with updated, sanitized fields.
                console.log(`useArduinoWatcher.ts: HIT Case C: Identity not stable. Creating new object.`);
                return {
                    // ID fields (from liveDevice)
                    vid: liveDevice.vid,
                    pid: liveDevice.pid,
                    serial_number: liveDevice.serial_number,

                    // Persistent field (from knownDevice)
                    custom_name: knownDevice.custom_name, // Preserve custom name

                    // Ephemeral/Connection fields (from liveDevice, normalized)
                    port: newLivePort, 
                    product: getNormalizedValue(liveDevice.product), 
                    board_name: getNormalizedValue(liveDevice.board_name),
                    status: 'connected',
                };

            } else {
                // NOT FOUND: Device is disconnected.
                
                // Check if the Redux state object is ALREADY correct (disconnected)
                const isAlreadyDisconnected = 
                    knownDevice.status === 'disconnected' &&
                    knownDevice.port === disconnectedPort &&
                    knownDevice.product === undefined &&
                    knownDevice.board_name === undefined;

                if (isAlreadyDisconnected) {
                    console.log(`useArduinoWatcher.ts: HIT Case D: Already disconnected. Returning original knownDevice.`);
                    return knownDevice; // Return the original reference
                }
                
                // Must create a new object to update the status/port and clear stale data
                console.log(`useArduinoWatcher.ts: HIT Case E: Device was connected, now disconnected. Creating new object.`);
                // Use spread to preserve ID/Custom Name references
                return {
                    ...knownDevice,
                    port: disconnectedPort, 
                    status: 'disconnected',
                    product: undefined, 
                    board_name: undefined, // Clear ephemeral connection data
                };
            }
        });

        // 3. Identify and add brand new devices (never seen before)
        connectedDevices.forEach(liveDevice => {
            const key = getDeviceKey(liveDevice);
            if (!currentKnownDevices.some(d => getDeviceKey(d) === key)) {
                console.log(`useArduinoWatcher.ts: HIT Case F: New device found. Pushing new object.`);
                // New devices are always created and added. 
                const newLivePort = getNormalizedValue(liveDevice.port) || disconnectedPort;
                mergedList.push({ 
                    // Explicitly define the new object based on ArduinoDevice interface
                    vid: liveDevice.vid,
                    pid: liveDevice.pid,
                    serial_number: liveDevice.serial_number,

                    custom_name: undefined, // Starts as undefined for new devices

                    // Ephemeral/Connection fields (from liveDevice, normalized)
                    port: newLivePort,
                    product: getNormalizedValue(liveDevice.product), 
                    board_name: getNormalizedValue(liveDevice.board_name),
                    status: 'connected' 
                }); 
            }
        });
        
        // 4. Perform a final check to see if the resulting list array is identical 
        // to the original list array (by checking references).
        const isListIdenticalByReference = 
            mergedList.length === currentKnownDevices.length &&
            mergedList.every((device, index) => device === currentKnownDevices[index]);

        console.log('useArduinoWatcher.ts: FINAL CHECK: Is List Identical By Reference:', isListIdenticalByReference); // LOG D

        if (isListIdenticalByReference) {
            // Do NOT dispatch if the list array reference is identical.
            console.log('useArduinoWatcher.ts: FINAL DECISION: No Dispatch (Stable)'); // LOG E
            return;
        }

        // 5. Dispatch the final merged list
        console.log('useArduinoWatcher.ts: FINAL DECISION: Dispatching new list.');
        dispatch(setDevices(mergedList));
    }, [dispatch]); // Dependency only on dispatch


    // 1. EFFECT: INITIAL LOAD FROM DATABASE (Runs once on mount)
    useEffect(() => {
        let fetchInitialData = async () => {
            try {
                console.log('useArduinoWatcher.ts: Fetching all known devices from database...');
                
                // Load the raw data from the database 
                const rawDbDevices: any[] = await invoke('fetch_all_known_devices');
                
                // CRITICAL FIX: CLEAN THE DATA to match the ArduinoDevice interface
                const dbDevices: ArduinoDevice[] = rawDbDevices.map(d => cleanDeviceForRedux(d));

                console.log("useArduinoWatcher.ts: DB DEVICES (Cleaned): ", dbDevices)
                // Initialize Redux with all known devices
                dispatch(setDevices(dbDevices));
            } catch (error) {
                console.error('Initial DB load failed:', error);
            }
        };

        fetchInitialData();
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    
    // 2. EFFECT: TAURI LISTENERS (Runs only once on mount)
    useEffect(() => {
        let unlistenScan: UnlistenFn | null = null;
        let unlistenAppReady: UnlistenFn | null = null;

        const setupListeners = async () => {
            // 2. Register the listener for scan results
            unlistenScan = await listen('arduino-scan-complete', (event) => {
                const connectedDevices = event.payload as ArduinoDevice[];
                
                console.log('useArduinoWatcher.ts: SCAN_COMPLETE: Connected devices received:', connectedDevices.length);
                
                // Call the stable merge function
                mergeScanResults(connectedDevices); 
            });

            // 3. Register a listener for the 'app-ready' event.
            unlistenAppReady = await listen('app-ready', () => {
                if (initialScanPerformed.current) return;
                initialScanPerformed.current = true;
                
                console.log('useArduinoWatcher.ts: APP_READY: Triggering initial scan.');
                scanNow();
            });
        };

        setupListeners();

        // Cleanup
        return () => {
            if (unlistenScan) unlistenScan();
            if (unlistenAppReady) unlistenAppReady();
        };

    // Dependencies only on stable function references
    }, [dispatch, mergeScanResults]); 

    return { scanNow };
}