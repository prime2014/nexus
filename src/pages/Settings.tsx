import React, { useState } from "react";
import { Card } from 'primereact/card';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { invoke } from "@tauri-apps/api/core";
import toast, { Toaster } from "react-hot-toast";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { setSettings } from '../store/settingsSlice';
import { getVersion } from "@tauri-apps/api/app";
import { ask } from '@tauri-apps/plugin-dialog';

// 🌟 Import Updater & Process plugins
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface MyAppSettings {
    theme: string,
    baud_rate_default: number,
    auto_connect_enabled: boolean,
    default_doctor_name: string,
    log_level: string,
    log_file_location: string,
    sqlite_file_path: string,
}

const themeOptions = [
    { label: 'System Default', value: 'system' },
    { label: 'Light Mode', value: 'light' },
    { label: 'Dark Mode', value: 'dark' }
];

const logOptions = [
    { label: 'Error (Minimal)', value: 'error' },
    { label: 'Info (Standard)', value: 'info' },
    { label: 'Debug (Verbose)', value: 'debug' }
];

interface SettingItemProps {
    label: string;
    description: string;
    children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, children }) => (
    <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid #eee' }}>
        <div className="setting-info">
            <h4 style={{ margin: 0 }}>{label}</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#666' }}>{description}</p>
        </div>
        <div className="setting-control">{children}</div>
    </div>
);

export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [checkingUpdate, setCheckingUpdate] = useState(false); // 🌟 New State
    const settings = useSelector((state: RootState) => state.settings);
    const dispatch = useDispatch<AppDispatch>();

    const handleCheckUpdate = async () => {
        setCheckingUpdate(true);
        try {
            const update = await check();
            if (update) {
                const currentVersion = await getVersion();

                const confirmUpdate = await ask(
                    `A new version (${update.version}) is available. Your current version is ${currentVersion}.\n\nRelease Notes: ${update.body}\n\nWould you like to download and install it now?`, 
                    { 
                        title: 'Nexus Update Available',
                        kind: 'info',
                        okLabel: 'Update Now',
                        cancelLabel: 'Later'
                    }
                )

                console.log(confirmUpdate)
                
                if (confirmUpdate) {
                    const toastId = toast.loading("Starting download...");
                    await update.downloadAndInstall((event) => {
                        switch (event.event) {
                            case 'Started':
                                toast.loading("Download started...", { id: toastId });
                                break;
                            case 'Progress':
                                toast.loading(`Downloading...`, { id: toastId });
                                break;
                            case 'Finished':
                                toast.success("Download complete! Installing...", { id: toastId });
                                break;
                        }
                    });
                    await relaunch();
                } else {
                    return
                }
            } else {
                toast.success("Nexus is already up to date!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to check for updates. Please check your internet.");
        } finally {
            setCheckingUpdate(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await invoke("save_settings", { settings });
            toast.success("Settings saved successfully!");
        } catch (error) {
            toast.error("Failed to save settings.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleChange = (key: keyof MyAppSettings, value: any) => {
        dispatch(setSettings({ ...settings, [key]: value }));
    };

    const openFolder = async () => {
        try {
            let folderPath = settings.log_file_location;
            if (!folderPath || folderPath.trim() === '') {
                const defaults = await invoke<{ log_directory: string }>("get_default_paths");
                folderPath = defaults.log_directory;
            }
            await revealItemInDir(folderPath);
            toast.success("Log folder opened");
        } catch (err) {
            toast.error("Could not open folder");
        }
    };

    return (
        <div className="settings-container" style={{ padding: '1rem', maxWidth: '80vw', margin: '0 auto' }}>
            <Toaster position="top-right" />
            <h1 className="settings-title">⚙️ Application Settings</h1>
            
            {/* --- 🌟 1. Software Updates Card (Added) --- */}
            <Card title="Software Updates" className="settings-card" style={{ marginBottom: '1.5rem' }}>
                <SettingItem 
                    label="Application Version" 
                    description="Check if you are running the latest medical diagnostic patches."
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 'bold' }}>v0.1.5</span>
                        <Button 
                            label={checkingUpdate ? "Checking..." : "Check for Updates"} 
                            icon={checkingUpdate ? "pi pi-spin pi-spinner" : "pi pi-refresh"} 
                            className="p-button-outlined p-button-sm"
                            onClick={handleCheckUpdate}
                            disabled={checkingUpdate}
                        />
                    </div>
                </SettingItem>
            </Card>

            <Card title="General & Appearance" className="settings-card" style={{ marginBottom: '1.5rem' }}>
                <SettingItem label="Application Theme" description="Switch between light, dark, or system default mode.">
                    <Dropdown value={settings.theme} options={themeOptions} onChange={(e) => handleChange('theme', e.value)} style={{ width: '200px' }} />
                </SettingItem>
                <SettingItem label="Default Doctor Name" description="The default name pre-filled for new admission records.">
                    <InputText value={settings.default_doctor_name} onChange={(e) => handleChange('default_doctor_name', e.target.value)} style={{ width: '200px' }} />
                </SettingItem>
            </Card>

            <Card title="Hardware Connections" className="settings-card" style={{ marginBottom: '1.5rem' }}>
                <SettingItem label="Auto-Connect on Startup" description="Attempt to connect to known devices when the app launches.">
                    <InputSwitch checked={settings.auto_connect_enabled} onChange={(e) => handleChange("auto_connect_enabled", e.value)} />
                </SettingItem>
                <SettingItem label="Default Baud Rate" description="The default serial speed (bits per second) for new connections.">
                    <InputText type="number" value={settings.baud_rate_default.toString()} onChange={(e) => handleChange("baud_rate_default", Number(e.target.value))} style={{ width: '100px' }} />
                </SettingItem>
            </Card>

            <Card title="Advanced & Data Management" className="settings-card">
                <SettingItem label="Backend Logging Level" description="Control the verbosity of the Rust console logs.">
                    <Dropdown value={settings.log_level} options={logOptions} onChange={(e) => handleChange("log_level", e.value)} style={{ width: '150px' }} />
                </SettingItem>
                <SettingItem label="Open Data Folder" description="View directory containing database and config files.">
                    <Button label="Open Folder" icon="pi pi-folder-open" className="p-button-secondary p-button-sm" onClick={openFolder} />
                </SettingItem>
                <SettingItem label="Clear All Data" description="Warning: Deletes all patient and admission records permanently.">
                    <Button label="Reset Database" icon="pi pi-trash" className="p-button-danger p-button-sm" onClick={() => { if(window.confirm('Delete ALL data?')) invoke("reset_database") }} />
                </SettingItem>
            </Card>
            
            <div className="save-bar" style={{ marginTop: '2rem', textAlign: 'right' }}>
                <Button label={loading ? "Saving..." : "Save Changes"} icon="pi pi-check" onClick={handleSave} disabled={loading} className="p-button-success" />
            </div>
        </div>
    );
}