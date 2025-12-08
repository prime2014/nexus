// // App.tsx
// import React from "react";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import SidebarMenu from "./components/Sidebar";
// import Dashboard from "./pages/Dashboard";
// import ArduinoMapper from "./pages/arduino_customization";
// import Logs from "./pages/Logs";
// import Settings from "./pages/Settings";
// import { useArduinoWatcher } from "./hooks/useArduinoWatcher";
// import { Provider } from "react-redux";
// import { store } from "./store";

// export default function App() {
//   useArduinoWatcher() // Auto-scan + expose manual

//   return (
//     <Provider store={store}>
//       <Router>
//         <div style={{ display: "flex", height: "100vh", margin: 0, padding: 0 }}>
//           <SidebarMenu />
//           <div style={{ flex: 1, marginLeft: 220, padding: "2rem" }}>
//             <Routes>
//               <Route path="/" element={<Dashboard />} />
//               <Route path="/logs" element={<Logs />} />
//               <Route path="/settings" element={<Settings />} />
//               <Route path="/customization" element={<ArduinoMapper />} />
//             </Routes>
//           </div>
//         </div>
//       </Router>
//     </Provider>
//   );
// }

// App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SidebarMenu from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ArduinoMapper from "./pages/arduino_customization";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import { useArduinoWatcher } from "./hooks/useArduinoWatcher";
import { Provider } from "react-redux";
import { store } from "./store";
import Analytics from "./pages/Analytics";
import { DoctorProvider } from "./context/DoctorContext";  // ← A
import DeviceDetail from "./pages/DeviceDetail";
import PatientList from "./pages/PatientList";
import PatientTestDashboard from "./pages/PatientTestDashboard";

export default function App() {
  useArduinoWatcher();

  return (
    <Provider store={store}>
      <DoctorProvider>  {/* ← WRAP EVERYTHING */}
        <Router>
          <div style={{ display: "flex", height: "100vh", margin: 0, padding: 0 }}>
            <SidebarMenu />
            <div style={{ flex: 1, marginLeft: 220, padding: "2rem" }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/customization" element={<ArduinoMapper />} />
                <Route path="/analytics/:patientId" element={<Analytics />} />
                <Route path="/device/:portName" element={<DeviceDetail />} />
                <Route path="/test/:admissionNo" element={<PatientTestDashboard />} />
                <Route path="/patients" element={<PatientList />} />
              </Routes>
            </div>
          </div>
        </Router>
      </DoctorProvider>
    </Provider>
  );
}