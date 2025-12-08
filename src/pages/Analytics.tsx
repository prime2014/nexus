import React, { useState, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Analytics.css";
import {
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { FaArrowLeft, FaSearch, FaTimes, FaUserMd, FaVial } from 'react-icons/fa';
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";

// Constant to limit the number of data points displayed in the chart
const MAX_CHART_ENTRIES = 10; 

// The AdmissionRecord interface from Rust is now reflected here
interface AdmissionRecord {
    admission_id: number;
    admission_no: string;
    doctor_in_charge: string;
    technician?: string;
    diabetes_test?: number;
    reference: string;      // Contains JSON for normal cell readings
    cancer_tests: string;   // Contains JSON for cancer cell readings
    timestamp: string;
    firstname: string;
    lastname: string;
    // ... (other patient fields not needed for this component's logic)
}

// Aggregate data structure now holds two average voltages
interface AggregateChartData {
    name: string;
    avg_cancer_voltage: number;   // Average voltage from cancer_tests (blue bar)
    avg_reference_voltage: number; // Average voltage from reference (new bar)
}

// NEW HELPER: Function to calculate the average voltage from a JSON string
function calculateAverageVoltage(jsonString: string): number | null {
    try {
        const parsed = JSON.parse(jsonString);
        // Assuming the JSON structure is consistent: { "voltage_off": [v1, v2, ...] }
        const voltages = parsed?.voltage_off; 

        if (!Array.isArray(voltages) || voltages.length === 0) return null;

        const avg = voltages.reduce((sum: number, val: number) => sum + val, 0) / voltages.length;
        
        return parseFloat(avg.toFixed(4));
    } catch {
        return null;
    }
}


// MODIFIED: Function to get both averages for an admission
function getAdmissionAverage(
    admission: AdmissionRecord
): AggregateChartData | null {
    const avgCancer = calculateAverageVoltage(admission.cancer_tests);
    const avgReference = calculateAverageVoltage(admission.reference);

    // Only return data if there is at least *one* valid average to plot
    if (avgCancer === null && avgReference === null) return null;

    // Create a unique name with admission_id and full timestamp
    const date = new Date(admission.timestamp);
    const uniqueName = `#${admission.admission_no} - ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    })}`;

    return {
        name: uniqueName,
        // Default to 0 if data is missing, to allow plotting the other bar
        avg_cancer_voltage: avgCancer ?? 0, 
        avg_reference_voltage: avgReference ?? 0,
    };
}


// --- START OF ANALYTICS COMPONENT ---

export default function Analytics() {
    
    const { patientId } = useParams<{ patientId: string }>();
    const [query, setQuery] = useState(patientId || "");
    const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const navigate = useNavigate();

    const handleGoBack = () => navigate(-1);

    async function handleSearch(searchQuery = query) {
        if (!searchQuery.trim()) return;
        setLoading(true);
        if(isInitialLoad) setQuery(searchQuery); 

        try {
            const results = await invoke<AdmissionRecord[]>(
                "search_admissions_by_patient",
                { query: searchQuery }
            );
            setAdmissions(results);
        } catch (err) {
            console.error("Search failed:", err);
            setAdmissions([]);
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    }
    
    // Function to clear search results and query
    const handleClear = () => {
        setQuery("");
        setAdmissions([]);
        setIsInitialLoad(true);
    };

    useEffect(() => {
        // Trigger search if patientId is present on mount
        if (patientId && isInitialLoad) {
            handleSearch(patientId);
        } else if (isInitialLoad && !patientId) {
             // Handle base /analytics case (i.e., when accessed via sidebar)
             setIsInitialLoad(false); 
        }
    }, [patientId]);

    // Memoize the aggregated chart data calculation (full list)
    const allAggregatedChartData: AggregateChartData[] = useMemo(() => {
        return admissions
            .map(getAdmissionAverage)
            .filter((data): data is AggregateChartData => data !== null);
    }, [admissions]);

    /**
     * 🌟 NEW: This memoized variable slices the data to only show the MAX_CHART_ENTRIES.
     * Since the admissions array is already ordered by timestamp DESC (latest first) 
     * from the Rust backend, we take the first N entries.
     */
    const latestChartData: AggregateChartData[] = useMemo(() => {
        // NOTE: The full admissions list is sorted DESC (latest first).
        // The slicing happens *after* aggregation, to ensure only valid data points are counted.
        return allAggregatedChartData.slice(0, MAX_CHART_ENTRIES);
    }, [allAggregatedChartData]);

    const patientName =
        admissions.length > 0
            ? `${admissions[0].firstname} ${admissions[0].lastname}`
            : "";

    // MODIFIED: Calculate summary statistics for both reference and cancer tests
    const stats = useMemo(() => {
        const totalAdmissions = admissions.length;
        // Use the full count of valid test records for totalTests
        const totalTests = allAggregatedChartData.length; 
        
        const avgCancerVoltage = totalTests > 0 
            ? allAggregatedChartData.reduce((sum, d) => sum + d.avg_cancer_voltage, 0) / totalTests
            : 0;

        const avgReferenceVoltage = totalTests > 0 
            ? allAggregatedChartData.reduce((sum, d) => sum + d.avg_reference_voltage, 0) / totalTests
            : 0;
        
        const doctors = new Set(admissions.map(a => a.doctor_in_charge).filter(Boolean));
        
        return {
            totalAdmissions: totalAdmissions,
            totalTests: totalTests,
            avgCancerVoltage: avgCancerVoltage.toFixed(4), 
            avgReferenceVoltage: avgReferenceVoltage.toFixed(4), 
            doctorCount: doctors.size
        };
    }, [admissions, allAggregatedChartData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // DEBUG: Log what we're getting
        console.log('Tooltip payload:', payload);
        console.log('Label:', label);
        
        return (
            <div style={{ fontSize: "14px" }} className="custom-tooltip">
                <p className="label">Admission: {label}</p>
                {/* Iterate through all payload items */}
                {payload.map((entry: any, index: number) => (
                    <p 
                        key={index} 
                        className="intro" 
                        style={{ color: entry.color }}
                    >
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value} V
                    </p>
                ))}
                {/* Keep your existing styles */}
                <style>{`
                    .custom-tooltip {
                        background-color: #333;
                        border: none;
                        color: #fff;
                        padding: 10px;
                        border-radius: 4px;
                        max-width: 250px;
                    }
                    .custom-tooltip .label {
                        margin-bottom: 8px;
                        font-size: 0.9em;
                        font-weight: 600;
                        border-bottom: 1px solid #555;
                        padding-bottom: 5px;
                    }
                    .custom-tooltip .intro {
                        margin: 3px 0;
                        font-size: 0.9em;
                        display: flex;
                        align-items: center;
                    }
                    .custom-tooltip .intro::before {
                        content: '';
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        background-color: ${payload[0]?.color || '#fff'};
                        margin-right: 5px;
                        border-radius: 2px;
                    }
                `}</style>
            </div>
        );
    }

    return null;
};

    return (
        <div className="analytics-container">

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>📊 Patient Analytics Dashboard</h1>

                <Button
                    icon="pi pi-reply"
                    label="Back"
                    tooltip="Back to Patient List" 
                    tooltipOptions={{ position: 'left' }}
                    onClick={handleGoBack} 
                    className="w-fit" 
                    raised
                    text
                />
            </div>

            
            <div className="search-group">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search patient by name, admission # or ID..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSearch(query);
                        }}
                    />
                    <button onClick={() => handleSearch(query)} disabled={loading || !query.trim()}>
                        <FaSearch /> {loading ? "Searching..." : "Search"}
                    </button>
                    <button 
                        className="clear-btn"
                        onClick={handleClear} 
                        disabled={loading && isInitialLoad}>
                        <FaTimes /> Clear
                    </button>
                </div>
            </div>


            {/* Conditional Display Area */}
            {isInitialLoad && loading ? (
                <p className="loading-initial">Loading default patient data...</p>
            ) : admissions.length === 0 && query.trim() ? (
                <p className="no-results">No admissions found for "{query}"</p>
            ) : admissions.length === 0 && !query.trim() ? (
                <p className="initial-message">Enter a patient name or ID above to view analytics.</p>
            ) : (
                <>
                    <p className="patient-header-title">
                        Analytics for: <strong>{patientName}</strong>
                    </p>

                    {/* MODIFIED: Stats Panel */}
                    <div className="stats-panel">
                        <div className="stat-card">
                            <span className="stat-icon"><FaTimes /></span>
                            <div className="stat-info">
                                <p className="stat-value">{stats.totalAdmissions}</p>
                                <p className="stat-label">Total Admissions</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon"><FaVial /></span>
                            <div className="stat-info">
                                <p className="stat-value">{stats.totalTests}</p>
                                <p className="stat-label">Tests Recorded</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icon"><FaUserMd /></span>
                            <div className="stat-info">
                                <p className="stat-value">{stats.doctorCount}</p>
                                <p className="stat-label">Doctors Involved</p>
                            </div>
                        </div>
                        <div className="stat-card stat-card-cancer">
                            <span className="stat-icon">C</span>
                            <div className="stat-info">
                                <p className="stat-value">{stats.avgCancerVoltage}</p>
                                <p className="stat-label">Overall Avg Cancer V</p>
                            </div>
                        </div>
                        <div className="stat-card stat-card-reference"> 
                            <span className="stat-icon">R</span>
                            <div className="stat-info">
                                <p className="stat-value">{stats.avgReferenceVoltage}</p>
                                <p className="stat-label">Overall Avg Reference V</p>
                            </div>
                        </div>
                    </div>
                    {/* --- End Stats Panel --- */}


                    {/* --- Aggregate Chart Display --- */}
                    <div className="chart-section card">
                        <h2>Comparative Average Voltage Readings (Latest {MAX_CHART_ENTRIES} Admissions)</h2>
                        {admissions.length > MAX_CHART_ENTRIES && (
                            <p className="chart-note">
                                *Chart displays the **latest {MAX_CHART_ENTRIES} admissions** for better readability. All {admissions.length} admissions are included in the summary statistics and table below.
                            </p>
                        )}
                        <div className="chart-container-lg">
                            <ResponsiveContainer width="100%" height={450}>
                                <BarChart
                                    // 🌟 MODIFIED: Use the limited latestChartData
                                    data={latestChartData}
                                    margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={130} interval={0} />
                                    <YAxis label={{ value: 'Average Voltage (V)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend 
                                        verticalAlign="top"
                                        align="right"
                                        wrapperStyle={{ top: 0, right: 0, paddingBottom: '10px' }} 
                                    />
                                    <Bar 
                                        barSize={30} 
                                        dataKey="avg_reference_voltage" 
                                        fill="#4bc0c0" 
                                        name="Reference (Normal Cell) Avg V" 
                                        radius={[4, 4, 0, 0]} 
                                    />
                                    <Bar 
                                        barSize={30} 
                                        dataKey="avg_cancer_voltage" 
                                        fill="#007bff" 
                                        name="Cancer Test Avg V" 
                                        radius={[4, 4, 0, 0]} 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* --- /Aggregate Chart Display --- */}


                    {/* --- Individual Admission Details Table --- */}
                    <div className="admissions-table-section card">
                        <h3>Detailed Admission Records</h3>
                        <div className="table-wrapper">
                             <table className="admissions-table">
                                 <thead>
                                 <tr>
                                     <th>Admission No.</th>
                                     <th>Date / Time</th>
                                     <th>Doctor in Charge</th>
                                     <th>Technician</th>
                                     <th>Diabetes Test</th>
                                     <th>Avg. Cancer Test Voltage</th>
                                     <th>Avg. Reference Voltage</th> 
                                 </tr>
                                 </thead>
                                 <tbody>
                                 {admissions.map((admission) => {
                                     const avgData = getAdmissionAverage(admission);

                                     return (
                                     <tr key={admission.admission_id}>
                                         <td>{admission.admission_no}</td>
                                         <td>{new Date(admission.timestamp).toLocaleString()}</td>
                                         <td>{admission.doctor_in_charge}</td>
                                         <td>{admission.technician || "N/A"}</td>
                                         <td>
                                         {admission.diabetes_test !== undefined &&
                                             admission.diabetes_test !== null
                                             ? admission.diabetes_test
                                             : "N/A"}
                                         </td>
                                         <td>
                                         {avgData && avgData.avg_cancer_voltage > 0 ? (
                                             <strong>{avgData.avg_cancer_voltage} V</strong>
                                         ) : (
                                             <span className="no-data">N/A</span>
                                         )}
                                         </td>
                                         <td> 
                                         {avgData && avgData.avg_reference_voltage > 0 ? (
                                             <strong>{avgData.avg_reference_voltage} V</strong>
                                         ) : (
                                             <span className="no-data">N/A</span>
                                         )}
                                         </td>
                                     </tr>
                                     );
                                 })}
                                 </tbody>
                             </table>
                        </div>
                        
                        <button
                            className="generate-report-btn"
                            onClick={() => invoke("generate_report", { admissions })}
                            disabled={admissions.length === 0}
                        >
                            Generate PDF Report
                        </button>
                    </div>
                    {/* --- /Individual Admission Details Table --- */}
                </>
            )}
        </div>
    );
}