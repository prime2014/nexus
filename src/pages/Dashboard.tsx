// src/components/Dashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Button } from "primereact/button";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import "./Dashboard.css";
import toast, { Toaster } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setDevices } from "../store/arduinoSlice";
import { ArduinoDevice } from "../store/arduinoSlice";


interface PatientForm {
    admission_no: string;
    national_id: string;
    firstname: string;
    lastname: string;
    contact_person: string;
    telephone_1: string;
    telephone_2: string;
    classification: "inpatient" | "outpatient";
    diabetes_test: number | null,
    doctor_in_charge: string;
    sample_type: "normal" | "cancer" | "";
}

const getNormalizedString = (s?: string | null): string => {
    if (!s) return '';
    return String(s).trim().replace(/\s+/g, ' ');
};

const getNormalizedValue = (s?: string | null): string | undefined => {
    const normalized = getNormalizedString(s);
    return normalized === '' ? undefined : normalized;
}

const cleanDeviceForRedux = (d: any): ArduinoDevice => ({
    port: getNormalizedValue(d.port) || 'N/A', 
    vid: d.vid,
    pid: d.pid,
    product: getNormalizedValue(d.product),
    serial_number: getNormalizedValue(d.serial_number),
    custom_name: getNormalizedValue(d.custom_name),
    board_name: getNormalizedValue(d.board_name),
    status: getNormalizedValue(d.status) === 'connected' ? 'connected' : 'disconnected', 
});

export default function Dashboard() {
  const { devices } = useSelector((state: RootState) => state.arduino);
  const [patientCount, setPatientCount] = useState<number | null>(null);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [sugarContent, setSugarContent] = useState<number | null>(null);
  const [readingPorts, setReadingPorts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const [normalCellReadings, setNormalCellReadings] = useState<number[]>([]);
  const [cancerCellReadings, setCancerCellReadings] = useState<number[]>([]);

  const consoleRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<PatientForm>({
    admission_no: "",
    national_id: "",
    firstname: "",
    lastname: "",
    contact_person: "",
    telephone_1: "",
    telephone_2: "",
    classification: "outpatient",
    diabetes_test: null,
    doctor_in_charge: "",
    sample_type: "normal"
  });
  const [isSaving, setIsSaving] = useState(false);
  const dispatch = useDispatch();

  /* ------------------------------------------------------------------ */
  /* 1. AUTO-SCROLL CONSOLE                                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLines]);

  const handleSampleTypeChange = (type: "normal" | "cancer") => {
    setFormData(prev => ({ ...prev, sample_type: type }));
  };

  useEffect(() => {
    const fetchPatientCount = async () => {
      try {
        // Invoke the new Rust command
        const count = await invoke<number>("get_patient_count");
        setPatientCount(count);
      } catch (err) {
        console.error("Failed to fetch patient count:", err);
        // Optionally show a toast error
      }
    };

    fetchPatientCount()
  },[])


  // useEffect(() => {
  //   const fetchPatientCount = async () => {
  //     try {
  //       // Invoke the new Rust command
  //       const count = await invoke<number>("get_patient_count");
  //       setPatientCount(count);
  //     } catch (err) {
  //       console.error("Failed to fetch patient count:", err);
  //       // Optionally show a toast error
  //     }
  //   };

  //   const fetchInitialDevices = async () => {
  //       if (devices && devices.length > 0) {
  //               console.log("Optimization: Devices already in Redux. Skipping DB fetch.");
  //               return; // Exit early if data is already present
  //       }
  //       try {
  //           // This call succeeded when run from Dashboard's mount cycle
  //           const rawDbDevices: any[] = await invoke('fetch_all_known_devices');
  //           console.log("RAW DB DEVICE: ")
  //           console.log(rawDbDevices)
  //           const dbDevices: ArduinoDevice[] = rawDbDevices.map(d => cleanDeviceForRedux(d));
  //           dispatch(setDevices(dbDevices)); // Update Redux state
  //           console.log("SUCCESS: Initial known devices loaded from Dashboard.");
  //       } catch (err) {
  //           // If it fails here, the error is critical, but it SHOULD NOT
  //           console.error("CRITICAL FAILURE: Initial DB device load failed in Dashboard:", err);
  //       }
  //   };
  //   fetchInitialDevices()
  //   fetchPatientCount();
  // }, [dispatch, devices]);

//   useEffect(() => {
//     const fetchPatientCount = async () => {
//       try {
//         // Invoke the new Rust command
//         const count = await invoke<number>("get_patient_count");
//         setPatientCount(count);
//       } catch (err) {
//         console.error("Failed to fetch patient count:", err);
//         // Optionally show a toast error
//       }
//     };

//     const fetchInitialDevicesAndScan = async () => {
//         let dbDevices: ArduinoDevice[] = [];
        
//         // 1. Fetch from DB (CRITICAL STEP for custom_name)
//         try {
//             const rawDbDevices: any[] = await invoke('fetch_all_known_devices');
//             dbDevices = rawDbDevices.map(d => cleanDeviceForRedux(d));
//             dispatch(setDevices(dbDevices)); // Load DB devices (with custom names) into Redux
//             console.log("STEP 1 SUCCESS: Initial known devices loaded from DB (with custom names).");
//         } catch (err) {
//             console.error("CRITICAL FAILURE: Initial DB device load failed in Dashboard:", err);
//             // We proceed to scan even if DB failed, but the custom names will be missing.
//         }
        
//         try {
//             await invoke('scan_arduino_now'); 
//             console.log("STEP 2 SUCCESS: Initial live scan triggered.");
//         } catch (error) {
//             console.error('Failed to trigger initial device scan:', error);
//         }
//     };

//     fetchPatientCount();
//     fetchInitialDevicesAndScan(); // Renamed function to reflect its new job
// }, [dispatch]);


  const handleViewPatients = () => {
    navigate("/patients"); // Navigate to the new patient list route
  };


  /* ------------------------------------------------------------------ */
  /* 2. LISTEN TO TAURI STATE EVENTS                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let unlistenStart: UnlistenFn | undefined;
    let unlistenStop: UnlistenFn | undefined;
    let unlistenDisconnect: UnlistenFn | undefined;
    let unlistenTimeout: UnlistenFn | undefined;

    (async () => {

      const unlistenTimeout = listen<{ port: string; message: string }>("arduino-timeout", (e) => {
        toast.error(`Timeout on ${e.payload.port}\n${e.payload.message}`, {
          duration: 6000,
        });
      });

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
      unlistenTimeout?.();
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

  const openPopup = () => setShowModal(true)
  

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

  const handleSave = async () => {

    setIsSaving(true);
    
    try {

      let cancer_test = {
        voltage_off : extractOffVoltages(consoleLines)
      }

      let normal_test = {
        voltage_off: normalCellReadings
      }

      
      let data = { ...formData, cancer_test }
      console.log(data)
      // Store via Tauri backend or API
      delete (data as any).sample_type;
      await invoke("save_patient_with_admission", { data });

      console.log(data)

      toast.success("Saved!");
      setConsoleLines([])
      setSugarContent(null)
      setFormData({
        admission_no: "",
        national_id: "",
        firstname: "",
        lastname: "",
        contact_person: "",
        telephone_1: "",
        telephone_2: "",
        classification: "outpatient",
        diabetes_test: null,
        doctor_in_charge: "",
        sample_type: "normal"
      })

      setShowModal(false);
    } catch (err: any) {
      
      toast.error(err.message || `Failed to save: ${err}`);
    }

    setIsSaving(false);
  };

  const extractOffVoltages = (lines: string[]) => {
    const regex = /Output Voltage \(OFF\):\s*([0-9]*\.[0-9]+)/;

    return lines
      .map(line => {
        const match = line.match(regex);
        return match ? Number.parseFloat(match[1]) : null;
      })
      .filter(v => v !== null);
  }

  /* ------------------------------------------------------------------ */
  /* 5. RENDER                                                         */
  /* ------------------------------------------------------------------ */
  return (
    <div className="dashboard">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* ----- HEADER STATS ----- */}
      <div className="stats-row">
        <div 
          className="ds-stat-card yellow clickable" // Added 'clickable' class for styling
          onClick={handleViewPatients} // Attach the navigation handler
        >
          <h2>Total Patients</h2>
          {/* Display the fetched count or a placeholder */}
          <p>{patientCount ?? '...'}</p> 
          <Link to="/patients" style={{ textDecoration: "none", color: "white" }}>
            View Patients <span className="pi pi-arrow-right"></span>
          </Link>
        </div>

        <div className="ds-stat-card green">
          <h2>Connected Devices</h2>
          <p>{devices.filter((d) => d.status === "connected").length}</p>
        </div>
        <div className="ds-stat-card purple">
          <h2>All Devices</h2>
          <p>{devices.length}</p>
        </div>
      </div>

      {/* ----- DEVICE LIST ----- */}
      <div className="devices-section">
        <h2>All Devices</h2>
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
                  <h3 className="device-name">{d.custom_name || d.product || "Unknown Device"}</h3>
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

                {d.status == "connected" ? <Button
                  onClick={d.status === "connected" ? () => navigate(`/device/${d.port}`) : undefined}
                  // FIX: Disable if reading is active OR if the device is disconnected 
                  label="View Device"
                  className="p-button-sm"
                /> : null}
              </div>
            ))}
          </div>
        
        )}
      </div>

      
    </div>
  );
}