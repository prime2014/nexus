import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import toast, { Toaster } from "react-hot-toast";
import { Card } from 'primereact/card';
import "./DeviceDetail.css";

// Assuming you have this action in your arduinoSlice.ts
import { setDeviceCustomName } from '../store/arduinoSlice'; 


// Define the type for the URL parameters
interface DeviceDetailParams {
    portName: string;
    [key: string]: string | undefined;
}

export default function DeviceDetail() {
    const { portName } = useParams<DeviceDetailParams>();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Find the device data from the Redux store
    const device = useSelector((state: RootState) =>
        state.arduino.devices.find(d => d.port === portName)
    );
    
    // Local state for the editable name (alias)
    const [alias, setAlias] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    // --- Effect to handle initial state and navigation ---
    useEffect(() => {
        if (!device) {
            toast.error(`Device ${portName} not found.`);
            navigate('/');
        } else {
            // Set the initial alias: 
            // 1. Prefer custom_name (the saved name)
            // 2. Fall back to product name
            // 3. Fall back to port name
            // setAlias(device.custom_name || device.product || device.port || ""); 
        }
    }, [device, portName, navigate]);

    if (!device) {
        return <div className="detail-layout">Loading...</div>;
    }

    // Determine the baseline name for comparison (current saved name or default)
    const comparisonName = device.custom_name || device.product || device.port || "";
    const isNameUnchanged = alias.trim() === comparisonName.trim();
    
    // --- Data Handling: Updated to pass hardware IDs ---
    const handleAliasChange = async () => {
        setIsUpdating(true);
        const trimmedAlias = alias.trim();
        
        // Safety check to prevent unnecessary API calls
        if (isNameUnchanged) {
            setIsUpdating(false);
            return;
        }

        try {
            // 💡 INVOKE COMMAND: Pass all unique hardware identifiers
            await invoke("update_device_alias", {
                portName: device.port, 
                product: device.product,
                vid: device.vid,
                pid: device.pid,
                serialNumber: device.serial_number, // Passed as Option<String> in Rust
                newAlias: trimmedAlias 
            });

            // 💡 REDUX UPDATE: Update the custom_name in the store
            dispatch(setDeviceCustomName({ port: device.port, customName: trimmedAlias })); 
            setAlias("")
            toast.success(`Device name updated to "${trimmedAlias}"`);
        } catch (error) {
            // 💡 ERROR HANDLING: Use the error message returned from Rust
            const errorMessage = typeof error === 'string' ? error : "An unknown error occurred while saving.";
            console.error("Failed to update device alias:", error);
            toast.error(errorMessage);
        } finally {
            setIsUpdating(false);
        }
    };
    
    const isConnected = device.status === "connected";
    const statusClass = isConnected ? "status-connected" : "status-disconnected";

    return (
        <div className="detail-layout">
            <Toaster position="top-right" />
            
            {/* --- 1. Header & Back Button --- */}
            <div className="detail-header-bar">
                <Button 
                    label="Back to Dashboard" 
                    icon="pi pi-arrow-left" 
                    className="p-button-text p-button-sm back-button" 
                    onClick={() => navigate('/')} 
                />
            </div>

            {/* --- 2. Main Device Card (Use custom_name for title) --- */}
            <Card className="device-summary-card">
                <div className="device-card-content">
                    {/* Device Icon and Name */}
                    <div className="device-icon-group">
                        <i className="pi pi-microchip device-icon" />
                        {/* Use the ALIAS for the displayed title since it reflects the current state */}
                        <h1 className="device-title">{device.custom_name || device.product || "Unknown Device"}</h1> 
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`status-badge ${statusClass}`}>
                        {device.status.toUpperCase()}
                    </span>
                </div>
                
                {/* Key Details Grid */}
                <div className="detail-grid">
                    <div className="detail-item">
                        <p className="detail-label">Port</p>
                        <p className="detail-value">{device.port}</p>
                    </div>
                    <div className="detail-item">
                        <p className="detail-label">VID / PID</p>
                        <p className="detail-value">
                            0x{device.vid.toString(16).toUpperCase()} / 0x{device.pid.toString(16).toUpperCase()}
                        </p>
                    </div>
                    <div className="detail-item">
                        <p className="detail-label">Serial Number</p>
                        <p className="detail-value">{device.serial_number || "N/A"}</p>
                    </div>
                    <div className="detail-item">
                        <p className="detail-label">Product Name</p>
                        <p className="detail-value">{device.product || "N/A"}</p>
                    </div>
                </div>
            </Card>
            
            {/* --- 3. Customization Panel --- */}
            <Card title="Name Customization" className="customization-card">
                <p className="p-text-secondary p-mb-3">
                    Set a friendly name for this device that will appear on the dashboard.
                </p>
                <div className="p-field p-fluid name-input-group">
                    <label htmlFor="device-alias" className="p-sr-only">Custom Display Name</label>
                    <InputText 
                        id="device-alias" 
                        value={alias} 
                        onChange={(e) => setAlias(e.target.value)} 
                        placeholder="Enter a friendly name (e.g., 'Lab Unit 1')"
                        className="p-inputtext-lg"
                    />
                    <Button 
                        label={isUpdating ? "Saving..." : "Save Name"} 
                        
                        icon="pi pi-save"
                        onClick={handleAliasChange} 
                        disabled={!alias || isUpdating || isNameUnchanged}
                        className="p-button-primary save-custom-name"
                    />
                </div>
            </Card>

            {/* --- 4. Additional Content Area (e.g., Live Readings) --- */}
            <Card title="Live Readings & History (Future Feature)" className="history-card">
                <p className="p-text-secondary">
                    Detailed live data streams and historical performance graphs for this specific device can be implemented here.
                </p>
            </Card>

        </div>
    );
}