import React, { useState, useEffect } from "react";
import { Card } from 'primereact/card';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { invoke } from "@tauri-apps/api/core";
import toast, { Toaster } from "react-hot-toast";
import { readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store'; // Adjust path
import { setSettings } from '../store/settingsSlice';
// Assuming you have imported your required types from earlier code

// --- Configuration Types ---
interface AppSettings {
    theme: string;
    baudRateDefault: number;
    autoConnectEnabled: boolean;
    defaultDoctorName: string;
    logLevel: string;
}

interface MyAppSettings {
    theme: string,
    baud_rate_default: number,
    auto_connect_enabled: boolean,
    default_doctor_name: string,
    log_level: string,
    log_file_location: string,
    sqlite_file_path: string,

}

// Dummy data for dropdowns
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

// --- Helper Component for Clean Item Layout (No changes needed) ---
interface SettingItemProps {
    label: string;
    description: string;
    children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, children }) => (
    <div className="setting-item">
        <div className="setting-info">
            <h4 className="setting-label">{label}</h4>
            <p className="setting-description">{description}</p>
        </div>
        <div className="setting-control">
            {children}
        </div>
    </div>
);

// --- Main Component ---
export default function Settings() {
    const [loading, setLoading] = useState(false);
    const settings = useSelector((state: RootState) => state.settings);
    const dispatch = useDispatch<AppDispatch>();


    // Function to handle saving settings
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
    
    // Function to handle setting changes
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

            // This opens Windows File Explorer directly at the folder (highlighted)
            await revealItemInDir(folderPath);

            toast.success("Log folder opened in File Explorer");
        } catch (err) {
            console.error("Failed to open folder:", err);
            toast.error("Could not open log folder");
        }
    };

    return (
        <div className="settings-container">
            <Toaster position="top-right" />
            
            <h1 className="settings-title">⚙️ Application Settings</h1>
            
            {/* --- 1. General Settings Card --- */}
            <Card title="General & Appearance" className="settings-card">
                <SettingItem 
                    label="Application Theme" 
                    description="Switch between light, dark, or system default mode."
                >
                    <Dropdown 
                        value={settings.theme} 
                        options={themeOptions} 
                        onChange={(e) => handleChange('theme', e.value)} 
                        placeholder="Select a Theme" 
                        style={{ width: '200px' }}
                    />
                </SettingItem>
                <SettingItem 
                    label="Default Doctor Name" 
                    description="The default name pre-filled for new admission records."
                >
                    <InputText 
                        value={settings.default_doctor_name} 
                        onChange={(e) => handleChange('default_doctor_name', e.target.value)} 
                        placeholder="Doctor Name" 
                        style={{ width: '200px' }}
                    />
                </SettingItem>
            </Card>

            {/* --- 2. Hardware/Connection Settings Card --- */}
            <Card title="Hardware Connections" className="settings-card">
                <SettingItem 
                    label="Auto-Connect on Startup" 
                    description="Attempt to connect to known devices when the app launches."
                >
                    <InputSwitch 
                        checked={settings.auto_connect_enabled} 
                        onChange={(e) => handleChange("auto_connect_enabled", e.value)} 
                    />
                </SettingItem>
                <SettingItem 
                    label="Default Baud Rate" 
                    description="The default serial speed (bits per second) for new connections."
                >
                    <InputText 
                        type="number"
                        value={settings.baud_rate_default.toString()} 
                        onChange={(e) => handleChange("baud_rate_default", Number(e.target.value))} 
                        style={{ width: '100px' }}
                    />
                </SettingItem>
            </Card>

            {/* --- 3. Advanced/Data Settings Card --- */}
            <Card title="Advanced & Data Management" className="settings-card">
                <SettingItem 
                    label="Backend Logging Level" 
                    description="Control the verbosity of the Rust console logs for diagnostics."
                >
                    <Dropdown 
                        value={settings.log_level} 
                        options={logOptions} 
                        onChange={(e) => handleChange("log_level", e.value)} 
                        placeholder="Select Level" 
                        style={{ width: '150px' }}
                    />
                </SettingItem>
                <SettingItem 
                    label="Open Data Folder" 
                    description="View the directory containing your application database and config files."
                >
                    <Button 
                        label="Open Folder" 
                        icon="pi pi-folder-open" 
                        className="p-button-secondary p-button-sm"
                        onClick={openFolder}
                    />
                </SettingItem>
                <SettingItem 
                    label="Clear All Data" 
                    description="**Warning:** Deletes all patient and admission records permanently. Use with extreme caution."
                >
                    <Button 
                        label="Reset Database" 
                        icon="pi pi-trash" 
                        className="p-button-danger p-button-sm"
                        onClick={() => { if(window.confirm('Are you absolutely sure you want to delete ALL application data? This cannot be undone.')) invoke("reset_database") }} 
                    />
                </SettingItem>
            </Card>
            
            {/* --- Save Bar (Fixed at the bottom or floating) --- */}
            <div className="save-bar">
                <Button 
                    label={loading ? "Saving..." : "Save Changes"} 
                    icon="pi pi-check" 
                    onClick={handleSave} 
                    disabled={loading}
                    className="p-button-success"
                />
            </div>
        </div>
    );
}

// Ensure the helper component is defined or imported in your file.
// (It is included above for completeness)