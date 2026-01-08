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
import { ask } from "@tauri-apps/plugin-dialog";
import { FaDroplet } from 'react-icons/fa6';


const ROLE_CANCER = 'Cancer Screening Unit';
const ROLE_GLUCOSE = 'Glucose Monitoring Unit';


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

type SampleType = "normal" | "cancer" | "glucose";

export default function PatientTestDashboard() {
    
    // Hooks and State
    const { devices } = useSelector((state: RootState) => state.arduino);
    const { baud_rate_default } = useSelector((state: RootState) => state.settings)
    const { admissionNo: encodedAdmissionNo } = useParams<{ admissionNo: string }>();

    const admissionNo = encodedAdmissionNo ? decodeURIComponent(encodedAdmissionNo) : null;
    
    const navigate = useNavigate();

    const [patientData, setPatientData] = useState<PatientMetadata | null>(null);
    const [loadingPatient, setLoadingPatient] = useState(true);
    const [consoleLines, setConsoleLines] = useState<string[]>([]);
    const [glucoseReading, setGlucoseReading] = useState<number | null>(null);
    const [sampleType, setSampleType] = useState<SampleType>("normal");
    const consoleLinesRef = useRef<string[]>([]);
    const [readingPorts, setReadingPorts] = useState<Set<string>>(new Set());
    const consoleRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    
   

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
        const activeDevice = devices.find(d => d.port === portName);

        if (isHardwareMismatch(activeDevice, sampleType)) {
            toast.error(`Wrong Hardware! Please use the ${sampleType === 'glucose' ? 'Glucose' : 'Cancer'} unit.`);
            return;
        }

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
            await invoke("start_reading_from_port", { portName, baudRate: baud_rate_default });
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


    const getTestTypeFromDevice = (device: ArduinoDevice): SampleType => {
        const name = (device.custom_name || device.product || "").toLowerCase();
        if (name.includes("glucose") || name.includes("diabetes")) return "glucose";
        return "normal"; 
    };

    const isHardwareMismatch = (activeDevice: ArduinoDevice | undefined, currentMode: SampleType) => {
        if (!activeDevice) return false;
        const role = activeDevice.custom_name;
        
        if (currentMode === "glucose" && role !== ROLE_GLUCOSE) return true;
        if ((currentMode === "normal" || currentMode === "cancer") && role !== ROLE_CANCER) return true;
        
        return false;
    };
 
    useEffect(() => {
        let unlistenData: UnlistenFn | undefined;
        let unlistenCycle: UnlistenFn | undefined;
        let unlistenStop: UnlistenFn | undefined; // Add listener for cycle stop/timeout
        let unlistenTimeout: UnlistenFn | undefined;

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

            // 1. Log to console for debugging
            const now = new Date();
            const timestamp = now.toTimeString().slice(0, 8);
            const stamped = `[${timestamp}.${String(now.getMilliseconds()).padStart(3, "0")}] ${line}`;
            
            setConsoleLines((prev) => [...prev.slice(-100), stamped]);
            consoleLinesRef.current = [...consoleLinesRef.current.slice(-100), stamped];

            // 2. Extract any number (e.g., 0.0000 or 1.1046)
            const voltageMatch = line.match(/(\d+\.\d+)/);
            
            if (voltageMatch) {
                const voltage = parseFloat(voltageMatch[1]);
                const newReading = { time: timestamp, value: voltage };

                // Update chart: keep last 50 points for a smooth scroll
                chartDataRef.current = [...chartDataRef.current.slice(-49), newReading];
                setChartData(chartDataRef.current);
            }
        });
    
            // --- Cycle complete (Store readings + toast) ---
            unlistenCycle = await listen<{ port: string }>("arduino-cycle-complete", (e) => {
                toast.success(`Test Cycle complete on ${e.payload.port}. Data ready to save.`);
                const device = devices.find(d => d.port === e.payload.port);
                const role = device?.custom_name;
                
                // Remove port from readingPorts state
                setReadingPorts(prev => {
                    const next = new Set(prev);
                    next.delete(e.payload.port);
                    return next;
                });
                
                if (role === ROLE_CANCER) {
                    // Extract and store the final 'OFF' voltages from the latest console run
                    const newOffVoltages = extractOffVoltages(consoleLinesRef.current);
                    
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
                } else if(role === ROLE_GLUCOSE) {
                    // to be implemented
                }
            });
            
            // --- Cycle Stop/Timeout Listener (Cleanup) ---
            unlistenStop = await listen<{ port: string; reason: string }>("arduino-reading-stopped", (e) => {
                setReadingPorts(prev => {
                    const next = new Set(prev);
                    next.delete(e.payload.port);
                    return next;
                });
            });

            unlistenTimeout = await listen<{ port: string; message: string }>("arduino-timeout", (e) => {
                const port = e.payload.port;
                setReadingPorts(prev => {
                    const next = new Set(prev);
                    next.delete(port);
                    return next;
                });
                toast.error(e.payload.message);
            });

        })();

        return () => {
            unlistenData?.();
            unlistenCycle?.();
            unlistenStop?.();
            unlistenTimeout?.();
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
           
            const admissionDataToSave = {
                admission_no: patientData.admission_no,
                doctor_in_charge: patientData.doctor,
                technician: '', // You can pull this from auth state
                diabetes_test: glucoseReading, // This goes to the INTEGER column
                reference: JSON.stringify({ voltage_off: normalCellReadings }),
                cancer_tests: JSON.stringify({ voltage_off: cancerCellReadings }),
            };

            await invoke("save_admission", { data: admissionDataToSave });

            toast.success(`Admission record and test data saved for patient ${patientData.admission_no}!`);
            
            // Cleanup states after successful save
            setConsoleLines([]);
            setNormalCellReadings([]);
            setCancerCellReadings([]);
            setChartData([]);
            const encodedAdmissionNo = encodeURIComponent(patientData.admission_no);
            navigate(`/analytics/${encodedAdmissionNo}`);

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

    const handleGoBack = async () => {
        const hasUnsavedData = normalCellReadings.length > 0 || cancerCellReadings.length > 0;

        if (hasUnsavedData) {
            // Native browser confirmation dialog
            const confirmed = await ask(
                `Unsaved data detected for ${patientName}.\n\n` + 
                "Are you sure you want to leave? Your current readings will be lost.",
                { title: 'Exit Page', kind: 'warning' }
            );

            if (!confirmed) {
                return; // User clicked 'Cancel', stay on page
            }
        }
        navigate('/patients');
    }
    
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

    const handleClearReadings = (type: "normal" | "cancer" | "glucose") => {
        if (type === "normal") {
            setNormalCellReadings([]);
            toast.success("Normal cell readings cleared.", { icon: '🗑️' });
        } else if (type === "cancer") {
            setCancerCellReadings([]);
            toast.success("Cancer cell readings cleared.", { icon: '🗑️' });
        }
    };


    // Inside PatientTestDashboard.tsx return statement:

return (
    <div className="dashboard-viewport">
        <Toaster position="top-right" />
        
        <header className="compact-header">
            <div className="patient-info">
                <h1>{patientName}</h1>
                <span className="admission-tag">PATIENT ID: {patientData.admission_no}</span>
            </div>
            <div className="header-actions">
                <Button 
                    icon="pi pi-arrow-left" 
                    label="Back to Patients" 
                    className="p-button-text p-button-secondary p-button-sm patients-btn"
                    onClick={handleGoBack} 
                />
            </div>
        </header>

        <main className="main-layout">
            {/* LEFT SIDEBAR: Device List + Sticky Save Button */}
            <aside className="device-sidebar">
            <div className="sidebar-content-wrapper">
                <div className="sidebar-header">
                <h3>Connected Devices</h3>
                <span className="device-count">{connectedDevices.length} Active</span>
                </div>

                <div className="sidebar-scroll">
                {connectedDevices.length > 0 ? (
                    <>
                    {/* 1. Map through the actual devices */}
                    {connectedDevices.map((d: ArduinoDevice) => {
                        const isReading = readingPorts.has(d.port);
                        return (
                        <div key={d.port} className={`device-card-modern ${isReading ? 'is-active' : ''}`}>
                            <div className="device-info-main">
                            <strong className="device-name-text">{d.custom_name || d.product}</strong>
                            <code className="port-label">{d.port}</code>
                            </div>

                            <Button
                            label={isReading ? "Reading..." : "Acquire Data"}
                            icon={isReading ? "pi pi-spin pi-spinner" : "pi pi-play"}
                            disabled={isReading}
                            className="p-button-sm acquire-btn"
                            severity={isReading ? "secondary" : "info"}
                            onClick={() => startTestCycle(d.port)}
                            />
                        </div>
                        );
                    })}

                    {/* 2. Save Button now falls naturally below the list */}
                    <div className="sidebar-action-container" style={{ marginTop: '1.5rem' }}>
                        <Button 
                        label={isSaving ? "Saving..." : "Save Data & Display"}
                        icon="pi pi-cloud-upload" 
                        severity="success"
                        className="w-full save-report-btn"
                        onClick={handleSave}
                        disabled={isSaving || (normalCellReadings.length === 0 && cancerCellReadings.length === 0)}
                        />
                    </div>
                    </>
                ) : (
                    /* 3. Default description when no devices are connected */
                    <div className="no-devices-placeholder">
                    <i className="pi pi-exclamation-circle" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#666' }}></i>
                    <p>No hardware detected.</p>
                    <small>Please connect the Screening Unit via USB to begin testing.</small>
                    </div>
                )}
                </div>
            </div>
            </aside>

            {/* MAIN CONTENT: Mode Selection + Streaming Console */}
            <section className="content-area">
                {/* TOP STAT PANELS (Existing) */}
                
                <div className="stats-overview-grid">
                    {/* Normal Reference Panel */}
                    <div className={`stat-panel normal ${normalCellReadings.length > 0 ? 'populated' : ''}`}>
                        <div className="stat-icon stat-normal-icon">
                            <FaMicroscope />
                        </div>
                        <div className="stat-content">
                            <label>Normal Reference Avg</label>
                            <div className="stat-value">
                                {avgNormalVoltage.toFixed(4)}<span className="unit">V</span>
                            </div>
                            <div className="stat-footer">
                                <span>{normalCellReadings.length} Samples</span>
                                {normalCellReadings.length > 0 && (
                                    <button className="mini-clear-btn" onClick={() => handleClearReadings("normal")}>Reset</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cancer Screening Panel */}
                    <div className={`stat-panel cancer ${cancerCellReadings.length > 0 ? 'populated' : ''}`}>
                        <div className="stat-icon stat-cancer-icon">
                            <FaMicroscope />
                        </div>
                        <div className="stat-content">
                            <label>Cancer Screening Avg</label>
                            <div className="stat-value">
                                {avgCancerVoltage.toFixed(4)}<span className="unit">V</span>
                            </div>
                            <div className="stat-footer">
                                <span>{cancerCellReadings.length} Samples</span>
                                {cancerCellReadings.length > 0 && (
                                    <button className="mini-clear-btn" onClick={() => handleClearReadings("cancer")}>Reset</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Glucose Monitoring Panel */}
                    <div className={`stat-panel glucose ${glucoseReading !== null ? 'populated' : ''}`}>
                        <div className="stat-icon  stat-glucose-icon">
                            <FaDroplet />
                        </div>
                        <div className="stat-content">
                            <label>Glucose Level</label>
                            <div className="stat-value">
                                {glucoseReading !== null ? glucoseReading.toFixed(2) : "0.00"}
                                <span className="unit"> mg/dL</span>
                            </div>
                            <div className="stat-footer">
                                <span>{glucoseReading !== null ? '1 Test' : 'No Data'}</span>
                                {glucoseReading !== null && (
                                    <button 
                                        className="mini-clear-btn" 
                                        onClick={() => handleClearReadings("glucose")}
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN INTERACTIVE AREA: Split 50/50 */}
                <div className="analysis-dashboard-row">
                    
                    {/* LEFT HALF: COMMAND & CONSOLE */}
                    <div className="control-console-panel">
                        <h2 className="mode-section-title">Choose Testing Mode</h2>
                        <div className="mode-toggle-container">
                            <label className={`mode-pill normal ${sampleType === 'normal' ? 'active' : ''}`}>
                                <input type="radio" onChange={() => setSampleType('normal')} checked={sampleType === 'normal'} />
                                <i className="pi pi-shield"></i>
                                <span>Normal Cell Mode</span>
                            </label>
                            
                            <label className={`mode-pill cancer ${sampleType === 'cancer' ? 'active' : ''}`}>
                                <input type="radio" onChange={() => setSampleType('cancer')} checked={sampleType === 'cancer'} />
                                <i className="pi pi-search-plus"></i>
                                <span>Cancer Cell Mode</span>
                            </label>
                        </div>

                        <div className="terminal-container">
                            <div className="terminal-header">
                                <div className="dots"><span className="r"></span><span className="y"></span><span className="g"></span></div>
                                <span className="terminal-title">RAW_DATA_STREAM_{sampleType.toUpperCase()}</span>
                            </div>
                            <div className="terminal-body" ref={consoleRef}>
                                {consoleLines.map((line, i) => (
                                    <div key={i} className="terminal-line">
                                        <span className="line-prefix">{'>'}</span> {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT HALF: LIVE SINE WAVE TREND */}
                    <div className="visualizer-panel">
                        <div className="panel-header">
                            <h3>Live Cancer Cycle</h3>
                            <span className="live-indicator">LIVE FEED</span>
                        </div>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis 
                                        domain={['auto', 'auto']} 
                                        stroke="#888" 
                                        fontSize={12} 
                                        tickFormatter={(v) => `${v}V`} 
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', color: '#fff' }}
                                        itemStyle={{ color: sampleType === 'normal' ? '#10b981' : '#ef4444' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke={sampleType === 'normal' ? '#10b981' : '#ef4444'} 
                                        strokeWidth={3} 
                                        dot={false}
                                        animationDuration={300}
                                        isAnimationActive={false} // Faster for streaming data
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </div>
);

}