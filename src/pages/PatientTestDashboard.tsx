// src/components/PatientTestDashboard.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from "recharts";
import { Button } from "primereact/button";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaUser, FaMicroscope, FaCheckCircle, FaTimesCircle, FaWrench, FaChartLine } from 'react-icons/fa';
// Note the updated CSS file name
import "./DashboardTest.css"; 

// Simplified Patient Metadata for display
interface PatientMetadata {
    firstname: string;
    lastname: string;
    admission_no: string;
    doctor: string | null,
}

// Device interface (assuming it comes from Redux state)
interface ArduinoDevice {
    port: string;
    status: 'connected' | 'disconnected' | 'reading';
    custom_name?: string;
    product?: string;
}

// Data structures for storing readings
type ReadingSet = { time: string; value: number }[];

export default function PatientTestDashboard() {
    // Hooks and State
    const { devices } = useSelector((state: RootState) => state.arduino);
    const { admissionNo } = useParams<{ admissionNo: string }>();
    const navigate = useNavigate();

    const [patientData, setPatientData] = useState<PatientMetadata | null>(null);
    const [loadingPatient, setLoadingPatient] = useState(true);
    const [consoleLines, setConsoleLines] = useState<string[]>([]);
    const consoleLinesRef = useRef<string[]>([]);
    const [readingPorts, setReadingPorts] = useState<Set<string>>(new Set());
    const consoleRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form data to capture sample type
    const [sampleType, setSampleType] = useState<"normal" | "cancer">("normal");

    // Live Chart Data
    const [chartData, setChartData] = useState<ReadingSet>([]);
    const chartDataRef = useRef<ReadingSet>([]); 

    // Storage for completed test data (to be saved)
    const [normalCellReadings, setNormalCellReadings] = useState<number[]>([]);
    const [cancerCellReadings, setCancerCellReadings] = useState<number[]>([]);

    /* ------------------------------------------------------------------ */
    /* RUST COMMANDS (PLACEHOLDERS)                                       */
    /* ------------------------------------------------------------------ */

    const startTestCycle = useCallback(async (portName: string) => {
        if (readingPorts.has(portName)) return;
        
        // Clear previous chart/console output for new cycle clarity
        setConsoleLines([]);
        setChartData([]);
        chartDataRef.current = [];

        setReadingPorts(prev => new Set(prev).add(portName));
        toast.loading(`Starting test cycle for ${sampleType} cells on ${portName}...`);

        try {
            // Placeholder: Assume this Rust command starts the hardware test
            // await invoke("start_test_cycle", { port, sampleType });
            await invoke("start_reading_from_port", { portName, baudRate: 9600 });
            console.log(portName, sampleType)
            toast.dismiss();
            toast.success(`Test for ${sampleType} cells initiated.`);
        } catch (err: any) {
            toast.dismiss();
            toast.error(`Failed to start test on ${portName}: ${err.message || String(err)}`);
            setReadingPorts(prev => {
                const next = new Set(prev);
                next.delete(portName);
                return next;
            });
        }
    }, [readingPorts, sampleType]);

    /* ------------------------------------------------------------------ */
    /* PATIENT DATA FETCHING (Unchanged)                                  */
    /* ------------------------------------------------------------------ */
    const fetchPatientData = useCallback(async () => {
        if (!admissionNo) {
            toast.error("Invalid patient ID.");
            navigate(-1);
            return;
        }
        setLoadingPatient(true);
        try {
            const data: PatientMetadata = await invoke("get_patient_by_admission_no", { admissionNo });
            console.log("***PATIENT***")
            console.log(data)
            setPatientData(data);
        } catch (err) {
            console.error("Failed to fetch patient data:", err);
            toast.error("Could not load patient metadata. Returning to list.");
            navigate('/patients');
        } finally {
            setLoadingPatient(false);
        }
    }, [admissionNo, navigate]);

    useEffect(() => {
        fetchPatientData();
    }, [fetchPatientData]);

    /* ------------------------------------------------------------------ */
    /* TAURI EVENT LISTENERS (Data, Cycle, State) (Mostly Unchanged Logic)*/
    /* ------------------------------------------------------------------ */
    
    // --- Helper to extract OFF voltages from console lines ---
    const extractOffVoltages = (lines: string[]) => {
        const regex = /Output Voltage \(OFF\):\s*([0-9]*\.[0-9]+)/;
        
        return lines
            .map(line => {
                const match = line.match(regex);
                return match ? Number.parseFloat(match[1]) : null;
            })
            .filter((v): v is number => v !== null); 
    }

    // --- Serial data listener (Modified to update chart data) ---
    useEffect(() => {
        let unlistenData: UnlistenFn | undefined;
        let unlistenCycle: UnlistenFn | undefined;
        let unlistenStop: UnlistenFn | undefined; // Add listener for cycle stop/timeout

        const extractAndPlotData = (line: string, time: string) => {
            const regex = /Output Voltage \((ON|OFF)\): ([\d.]+) V/;
            const match = line.match(regex);
            
            if (match) {
                const voltage = Number.parseFloat(match[2]);
                const newReading = { time, value: voltage };

                // Update live chart data
                chartDataRef.current = [...chartDataRef.current.slice(-29), newReading]; // Keep last 30 readings
                setChartData(chartDataRef.current);
                return true;
            }
            return false;
        };

        (async () => {
            
            unlistenData = await listen<{ port: string; data: string }>("arduino-data", (e) => {
                const line = e.payload.data.trim();
                
                if (!line) return;

                const now = new Date();
                const time = `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, "0")}`;
                const stamped = `[${time}] ${line}`;
                
                const isVoltage = extractAndPlotData(line, now.toTimeString().slice(0, 8));
                const isComplete = line.includes("cycles completed");

                if (isVoltage || isComplete) {
                    setConsoleLines((prev) => {
                        const nextLines = [...prev.slice(-100), stamped];
                        consoleLinesRef.current = nextLines; // <--- UPDATE REF HERE
                        return nextLines;
                    });
                }
            });

            // --- Cycle complete (Store readings + toast) ---
            unlistenCycle = await listen<{ port: string }>("arduino-cycle-complete", (e) => {
                toast.success(`Test Cycle complete on ${e.payload.port}. Data ready to save.`);
                
                // Remove port from readingPorts state
                setReadingPorts(prev => {
                    const next = new Set(prev);
                    next.delete(e.payload.port);
                    return next;
                });
                
                // Extract and store the final 'OFF' voltages from the latest console run
                const newOffVoltages = extractOffVoltages(consoleLinesRef.current); // <--- READ FROM REF HERE
                console.log("THE CONSOLE LINES")
                console.log(consoleLinesRef.current) // <--- Log the ref, not the state
                // Note: The next line is important! Clear the ref *before* clearing the console lines state.
                consoleLinesRef.current = [];

                console.log("THE OFF VOLTAGES: ", newOffVoltages)

                if (sampleType === 'normal') {
                    setNormalCellReadings(newOffVoltages);
                    toast(`Stored ${newOffVoltages.length} normal cell readings.`, { icon: '🟢' });
                } else if (sampleType === 'cancer') {
                    setCancerCellReadings(newOffVoltages);
                    toast(`Stored ${newOffVoltages.length} cancer cell readings.`, { icon: '🔴' });
                }

                // Reset chart after cycle complete for next run clarity
                setChartData([]);
                chartDataRef.current = [];
            });
            
            // --- Cycle Stop/Timeout Listener (Cleanup) ---
            unlistenStop = await listen<{ port: string; reason: string }>("arduino-test-stopped", (e) => {
                setReadingPorts(prev => {
                    const next = new Set(prev);
                    next.delete(e.payload.port);
                    return next;
                });
                toast.error(`Test on ${e.payload.port} stopped: ${e.payload.reason}`);
            });

        })();

        return () => {
            unlistenData?.();
            unlistenCycle?.();
            unlistenStop?.();
        };
    }, [sampleType]); 

    // --- Auto-scroll Console ---
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [consoleLines]);

    const calculateAverage = (readings: number[]): number => {
        if (readings.length === 0) return 0;
        const sum = readings.reduce((acc, val) => acc + val, 0);
        return sum / readings.length;
    };

    const handleSave = async () => {
    if (!patientData) return;
    
    if (normalCellReadings.length === 0 && cancerCellReadings.length === 0) {
        toast.error("Acquire data for at least one sample type before saving.");
        return;
    }

    setIsSaving(true);
    
    try {
        const referenceObject = {
            voltage_off: normalCellReadings,
            test_date: new Date().toISOString().split('T')[0],
        };
        const referenceJsonString = JSON.stringify(referenceObject);

        const cancerTestObject = {
            voltage_off: cancerCellReadings,
            test_date: new Date().toISOString().split('T')[0],
        };
        const cancerTestJsonString = JSON.stringify(cancerTestObject);

        const admissionDataToSave = {
            admission_no: patientData.admission_no,
            doctor_in_charge: patientData.doctor,
            technician: '',
            diabetes_test: null,
            reference: referenceJsonString,
            cancer_tests: cancerTestJsonString,
        };

        await invoke("save_admission", { data: admissionDataToSave });

        toast.success(`Admission record and test data saved for patient ${patientData.admission_no}!`);
        
        // Cleanup states after successful save
        setConsoleLines([]);
        setNormalCellReadings([]);
        setCancerCellReadings([]);
        setChartData([]);

        navigate(`/analytics/${patientData.admission_no}`);

    } catch (err: any) {
        toast.error(err.message || `Failed to save admission and test data: ${err}`);
    }

    setIsSaving(false);
};

    const handleData = async (portName: string) => {
        const isReading = readingPorts.has(portName);

        try {
        if (isReading) {
            await invoke("stop_reading_from_port", { portName });
        } else {
            await invoke("start_reading_from_port", { portName, baudRate: 9600 });
        }
        } catch (err: any) {
        toast.error(`Failed to ${isReading ? "stop" : "start"}: ${err.message || err}`);
        }
  };

    const handleGoBack = () => navigate('/patients');
    
    const patientName = patientData 
        ? `${patientData.firstname} ${patientData.lastname}` 
        : `Loading...`;

    if (loadingPatient) {
        return <div className="loading-state">Loading Patient Context...</div>;
    }
    if (!patientData) {
        return <div className="error-state">Error: Patient not found or data failed to load.</div>;
    }

    const deviceReading: (d: ArduinoDevice) => boolean = (d) => d.status === 'connected' && readingPorts.has(d.port);
    const connectedDevices = devices.filter((d: ArduinoDevice) => d.status === 'connected');

    const avgNormalVoltage = calculateAverage(normalCellReadings);
    const avgCancerVoltage = calculateAverage(cancerCellReadings);

    const handleClearReadings = (type: "normal" | "cancer") => {
        if (type === "normal") {
            setNormalCellReadings([]);
            toast.success("Normal cell readings cleared.", { icon: '🗑️' });
        } else if (type === "cancer") {
            setCancerCellReadings([]);
            toast.success("Cancer cell readings cleared.", { icon: '🗑️' });
        }
    };

    /* ------------------------------------------------------------------ */
    /* RENDER UI                                                          */
    /* ------------------------------------------------------------------ */
    return (
        <div className="dashboard-container">
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="dashboard-header-bar">
                <h1>Test Dashboard: {patientName}</h1>

                <Button 
                    icon={<FaArrowLeft />} 
                    label="Back to Patients" 
                    severity="secondary" 
                    className="w-fit"
                    text 
                    onClick={handleGoBack}
                />
            </div>
            
            <div className="stats-grid mb-6">
                
                {/* Patient Context Card */}
                <div className="stat-card stat-blue">
                    <FaUser size={30} className="icon" />
                    <div className="details">
                        <p className="label">Current Patient</p>
                        <h2 className="value">{patientName}</h2>
                        <p className="sub-value">Admission No: {admissionNo}</p>
                    </div>
                </div>

                {/* Normal Readings Card */}
                <div className="stat-card stat-green">
                    {normalCellReadings.length > 0 ? <FaCheckCircle size={30} className="icon" /> : <FaMicroscope size={30} className="icon" />}
                    <div className="details">
                        <p className="label">Normal Cell Readings</p>
                        <h2 className="value">{normalCellReadings.length}</h2>
                        <p className="sub-value">
                            {normalCellReadings.length > 0 
                                ? `Avg Voltage: ${avgNormalVoltage.toFixed(4)} V` 
                                : 'Pending Acquisition'}
                        </p>
                    </div>
                    {normalCellReadings.length > 0 && (
                        <Button
                            icon="pi pi-times"
                            severity="warning"
                            text
                            className="p-button-sm clear-button"
                            tooltip="Clear Normal Readings"
                            onClick={() => handleClearReadings("normal")}
                            aria-label="Clear Normal Readings"
                            style={{ position: 'absolute', top: '10px', right: '10px' }}
                        />
                    )}
                </div>

                {/* Cancer Readings Card */}
                <div className="stat-card stat-red">
                    {cancerCellReadings.length > 0 ? <FaCheckCircle size={30} className="icon" /> : <FaMicroscope size={30} className="icon" />}
                    <div className="details">
                        <p className="label">Cancer Cell Readings</p>
                        <h2 className="value">{cancerCellReadings.length}</h2>
                        <p className="sub-value">
                            {cancerCellReadings.length > 0 
                                ? `Avg Voltage: ${avgCancerVoltage.toFixed(4)} V` 
                                : 'Pending Acquisition'}
                        </p>
                    </div>
                    {cancerCellReadings.length > 0 && (
                        <Button
                            icon="pi pi-times"
                            severity="warning"
                            text
                            className="p-button-sm clear-button"
                            tooltip="Clear Cancer Readings"
                            onClick={() => handleClearReadings("cancer")}
                            aria-label="Clear Cancer Readings"
                            style={{ position: 'absolute', top: '10px', right: '10px' }}
                        />
                    )}
                </div>
                
                {/* Save Button Card */}
                <div className="stat-card stat-purple">
                    <Button 
                        onClick={handleSave} 
                        label={isSaving ? "Saving..." : "Save All Test Data"}
                        icon="pi pi-save"
                        loading={isSaving}
                        severity="success"
                        className="p-button-lg w-full"
                        disabled={isSaving || (normalCellReadings.length === 0 && cancerCellReadings.length === 0)}
                    />
                    <p className="sub-value mt-2 text-center text-gray-400">
                        {normalCellReadings.length + cancerCellReadings.length} total readings acquired.
                    </p>
                </div>
            </div>

            {/* ----- LIVE CONSOLE & CHARTS (Side-by-Side) ----- */}
            <div className="main-content-grid">
                
                {/* 1. Live Console & Sample Selector */}
                <div className="panel console-panel">
                    <div className="panel-header">
                        <FaWrench size={20} />
                        <h2>Test Configuration & Console</h2>
                    </div>

                    <div className="sample-type-selector">
                        <label className={`sample-option ${sampleType === "normal" ? 'active-normal' : ''}`}>
                            <input 
                                type="radio" 
                                name="sampleType" 
                                value="normal" 
                                checked={sampleType === "normal"} 
                                onChange={() => setSampleType("normal")} 
                            />
                            Normal Cell Sample
                        </label>
                        <label className={`sample-option ${sampleType === "cancer" ? 'active-cancer' : ''}`}>
                            <input 
                                type="radio" 
                                name="sampleType" 
                                value="cancer" 
                                checked={sampleType === "cancer"} 
                                onChange={() => setSampleType("cancer")} 
                            />
                            Cancer Cell Sample
                        </label>
                    </div>

                    <div className="console-output" ref={consoleRef}>
                        {consoleLines.length === 0 && <div className="text-center text-gray-500 p-4">Awaiting device output...</div>}
                        {consoleLines.map((stamped, i) => {
                            const original = stamped.replace(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\]\s*/, "");
                            let className = "console-line";
                            if (original.includes("ON")) className += " on-line";
                            if (original.includes("OFF")) className += " off-line";
                            if (original.includes("cycles completed")) className += " done-line";
                            if (original.includes("ERROR")) className += " error-line";
                            return (
                                <div key={i} className={className}>
                                    {stamped}
                                </div>
                            );
                        })}
                    </div>
                    <div className="console-footer">
                        <Button 
                            label="Clear Console"
                            icon="pi pi-trash"
                            severity="danger"
                            text
                            onClick={() => setConsoleLines([])}
                        />
                    </div>
                </div>

                {/* 2. Live Chart */}
                <div className="panel chart-panel">
                    <div className="panel-header">
                        <FaChartLine size={20} />
                        <h2>Live Voltage Trend ({sampleType === 'normal' ? 'Normal' : 'Cancer'} Cycle)</h2>
                    </div>
                    
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={360}>
                            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="time" stroke="#ccc" />
                                <YAxis 
                                    domain={['auto', 'auto']} 
                                    label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', fill: '#ccc' }} 
                                    stroke="#ccc" 
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                                    formatter={(value: number) => [`${value.toFixed(4)} V`, 'Voltage']}
                                    labelFormatter={(label) => `Time: ${label}`}
                                />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={sampleType === 'normal' ? "#34d399" : "#f87171"} 
                                    strokeWidth={3} 
                                    name="Output Voltage"
                                    dot={false}
                                    isAnimationActive={false} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="chart-legend-note">
                        Displaying the last 30 data points from the **{sampleType}** cell test cycle.
                    </p>
                </div>
            </div>

            {/* ----- DEVICE LIST (Bottom) ----- */}
            <div className="devices-section">
                <div className="devices-header">
                    <h2>Connected Testing Devices ({connectedDevices.length})</h2>
                    <p className="device-instruction">Select the appropriate sample type above, then click **Acquire Data** on a connected device to begin the test cycle.</p>
                </div>
                
                {connectedDevices.length === 0 ? (
                    <div className="no-devices-message">
                        <FaTimesCircle size={30} className="text-red-500 mb-2" />
                        <p>No devices detected. Please plug one in and ensure the application is running.</p>
                    </div>
                ) : (
                    <div className="device-grid">
                        {connectedDevices.map((d: ArduinoDevice) => ( 
                        <div
                            key={d.port}
                            className={`device-card connected ${deviceReading(d) ? 'reading' : ''}`} // Status is always 'connected' here
                        >
                            <div className="device-header">
                                <h3 className="device-name">{d.custom_name || d.product || "Unknown Device"}</h3>
                                {/* Status badge will always be 'connected' here */}
                                <span className={`status-badge status-connected`}>{d.status}</span> 
                            </div>
                            <p className="device-info">
                                **Port:** {d.port}
                            </p>
                            
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startTestCycle(d.port);
                                }}
                               
                                disabled={d.status !== "connected" || readingPorts.has(d.port)} 
                                label={
                                    readingPorts.has(d.port) 
                                        ? "Reading Data..." 
                                        : `Acquire ${sampleType === 'normal' ? 'Normal' : 'Cancer'} Data`
                                }
                                icon={readingPorts.has(d.port) ? "pi pi-spin pi-spinner" : "pi pi-play"}
                                severity={sampleType === 'normal' ? "success" : "danger"}
                                className="p-button-sm w-full mt-3"
                            />
                        </div>
                    ))}
                    </div>
                )}
            </div>
        </div>
    );
}