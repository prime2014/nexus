// src/context/DoctorContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import toast from "react-hot-toast";

interface DoctorContextType {
  doctorName: string;
  isLoading: boolean;
}

const DoctorContext = createContext<DoctorContextType>({
  doctorName: "Loading...",
  isLoading: true,
});

export const DoctorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctorName, setDoctorName] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const username: string = await invoke("get_current_user");

        // Beautify: john.doe → John Doe
        const prettyName = username
          .split(/[._-]/) // handle john.doe, john_doe, john-doe
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join(" ");

        setDoctorName(prettyName || username);
        toast.success(`Welcome, Dr. ${prettyName}`, { icon: "Doctor", duration: 4000 });
      } catch (err) {
        console.warn("Failed to get doctor name:", err);
        setDoctorName("Unknown Doctor");
        toast.error("Could not detect logged-in user");
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctor();
  }, []);

  return (
    <DoctorContext.Provider value={{ doctorName, isLoading }}>
      {children}
    </DoctorContext.Provider>
  );
};

export const useDoctor = () => useContext(DoctorContext);