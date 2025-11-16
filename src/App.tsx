// App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SidebarMenu from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import { useArduinoWatcher } from "./hooks/useArduinoWatcher";
import { Provider } from "react-redux";
import { store } from "./store";

export default function App() {
  useArduinoWatcher() // Auto-scan + expose manual

  return (
    <Provider store={store}>
      <Router>
        <div style={{ display: "flex", height: "100vh", margin: 0, padding: 0 }}>
          <SidebarMenu />
          <div style={{ flex: 1, marginLeft: 220, padding: "2rem" }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </Router>
    </Provider>
  );
}