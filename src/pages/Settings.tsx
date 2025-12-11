import React, { useState, useEffect } from "react";
import { Card } from 'primereact/card';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { invoke } from "@tauri-apps/api/core";
import toast, { Toaster } from "react-hot-toast";
import { readDir, BaseDirectory } from '@tauri-apps/plugin-fs';
// Assuming you have imported your required types from earlier code

// --- Configuration Types ---
interface AppSettings {
    theme: string;
    baudRateDefault: number;
    autoConnectEnabled: boolean;
    defaultDoctorName: string;
    logLevel: string;
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
    const [settings, setSettings] = useState<AppSettings>({
        // Initial dummy/default settings
        theme: 'system',
        baudRateDefault: 9600,
        autoConnectEnabled: true,
        defaultDoctorName: 'Dr. Smith',
        logLevel: 'info',
    });
    const [loading, setLoading] = useState(false);

    // Placeholder function to simulate loading settings from Rust/persistence
    useEffect(() => {
        // invoke<AppSettings>("load_settings").then(data => setSettings(data));
    }, []);

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
    const handleChange = (key: keyof AppSettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const openFolder = async () => {
        await readDir("logs", { baseDir: BaseDirectory.AppLocalData });
    }

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
                        value={settings.defaultDoctorName} 
                        onChange={(e) => handleChange('defaultDoctorName', e.target.value)} 
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
                        checked={settings.autoConnectEnabled} 
                        onChange={(e) => handleChange('autoConnectEnabled', e.value)} 
                    />
                </SettingItem>
                <SettingItem 
                    label="Default Baud Rate" 
                    description="The default serial speed (bits per second) for new connections."
                >
                    <InputText 
                        type="number"
                        value={settings.baudRateDefault.toString()} 
                        onChange={(e) => handleChange('baudRateDefault', Number(e.target.value))} 
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
                        value={settings.logLevel} 
                        options={logOptions} 
                        onChange={(e) => handleChange('logLevel', e.value)} 
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