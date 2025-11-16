import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { setDevices } from '../store/arduinoSlice';
import type { ArduinoDevice } from '../store/arduinoSlice';

export function useArduinoWatcher() {
  const dispatch = useDispatch();
  
  // FIX: Use a ref to track if the initial scan has already been executed.
  // This prevents redundant calls to scanNow() if the hook remounts quickly (e.g., in Strict Mode).
  const initialScanPerformed = useRef(false); 

  // Command to trigger a one-off scan (sends the current device list)
  const scanNow = async () => {
    try {
      await invoke('scan_arduino_now');
      console.log('Manual scan requested.');
    } catch (error) {
      console.error('Manual scan failed:', error);
    }
  };


  useEffect(() => {
    let unlistenScan: UnlistenFn | null = null;
    let unlistenAppReady: UnlistenFn | null = null;
    
    const setupWatcher = async () => {
      // 1. Register the listener for scan results
      unlistenScan = await listen('arduino-scan-complete', (event) => {
        console.log('Devices received:', event.payload);
        const devices = event.payload as ArduinoDevice[];
        dispatch(setDevices(devices));
      });
      
      // 2. Register a listener for the 'app-ready' event.
      unlistenAppReady = await listen('app-ready', () => {
          // --- CONCURRENCY FIX GUARD ---
          // Check the flag before performing the action.
          if (initialScanPerformed.current) {
              console.log('App ready received, but initial scan already performed. Skipping redundant scanNow.');
              return;
          }
          // Set the flag immediately before calling
          initialScanPerformed.current = true;
          // ----------------------------

          console.log('App ready. Requesting immediate device list...');
          scanNow();
      });
      
      console.log('Tauri listeners registered and awaiting app-ready event.');
    };

    setupWatcher();

    // Cleanup
    return () => {
      if (unlistenScan) unlistenScan();
      if (unlistenAppReady) unlistenAppReady();
    };
    
  }, [dispatch]);

  return { scanNow };
}