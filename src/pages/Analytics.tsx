import { useState, useMemo, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./Analytics.css";
import {
    ComposedChart,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Line
    // ReferenceLine is no longer needed since we are using a separate chart
} from "recharts";
import { FaSearch, FaTimes, FaUserMd, FaVial } from 'react-icons/fa';
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Paginator } from "primereact/paginator";

// Constant to limit the number of data points displayed in the chart
const MAX_CHART_ENTRIES = 5; 

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
    const avgCancer = calculateAverageVoltage(admission?.cancer_tests);
    const avgReference = calculateAverageVoltage(admission?.reference);

    // Only return data if there is at least *one* valid average to plot
    if (avgCancer === null && avgReference === null) return null;

    // Create a unique name with admission_id and full timestamp
    const date = new Date(admission.timestamp);
    const uniqueName = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { 
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
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(5); 
    const [totalRecords, setTotalRecords] = useState(0);
    const [globalStats, setGlobalStats] = useState({ avg_cancer: 0, avg_reference: 0 });
    const [chartAdmissions, setChartAdmissions] = useState<AdmissionRecord[]>([]);
    const [visibleMetrics, setVisibleMetrics] = useState({
        avg_reference_voltage: true,
        avg_cancer_voltage: true,
        cumulativeAvg: true
    });
    const navigate = useNavigate();

    const handleGoBack = () => navigate(-1);

    const handleLegendClick = (e: any) => {
        const { dataKey } = e;
        setVisibleMetrics((prev) => ({
            ...prev,
            [dataKey]: !prev[dataKey as keyof typeof visibleMetrics]
        }));
    };

    const onPageChange = (event: any) => {
        setFirst(event.first);
        setRows(event.rows);
    };

    
    
    // 2. Modified handleSearch to fetch BOTH count and data
    async function handleSearch(searchQuery = query, currentFirst = first, currentRows = rows) {
        if (!searchQuery.trim()) return;
        setLoading(true);

        try {
            const [tableResults, count, globalStatsData, chartResults] = await Promise.all([
                // Data for the TABLE (Paginated)
                invoke<AdmissionRecord[]>("search_admissions_by_patient", { 
                    query: searchQuery, limit: currentRows, offset: currentFirst 
                }),
                // Total count for PAGINATOR
                invoke<number>("get_admissions_count", { query: searchQuery }),
                // Data for STAT CARDS (Global)
                invoke<any>("get_global_admission_stats", { query: searchQuery }),
                // Data for the CHART (Always latest 5)
                invoke<AdmissionRecord[]>("get_latest_5_admissions", { query: searchQuery })
            ]);

            setAdmissions(tableResults);
            setTotalRecords(count);
            setGlobalStats(globalStatsData);
            setChartAdmissions(chartResults); // This ensures the chart stays consistent
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    }

    // 3. Reset pagination when a NEW search is performed manually
    const triggerNewSearch = () => {
        setFirst(0); // Go back to page 1
        handleSearch(query, 0, rows);
    };

    // Re-fetch when page changes
    useEffect(() => {
        if (query.trim()) {
            handleSearch(query, first, rows);
        }
    }, [first, rows]);
    
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

    const calculateAverage = (readings: number[]): number => {
        if (readings.length === 0) return 0;
        const sum = readings.reduce((acc, val) => acc + val, 0);
        return sum / readings.length;
    };

    const getTrend = (current: number[], previousAvg: number = 0) => {
        const currentAvg = calculateAverage(current);
        if (current.length < 2) return null; // Need at least two points for a trend
        
        const diff = currentAvg - previousAvg;
        const isUp = diff > 0;
        
        return {
            icon: isUp ? "pi pi-arrow-up" : "pi pi-arrow-down",
            color: isUp ? "#34d399" : "#f87171",
            label: `${isUp ? '+' : ''}${diff.toFixed(4)}V`
        };
    };

    // Change the dependency from 'admissions' to 'chartAdmissions'
    const allAggregatedChartData: AggregateChartData[] = useMemo(() => {
        return chartAdmissions
            .map(getAdmissionAverage)
            .filter((data): data is AggregateChartData => data !== null);
    }, [chartAdmissions]);

    // You can now simplify this because the backend already limited it to 5
    const latestChartData: AggregateChartData[] = useMemo(() => {
        return allAggregatedChartData; 
    }, [allAggregatedChartData]);

    const patientName =
        admissions.length > 0
            ? `${admissions[0].firstname} ${admissions[0].lastname}`
            : "";

    // Calculate summary statistics for both reference and cancer tests
    const stats = useMemo(() => {
        const totalAdmissions = admissions.length;
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

    // 🌟 NEW MEMO: Data for the Overall Averages Bar Chart
    const overallChartData: AggregateChartData[] = useMemo(() => {
        if (stats.totalTests === 0) return [];

        return [{
            name: "Overall Averages",
            avg_cancer_voltage: parseFloat(globalStats.avg_cancer.toFixed(3)),
            avg_reference_voltage: parseFloat(globalStats.avg_reference.toFixed(3)),
        }];
    }, [stats]);


    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            
            return (
                <div style={{ fontSize: "14px" }} className="custom-tooltip">
                    <p className="label">{label.includes('Avg') ? label : `Admission: ${label}`}</p>
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

    const getTrendData = (currentVal: number, globalAvg: number) => {
        if (!currentVal || !globalAvg) return null;
        
        const diff = currentVal - globalAvg;
        // Fix: Wrap the toFixed result in Number()
        const percentChange = Number(((diff / globalAvg) * 100).toFixed(1)); 
        
        const isIncreasing = diff > 0;
        
        return {
            isIncreasing,
            percentChange: Math.abs(percentChange), // This will now work!
            icon: isIncreasing ? "pi pi-arrow-up" : "pi pi-arrow-down",
            color: isIncreasing ? "#f87171" : "#34d399" 
        };
    };

    const latestAdmission = admissions[0]; // Assuming index 0 is newest
    const latestAvg = getAdmissionAverage(latestAdmission);
   
    const chartDataWithCumulativeTrend = useMemo(() => {
    // 1. Keep the data in the order fetched (Newest -> Oldest)
    const newestToOldest = chartAdmissions
        .map(getAdmissionAverage)
        .filter((d): d is AggregateChartData => d !== null);

    let runningTotal = 0;
    
    return newestToOldest.map((item, index) => {
        runningTotal += item.avg_cancer_voltage;
        // Cumulative average from the newest point backwards
        const cumulativeAvg = runningTotal / (index + 1);

        return {
            ...item,
            cumulativeAvg: parseFloat(cumulativeAvg.toFixed(4))
        };
    });
}, [chartAdmissions]);



    const rollingStats = useMemo(() => {
        if (chartAdmissions.length === 0) return { cancer: 0, reference: 0 };

        // Process each of the 5 admissions through your existing helper
        const processed = chartAdmissions
            .map(getAdmissionAverage)
            .filter((d): d is AggregateChartData => d !== null);

        const sumCancer = processed.reduce((acc, curr) => acc + curr.avg_cancer_voltage, 0);
        const sumRef = processed.reduce((acc, curr) => acc + curr.avg_reference_voltage, 0);

        return {
            cancer: sumCancer / processed.length,
            reference: sumRef / processed.length
        };
    }, [chartAdmissions]);

    
   

    return (
        <div className="analytics-container">

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>📊 Patient Analytics Dashboard - {`${patientName}`}</h1>

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
                    {/* <button onClick={() => handleSearch(query)} disabled={loading || !query.trim()}>
                        <FaSearch /> {loading ? "Searching..." : "Search"}
                    </button> */}
                    <button onClick={triggerNewSearch} disabled={loading || !query.trim()}>
                        <FaSearch /> {loading ? "Searching..." : "Search"}
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
                    {/* Stats Panel (Unchanged) */}
                    <div className="stats-panel">
                        <div className="stat-card analytics-stat">
                            <span className="stat-icon"><FaTimes /></span>
                            <div className="stat-info">
                                <p className="stat-value">{totalRecords}</p>
                                <p className="stat-label">Total Admissions</p>
                            </div>
                        </div>
                       
                        <div className="stat-card analytics-stat">
                            <span className="stat-icon"><FaUserMd /></span>
                            <div className="stat-info">
                                <p className="stat-value">{stats.doctorCount}</p>
                                <p className="stat-label">Doctors Involved</p>
                            </div>
                        </div>
                        
                        <div className="stat-card stat-card-cancer analytics-stat">
                            <span className="stat-icon">C</span>
                            <div className="stat-info">
                                {/* Wrap everything in a flex container to align them horizontally */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <p className="stat-value" style={{ margin: 0 }}>
                                        {globalStats.avg_cancer.toFixed(4)}
                                        
                                    </p>
                                </div>
                                
                                <p className="stat-label">Global Avg Cancer V</p>
                            </div>
                        </div>

                        <div className="stat-card stat-card-reference analytics-stat"> 
                            <span className="stat-icon">R</span>
                            <div className="stat-info">
                                {/* Use globalStats instead of stats */}
                                <p className="stat-value">{globalStats.avg_reference.toFixed(4)}</p>
                                <p className="stat-label">Global Avg Reference V</p>
                            </div>
                        </div>
                    </div>
                    {/* --- End Stats Panel --- */}


                    {/* 🌟 MODIFIED: Chart Grid Container */}
                    <div className="chart-grid card" style={{ margin: "0 !important" }}> 
                        
                        {/* --- 1. Comparative Admissions Chart (Large) --- */}
                        <div className="chart-item comparative-chart">
                            <h2 style={{ lineHeight: "20px", display: "flex", justifyContent:"space-between", alignItems: "center" }}>
                                <span>Latest {MAX_CHART_ENTRIES} Admission Voltages</span>
                            </h2>
                            
                            {admissions.length > MAX_CHART_ENTRIES && (
                                <p className="chart-note">
                                    *Chart displays the **latest {MAX_CHART_ENTRIES} admissions** for better readability.
                                </p>
                            )}
                            
                            <div className="chart-container-lg">
                                <ResponsiveContainer width="100%" height={350}>
                                    <ComposedChart
                                        data={chartDataWithCumulativeTrend}
                                        margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                        <XAxis tickFormatter={(value, index) => {
                                                const total = chartDataWithCumulativeTrend.length;
                                                return `Test ${total - index}`;
                                            }} dataKey="name" angle={-45} textAnchor="end" height={50} interval={0}  
                                            stroke="#888"
                                            tick={{ fontSize: 12 }}    
                                        />
                                        <YAxis label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        
                                        {/* 🌟 Legend with Click Handler */}
                                        <Legend 
                                            verticalAlign="top" 
                                            align="center" 
                                            onClick={handleLegendClick} 
                                            wrapperStyle={{ cursor: 'pointer', paddingBottom: '20px' }}
                                        />

                                        {/* Reference Bars */}
                                        <Bar 
                                            dataKey="avg_reference_voltage" 
                                            hide={!visibleMetrics.avg_reference_voltage} // Logic to hide
                                            fill="#4bc0c0" 
                                            name="Ref Avg V" 
                                            barSize={20} 
                                            radius={[4, 4, 0, 0]} 
                                        />
                                        
                                        {/* Cancer Bars */}
                                        <Bar 
                                            dataKey="avg_cancer_voltage" 
                                            hide={!visibleMetrics.avg_cancer_voltage} // Logic to hide
                                            fill="#007bff" 
                                            name="Cancer Test Avg V" 
                                            barSize={20} 
                                            radius={[4, 4, 0, 0]} 
                                        />

                                       
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* --- /Comparative Admissions Chart --- */}

                        {/* --- 2. Overall Averages Chart (Small, Side-by-Side) --- */}
                        <div className="chart-item overall-chart">
                            <h4>Overall Patient Average</h4>
                            <p className="chart-note">
                                *Average based on all {totalRecords} valid tests recorded.
                            </p>
                            <div className="chart-container-sm">
                                <ResponsiveContainer width="100%" height={330}>
                                    <BarChart
                                        data={overallChartData}
                                        margin={{ top: 40, right: 10, left: 10, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        {/* Use a simple XAxis label since there's only one bar group */}
                                        <XAxis dataKey="name" textAnchor="middle" height={50} /> 
                                        <YAxis label={{ value: 'Average Voltage (V)', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend 
                                            verticalAlign="top"
                                            align="center"
                                            wrapperStyle={{ top: 0, paddingBottom: '10px' }} 
                                        />
                                        <Bar 
                                            barSize={40} 
                                            dataKey="avg_reference_voltage" 
                                            fill="#4bc0c0" 
                                            name="Reference (Overall Avg V)" 
                                            radius={[4, 4, 0, 0]} 
                                        />
                                        <Bar 
                                            barSize={40} 
                                            dataKey="avg_cancer_voltage" 
                                            fill="#007bff" 
                                            name="Cancer (Overall Avg V)" 
                                            radius={[4, 4, 0, 0]} 
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* --- /Overall Averages Chart --- */}

                    </div>
                    {/* --- /Chart Grid Container --- */}

                    {/* --- Individual Admission Details Table (Unchanged) --- */}
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

                        
                    {/* Update Paginator */}
                    <div className="pagination-container">
                        <Paginator 
                            first={first} 
                            rows={rows} 
                            totalRecords={totalRecords} 
                            rowsPerPageOptions={[5, 10, 20]} 
                            onPageChange={onPageChange}
                            template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} records"
                        />
                    </div>
                    </div>
                    {/* --- /Individual Admission Details Table --- */}
                </>
            )}
        </div>
    );
}



