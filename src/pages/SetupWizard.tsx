// src/components/SetupWizard.tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./SetupWizard.css"; // ← SEPARATE CSS

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [devices, setDevices] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [logDir, setLogDir] = useState<string | null>(null);

  // Step 2: Scan for connected Arduino devices
  useEffect(() => {
    if (step === 2) {
      const unlisten = listen("arduino-scan-complete", (event) => {
        setDevices(event.payload as any[]);
      });

      invoke("scan_arduino_now").catch(console.error);

      return () => {
        unlisten.then((f) => f()).catch(console.error);
      };
    }
  }, [step]);

  const handleSaveDevices = async () => {
    for (const dev of devices) {
      await invoke("register_device_name", {
        vid: dev.vid,
        pid: dev.pid,
        serial_number: dev.serial_number,
        custom_name: names[dev.port] || dev.product || dev.port,
      });
    }
    setStep(3);
  };

  const handleSelectDir = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      setLogDir(selected);
      await invoke("save_log_directory", { path: selected });
    }
  };

  const finishSetup = async () => {
    await invoke("set_setup_complete");
    await getCurrentWindow().close();
    const mainWindow = (window as any).__TAURI__.window.getByLabel("main");
    if (mainWindow) mainWindow.show();
  };

  return (
    <div className="wizard-container">
      <h1 className="title">Nexus Medical - Initial Setup</h1>

      {step === 1 && (
        <div className="step">
          <p className="info">
            Welcome to <strong>Nexus Medical</strong> Setup Wizard.
          </p>
          <p className="info">
            Please connect your Arduino devices (e.g., Weight Scale, ECG).
          </p>
          <button className="btn primary" onClick={() => setStep(2)}>
            Start
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="step">
          <h2 className="subtitle">Step 2: Name Connected Devices</h2>
          {devices.length === 0 ? (
            <p className="info">No devices detected yet...</p>
          ) : (
            devices.map((dev) => (
              <div key={dev.port} className="device-item">
                <label className="label">
                  {dev.product || dev.port} (VID:{dev.vid}, PID:{dev.pid})
                </label>
                <input
                  type="text"
                  placeholder="Enter custom name (e.g., Weight Scale)"
                  className="input"
                  onChange={(e) =>
                    setNames({ ...names, [dev.port]: e.target.value })
                  }
                />
              </div>
            ))
          )}
          <button
            className="btn success"
            onClick={handleSaveDevices}
            disabled={devices.length === 0}
          >
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="step">
          <h2 className="subtitle">Step 3: Select Log Directory</h2>
          <p className="info">
            Choose a folder to store logs, or use the default location.
          </p>
          <button className="btn secondary" onClick={handleSelectDir}>
            {logDir ? `Selected: ${logDir}` : "Choose Folder"}
          </button>
          <br />
          <button className="btn primary" onClick={finishSetup}>
            Finish Setup
          </button>
        </div>
      )}
    </div>
  );
}