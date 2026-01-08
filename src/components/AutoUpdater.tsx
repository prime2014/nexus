// src/components/AutoUpdater.tsx
import { useState, useEffect } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export const useAutoUpdater = () => {
    const [status, setStatus] = useState<'checking' | 'available' | 'up-to-date'>('checking');
    const [manifest, setManifest] = useState<Update | null>(null);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        const checkForUpdatesOnStartup = async () => {
            try {
                const update = await check();
                if (update) {
                    setManifest(update);
                    setStatus('available');
                } else {
                    setStatus('up-to-date');
                }
            } catch (error) {
                console.error("Startup update check failed:", error);
                setStatus('up-to-date'); // Fallback so the app still opens if offline
            }
        };

        checkForUpdatesOnStartup();
    }, []);

    const triggerUpdate = async () => {
        if (!manifest) return;
        setInstalling(true);
        try {
            await manifest.downloadAndInstall();
            await relaunch();
        } catch (e) {
            console.error("Installation failed", e);
            setInstalling(false);
        }
    };

    // 🚨 IMPORTANT: This return statement fixes the Uncaught TypeError
    return { status, manifest, triggerUpdate, installing };
};