// src/components/LogsTable.tsx
import React, { useEffect, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { invoke } from "@tauri-apps/api/core";

export default function LogsTable() {
  const [logs, setLogs] = useState<[string, string][]>([]); // ← tuple array

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const result = await invoke<[string, string][]>("get_logs");
        setLogs(result);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);


  const header = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="text-xl text-900 font-bold">Event Logs</span>
        </div>
  );
  const footer = `In total there are ${logs ? logs.length : 0} logs.`;

  return (
    <div className="p-4">
      <DataTable header={header} footer={footer} style={{ fontSize: "14px" }} size="normal" stripedRows paginator rows={5} rowsPerPageOptions={[5, 10, 25, 50]} value={logs} responsiveLayout="scroll">
        <Column
          header="Message"
          body={(rowData: [string, string]) => rowData[0]}
        />
        <Column
          header="Timestamp"
          body={(rowData: [string, string]) => rowData[1]}
        />
      </DataTable>
    </div>
  );
}