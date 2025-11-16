// src/components/Settings.tsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { invoke } from "@tauri-apps/api/core";
import type { RootState } from "../store";
import "./Settings.css";


interface ArduinoDevice {
  port: string;
  vid: number;
  pid: number;
  serial_number?: string | null;
  product?: string | null;
  custom_name?: string | null;
  status: "connected" | "disconnected";
}

// export default function Settings() {
//   const devices = useSelector((state: RootState) => state.arduino.devices);
//   const [editingKey, setEditingKey] = useState<string | null>(null);
//   const [tempName, setTempName] = useState("");

//   const startEditing = (device: ArduinoDevice) => {
//     const key = `${device.port}-${device.vid}-${device.pid}`;
//     setEditingKey(key);
//     setTempName(device.custom_name || "");
//   };

//   const saveName = async (device: ArduinoDevice) => {
//     const name = tempName.trim();
//     if (!name) return;

//     try {
//       await invoke("register_arduino", {
//         vid: device.vid,
//         pid: device.pid,
//         serial: device.serial_number ?? null,
//         custom_name: name,
//       });
//       // Optional: trigger rescan to update UI
//       await invoke("scan_and_match_arduinos");
//     } catch (err) {
//       console.error("Failed to save name:", err);
//     } finally {
//       setEditingKey(null);
//       setTempName("");
//     }
//   };

//   const cancelEditing = () => {
//     setEditingKey(null);
//     setTempName("");
//   };

//   return (
//     <div className="p-6 max-w-3xl mx-auto">
//       <h1 className="text-2xl font-bold mb-6 text-gray-800">Arduino Settings</h1>

//       {devices.length === 0 ? (
//         <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
//           <p>No Arduino devices detected.</p>
//           <p className="text-sm mt-2">Connect an Arduino and it will appear here.</p>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {devices.map((device) => {
//             const editKey = `${device.port}-${device.vid}-${device.pid}`;
//             const isEditing = editingKey === editKey;

//             return (
//               <div
//                 key={editKey}
//                 className={`border rounded-lg p-4 bg-white shadow-sm transition-all ${
//                   device.status === "connected" ? "ring-2 ring-green-200" : "opacity-75"
//                 }`}
//               >
//                 <div className="flex items-center justify-between">
//                   {/* Left: Info */}
//                   <div className="flex-1">
//                     <div className="flex items-center gap-3">
//                       <div className="font-semibold text-lg">
//                         {device.custom_name ? (
//                           <span className="text-green-700">{device.custom_name}</span>
//                         ) : (
//                           <span className="text-gray-400 italic">Unnamed Arduino</span>
//                         )}
//                       </div>
//                       <span
//                         className={`px-2 py-0.5 text-xs rounded-full font-medium ${
//                           device.status === "connected"
//                             ? "bg-green-100 text-green-800"
//                             : "bg-red-100 text-red-800"
//                         }`}
//                       >
//                         {device.status}
//                       </span>
//                     </div>

//                     <div className="text-sm text-gray-600 mt-1">
//                       <span className="font-mono">{device.port}</span>
//                       {" • "}
//                       VID: <code>0x{device.vid.toString(16).padStart(4, "0")}</code>
//                       {" • "}
//                       PID: <code>0x{device.pid.toString(16).padStart(4, "0")}</code>
//                       {device.product && ` • ${device.product}`}
//                     </div>
//                   </div>

//                   {/* Right: Action */}
//                   <div className="ml-4">
//                     {isEditing ? (
//                       <div className="flex items-center gap-2">
//                         <input
//                           type="text"
//                           value={tempName}
//                           onChange={(e) => setTempName(e.target.value)}
//                           onKeyDown={(e) => e.key === "Enter" && saveName(device)}
//                           placeholder="Custom name"
//                           className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                           autoFocus
//                         />
//                         <button
//                           onClick={() => saveName(device)}
//                           className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
//                         >
//                           Save
//                         </button>
//                         <button
//                           onClick={cancelEditing}
//                           className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400 transition"
//                         >
//                           Cancel
//                         </button>
//                       </div>
//                     ) : (
//                       <button
//                         onClick={() => startEditing(device)}
//                         className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition"
//                       >
//                         {device.custom_name ? "Rename" : "Name Device"}
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }


export default function Settings() {
  const devices = useSelector((state: RootState) => state.arduino.devices);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");

  const startEditing = (device: ArduinoDevice) => {
    const key = `${device.port}-${device.vid}-${device.pid}`;
    setEditingKey(key);
    setTempName(device.custom_name || "");
  };

  const saveName = async (device: ArduinoDevice) => {
    const name = tempName.trim();
    if (!name) return;

    try {
      await invoke("register_arduino", {
        vid: device.vid,
        pid: device.pid,
        serial: device.serial_number ?? null,
        custom_name: name,
      });
      // Optional: trigger rescan to update UI
      await invoke("scan_and_match_arduinos");
    } catch (err) {
      console.error("Failed to save name:", err);
    } finally {
      setEditingKey(null);
      setTempName("");
    }
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setTempName("");
  };

  return (
    <div className="settings-container">
      <h1 className="settings-title">Arduino Settings</h1>

      {devices.length === 0 ? (
        <div className="device-empty">
          <p>No Arduino devices detected.</p>
          <p>Connect an Arduino and it will appear here.</p>
        </div>
      ) : (
        <div className="device-list">
          {devices.map((device) => {
            const editKey = `${device.port}-${device.vid}-${device.pid}`;
            const isEditing = editingKey === editKey;

            return (
              <div
                key={editKey}
                className={`device-card ${device.status}`}
              >
                <div className="device-info">
                  <div className="device-name">
                    {device.custom_name ? (
                      <span>{device.custom_name}</span>
                    ) : (
                      <span className="unnamed">Unnamed Arduino</span>
                    )}
                    <span
                      className={`status-badge ${device.status}`}
                    >
                      {device.status}
                    </span>
                  </div>
                  <div className="device-meta">
                    {device.port} • VID: 0x{device.vid.toString(16)} • PID: 0x
                    {device.pid.toString(16)}{" "}
                    {device.product && `• ${device.product}`}
                  </div>
                </div>

                <div className="device-actions">
                  {isEditing ? (
                    <>
                      <input
                        className="device-input"
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        placeholder="Custom name"
                      />
                      <button className="save-btn" onClick={() => saveName(device)}>
                        Save
                      </button>
                      <button className="cancel-btn" onClick={cancelEditing}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="edit-btn"
                      onClick={() => startEditing(device)}
                    >
                      {device.custom_name ? "Rename" : "Name Device"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
