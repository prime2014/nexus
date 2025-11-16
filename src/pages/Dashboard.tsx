// import React, { useState, useEffect } from "react";
// import { useSelector } from "react-redux";
// import { RootState } from "../store";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
//   BarChart,
//   Bar,
//   AreaChart,
//   Area,
//   ResponsiveContainer,
// } from "recharts";
// import { Button } from "primereact/button";
// import { invoke} from "@tauri-apps/api/core";
// import { listen } from "@tauri-apps/api/event";
// import "./Dashboard.css";
// import toast, { Toaster } from 'react-hot-toast';

// const sampleLine = [
//   { time: "T1", value: 12 },
//   { time: "T2", value: 19 },
//   { time: "T3", value: 8 },
//   { time: "T4", value: 15 },
//   { time: "T5", value: 10 },
// ];

// const sampleBar = [
//   { label: "Sensor A", readings: 15 },
//   { label: "Sensor B", readings: 30 },
//   { label: "Sensor C", readings: 10 },
//   { label: "Sensor D", readings: 20 },
// ];

// const sampleArea = [
//   { time: "1s", temp: 22 },
//   { time: "2s", temp: 23 },
//   { time: "3s", temp: 24 },
//   { time: "4s", temp: 25 },
//   { time: "5s", temp: 24 },
//   { time: "6s", temp: 26 },
// ];

// interface Devices {
//   portName: string | null
// }

// export default function Dashboard() {
//   const { devices } = useSelector((state: RootState) => state.arduino);
//   const readingsCount = 245; // static count for now
//   const [activeReaders, setActiveReaders] = useState<Devices>({ portName: null });
//   const [consoleLines, setConsoleLines] = useState<string[]>([]);
//   const [readingPorts, setReadingPorts] = useState<Set<string>>(new Set());

//   const consoleRef = React.useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (consoleRef.current) {
//       consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
//     }
//   }, [consoleLines]);
  

//   // Assuming this function is inside your React component,
// // where activeReaders is state managed by useState:
// // const [activeReaders, setActiveReaders] = useState({});

//   useEffect(() => {
//   const unlistenStart = listen("arduino-reading-started", (event) => {
//     const { port } = event.payload as { port: string };
//     setReadingPorts(prev => new Set(prev).add(port));
//   });

//   const unlistenStop = listen("arduino-reading-stopped", (event) => {
//     const { port } = event.payload as { port: string };
//     setReadingPorts(prev => {
//       const next = new Set(prev);
//       next.delete(port);
//       return next;
//     });
//   });

//   const unlistenDisconnect = listen("arduino-disconnected", (event) => {
//     const { port } = event.payload as { port: string };
//     setReadingPorts(prev => {
//       const next = new Set(prev);
//       next.delete(port);
//       return next;
//     });
//   });

//   return () => {
//     unlistenStart.then(f => f());
//     unlistenStop.then(f => f());
//     unlistenDisconnect.then(f => f());
//   };
// }, []);


//   const getTimestamp = () => {
//     const now = new Date();
//     const hours = String(now.getHours()).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');
//     const seconds = String(now.getSeconds()).padStart(2, '0');
//     const ms = String(now.getMilliseconds()).padStart(3, '0');
//     return `${hours}:${minutes}:${seconds}.${ms}`;
//   };

//    useEffect(() => {
//       const unlisten = listen<{ port: string; data: string }>("arduino-data", (event) => {
//         const line = event.payload.data.trim();
//         if (!line) return;

//         const timestamp = getTimestamp();
//         const timestampedLine = `[${timestamp}] ${line}`;

//         // Match on the ORIGINAL line (without timestamp)
//         const isVoltage = line.match(/Output Voltage \((ON|OFF)\): ([\d.]+) V/);
//         const isComplete = line.includes("cycles completed");

//         if (isVoltage || isComplete) {
//           console.log(timestampedLine);
//           setConsoleLines(prev => [...prev.slice(-100), timestampedLine]); // This adds it!
//         }

//         if (isComplete) {
//           toast.success(line);
//         }
//       });

//       return () => {
//         unlisten.then(f => f());
//       };
//     }, []);

//   const handleData = async (portName: string) => {
//     const isReading = readingPorts.has(portName);

//     if (isReading) {
//       await invoke("stop_reading_from_port", { portName });
//     } else {
//       await invoke("start_reading_from_port", { portName, baudRate: 9600 });
//     }
//   };

  

//   return (
//     <div className="dashboard">
//       <Toaster />
//       {/* === HEADER STATS === */}
//       <div className="stats-row">
//         <div className="stat-card blue">
//           <h2>Total Readings</h2>
//           <p>{readingsCount}</p>
//         </div>
//         <div className="stat-card green">
//           <h2>Connected Devices</h2>
//           <p>{devices.filter((d) => d.status === "connected").length}</p>
//         </div>
//         <div className="stat-card purple">
//           <h2>All Devices</h2>
//           <p>{devices.length}</p>
//         </div>
//       </div>

//       {/* === DEVICE LIST === */}
//       <div className="devices-section">
//         <h2>Connected Devices</h2>
//         {devices.length === 0 ? (
//           <p className="no-devices">No devices detected. Plug one in!</p>
//         ) : (
//           <div className="device-grid">
//             {devices.map((d) => (
//               <div
//                 key={d.port}
//                 className={`device-card fade-in ${
//                   d.status === "connected" ? "connected" : "disconnected"
//                 }`}
//               >
//                   <div className="device-header">
//                   <h3 className="device-name">{d.product || "Unknown Device"}</h3>
//                   <span
//                     className={`status-badge ${
//                       d.status === "connected"
//                         ? "status-connected"
//                         : "status-disconnected"
//                     }`}
//                   >
//                     {d.status}
//                   </span>
//                 </div>
//                 <p className="device-info">
//                   <strong>Port:</strong> {d.port}
//                 </p>
//                 <p className="device-info">
//                   <strong>VID:</strong> 0x{d.vid.toString(16).toUpperCase()} |{" "}
//                   <strong>PID:</strong> 0x{d.pid.toString(16).toUpperCase()}
//                 </p>
//                 <Button
//                   onClick={() => handleData(d.port)}
//                   disabled={readingPorts.has(d.port)}
//                   label={readingPorts.has(d.port) ? "Reading..." : 'Acquire Data'}// Always enabled
//                 />
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <div className="console-panel">
//         <div className="console-header">
//           <h2>Live Console</h2>
//           <button
//             className="clear-btn"
//             onClick={() => setConsoleLines([])}
//           >
//             Clear
//           </button>
//         </div>

//         <div className="console-output" ref={consoleRef}>
//           {consoleLines.map((timestampedLine, i) => {
//             // Extract original line for matching
//             const originalLine = timestampedLine.replace(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\]\s*/, '');

//             let className = "console-line";

//             if (originalLine.includes("ON")) className += " on-line";
//             if (originalLine.includes("OFF")) className += " off-line";
//             if (originalLine.includes("cycles completed")) className += " done-line";

//             return <div key={i} className={className}>{timestampedLine}</div>;
//           })}
//         </div>
//       </div>

//       {/* === CHARTS GRID === */}
//       <div className="charts-section">
//         <h2>Data Overview</h2>
//         <div className="chart-grid">
//           {/* Line Chart */}
//           <div className="chart-card">
//             <h3>Sensor Trends</h3>
//             <ResponsiveContainer width="100%" height={250}>
//               <LineChart data={sampleLine}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="time" />
//                 <YAxis />
//                 <Tooltip />
//                 <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>

//           {/* Bar Chart */}
//           <div className="chart-card">
//             <h3>Readings per Device</h3>
//             <ResponsiveContainer width="100%" height={250}>
//               <BarChart data={sampleBar}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="label" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="readings" fill="#10b981" radius={[8, 8, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* Area Chart */}
//           <div className="chart-card">
//             <h3>Temperature Variation</h3>
//             <ResponsiveContainer width="100%" height={250}>
//               <AreaChart data={sampleArea}>
//                 <defs>
//                   <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
//                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="time" />
//                 <YAxis />
//                 <Tooltip />
//                 <Area
//                   type="monotone"
//                   dataKey="temp"
//                   stroke="#6366f1"
//                   fillOpacity={1}
//                   fill="url(#colorTemp)"
//                 />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
// src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { Button } from "primereact/button";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import "./Dashboard.css";
import toast, { Toaster } from "react-hot-toast";

const sampleLine = [
  { time: "T1", value: 12 },
  { time: "T2", value: 19 },
  { time: "T3", value: 8 },
  { time: "T4", value: 15 },
  { time: "T5", value: 10 },
];

const sampleBar = [
  { label: "Sensor A", readings: 15 },
  { label: "Sensor B", readings: 30 },
  { label: "Sensor C", readings: 10 },
  { label: "Sensor D", readings: 20 },
];

const sampleArea = [
  { time: "1s", temp: 22 },
  { time: "2s", temp: 23 },
  { time: "3s", temp: 24 },
  { time: "4s", temp: 25 },
  { time: "5s", temp: 24 },
  { time: "6s", temp: 26 },
];

export default function Dashboard() {
  const { devices } = useSelector((state: RootState) => state.arduino);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [readingPorts, setReadingPorts] = useState<Set<string>>(new Set());

  const consoleRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /* 1. AUTO-SCROLL CONSOLE                                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLines]);

  /* ------------------------------------------------------------------ */
  /* 2. LISTEN TO TAURI STATE EVENTS                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let unlistenStart: UnlistenFn | undefined;
    let unlistenStop: UnlistenFn | undefined;
    let unlistenDisconnect: UnlistenFn | undefined;

    (async () => {
      unlistenStart = await listen<{ port: string }>("arduino-reading-started", (e) => {
        setReadingPorts((prev) => new Set(prev).add(e.payload.port));
      });

      unlistenStop = await listen<{ port: string }>("arduino-reading-stopped", (e) => {
        setReadingPorts((prev) => {
          const next = new Set(prev);
          next.delete(e.payload.port);
          return next;
        });
      });

      unlistenDisconnect = await listen<{ port: string; error: string }>(
        "arduino-disconnected",
        (e) => {
          setReadingPorts((prev) => {
            const next = new Set(prev);
            next.delete(e.payload.port);
            return next;
          });
        }
      );
    })();

    return () => {
      unlistenStart?.();
      unlistenStop?.();
      unlistenDisconnect?.();
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* 3. LISTEN TO SERIAL DATA + CYCLE COMPLETE                         */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    console.log("running once")
    let unlistenData: UnlistenFn | undefined;
    let unlistenCycle: UnlistenFn | undefined;

    (async () => {
      // --- Serial data (console only) ---
      unlistenData = await listen<{ port: string; data: string }>("arduino-data", (e) => {
        const line = e.payload.data.trim();
        if (!line) return;

        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const ms = String(now.getMilliseconds()).padStart(3, "0");
        const stamped = `[${time}.${ms}] ${line}`;

        const isVoltage = line.match(/Output Voltage \((ON|OFF)\): ([\d.]+) V/);
        const isComplete = line.includes("cycles completed");

        if (isVoltage || isComplete) {
          setConsoleLines((prev) => [...prev.slice(-100), stamped]);
        }

        // DO NOT show toast here — handled by arduino-cycle-complete
      });

      // --- Cycle complete (toast + UI) ---
      unlistenCycle = await listen<{ port: string }>("arduino-cycle-complete", (e) => {
        toast.success(`Cycle complete on ${e.payload.port}`);
      });
    })();

    return () => {
      unlistenData?.();
      unlistenCycle?.();
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* 4. BUTTON HANDLER                                                 */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* 5. RENDER                                                         */
  /* ------------------------------------------------------------------ */
  return (
    <div className="dashboard">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* ----- HEADER STATS ----- */}
      <div className="stats-row">
        <div className="stat-card blue">
          <h2>Total Readings</h2>
          <p>245</p>
        </div>
        <div className="stat-card green">
          <h2>Connected Devices</h2>
          <p>{devices.filter((d) => d.status === "connected").length}</p>
        </div>
        <div className="stat-card purple">
          <h2>All Devices</h2>
          <p>{devices.length}</p>
        </div>
      </div>

      {/* ----- DEVICE LIST ----- */}
      <div className="devices-section">
        <h2>Connected Devices</h2>
        {devices.length === 0 ? (
          <p className="no-devices">No devices detected. Plug one in!</p>
        ) : (
          <div className="device-grid">
            {devices.map((d) => (
              <div
                key={d.port}
                className={`device-card fade-in ${
                  d.status === "connected" ? "connected" : "disconnected"
                }`}
              >
                <div className="device-header">
                  <h3 className="device-name">{d.product || "Unknown Device"}</h3>
                  <span
                    className={`status-badge ${
                      d.status === "connected" ? "status-connected" : "status-disconnected"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                <p className="device-info">
                  <strong>Port:</strong> {d.port}
                </p>
                <p className="device-info">
                  <strong>VID:</strong> 0x{d.vid.toString(16).toUpperCase()} |{" "}
                  <strong>PID:</strong> 0x{d.pid.toString(16).toUpperCase()}
                </p>

                <Button
                  onClick={() => handleData(d.port)}
                  disabled={readingPorts.has(d.port)}
                  label={readingPorts.has(d.port) ? "Reading..." : "Acquire Data"}
                  className="p-button-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----- LIVE CONSOLE ----- */}
      <div className="console-panel">
        <div className="console-header">
          <h2>Live Console</h2>
          <button className="clear-btn" onClick={() => setConsoleLines([])}>
            Clear
          </button>
        </div>

        <div className="console-output" ref={consoleRef}>
          {consoleLines.map((stamped, i) => {
            const original = stamped.replace(/^\[\d{2}:\d{2}:\d{2}\.\d{3}\]\s*/, "");
            let className = "console-line";
            if (original.includes("ON")) className += " on-line";
            if (original.includes("OFF")) className += " off-line";
            if (original.includes("cycles completed")) className += " done-line";
            return (
              <div key={i} className={className}>
                {stamped}
              </div>
            );
          })}
        </div>
      </div>

      {/* ----- CHARTS (sample data) ----- */}
      <div className="charts-section">
        <h2>Data Overview</h2>
        <div className="chart-grid">
          <div className="chart-card">
            <h3>Sensor Trends</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sampleLine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Readings per Device</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sampleBar}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="readings" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Temperature Variation</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={sampleArea}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="temp"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorTemp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}