import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from "primereact/button";
import { Dialog } from 'primereact/dialog'; 
import { InputText } from 'primereact/inputtext'; 
import { Dropdown } from 'primereact/dropdown';
import toast, { Toaster } from "react-hot-toast";
import "./PatientList.css";
import { Tooltip } from 'primereact/tooltip';
import { useNavigate } from "react-router-dom";
import { FaVial } from "react-icons/fa";
import { useSelector } from "react-redux"; 
import { RootState } from "../store";
import { ask } from "@tauri-apps/plugin-dialog";

// NOTE: PatientRecord should mirror the Rust PatientRecord struct
interface PatientRecord {
    id: number;
    admission_no: string;
    national_id: string | null;
    location: string | null;
    test_type: string,
    firstname: string;
    lastname: string;
    classification: string;
    doctor: string | null;
    contact_person: string | null,
    telephone_1: string | null,
    telephone_2: string | null
}

interface PatientForm {
    admission_no: string;
    national_id: string | null;
    firstname: string;
    lastname: string;
    location: string | null;
    test_type: string,
    contact_person: string | null;
    telephone_1: string | null;
    telephone_2: string | null;
    classification: "inpatient" | "outpatient";
    doctor_in_charge: string | null;
}

const initialFormState: PatientForm = {
    admission_no: "", national_id: null, firstname: "", lastname: "", 
    location: "", test_type: "",
    contact_person: null, telephone_1: null, telephone_2: null, 
    classification: "outpatient", doctor_in_charge: null
}

export default function PatientList() {
    const { default_doctor_name } = useSelector((state: RootState) => state.settings)
    const [patients, setPatients] = useState<PatientRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentPatient, setCurrentPatient] = useState<PatientForm | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    
    // 🆕 New state for tracking Create vs. Edit mode
    const [isNewPatient, setIsNewPatient] = useState(false); 
    
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    

    /**
     * Fetches patients, supporting both full list and search queries.
     */
    const fetchPatients = useCallback(async (query: string = '') => {
        setLoading(true);
        try {
            const trimmedQuery = query.trim();
            let records: PatientRecord[];

            if (trimmedQuery === '') {
                records = await invoke<PatientRecord[]>("get_all_patients");
            } else {
                records = await invoke<PatientRecord[]>("search_patients", { query: trimmedQuery });
            }
            setPatients(records);
        } catch (err) {
            console.error("Failed to fetch/search patients:", err);
            toast.error("Failed to load patient data.");
        } finally {
            setLoading(false);
        }
    }, []);

    // 🚀 EFFECT for Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPatients(globalFilterValue);
        }, 300);

        return () => clearTimeout(timer);
    }, [globalFilterValue, fetchPatients]);


    /* ------------------------------------------------------------------ */
    /* MODAL & CRUD HANDLERS                                            */
    /* ------------------------------------------------------------------ */

    const handleCreateNew = () => {
        setCurrentPatient(initialFormState);
        setIsNewPatient(true);
        setEditModalVisible(true);
    };


    const handleViewAnalytics = (admissionNo: string) => {
        // Programmatically navigate to the analytics page, passing the ID
        const encodedAdmissionNo = encodeURIComponent(admissionNo);
        navigate(`/analytics/${encodedAdmissionNo}`); 
    };

    const handleEdit = (patient: PatientRecord) => {
        // Map PatientRecord to PatientForm (ensuring all fields are handled)
        setCurrentPatient({
            admission_no: patient.admission_no, national_id: patient.national_id, 
            firstname: patient.firstname, lastname: patient.lastname, 
            contact_person: patient.contact_person, telephone_1: patient.telephone_1, 
            telephone_2: patient.telephone_2, 
            classification: patient.classification as "inpatient" | "outpatient",
            doctor_in_charge: patient.doctor, 
            location: patient.location, test_type: patient.test_type
        });
        setIsNewPatient(false);
        setEditModalVisible(true);
    };

    const handleSavePatient = async () => {
        if (!currentPatient) return;
        if (!currentPatient.doctor_in_charge) {
            currentPatient.doctor_in_charge = default_doctor_name;
        }
        console.log(currentPatient)
        setIsSaving(true);
       
        try {
            if (isNewPatient) {
                // Creation: Uses the command that handles the full patient creation
                await invoke("create_patient", { data: currentPatient }); 
                toast.success("New Patient created successfully!");
            } else {
                // Update: Uses the command specific for updating existing patient data
                await invoke("update_patient_data", { data: currentPatient }); 
                toast.success("Patient updated successfully!");
            }
            
            setEditModalVisible(false);
            fetchPatients(globalFilterValue); // Reload table data
        } catch (err: any) {
            toast.error(`${isNewPatient ? "Creation" : "Update"} failed: ${err.message || err}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (admissionNo: string) => {
        console.log("Our vested patient")
        console.log(patients)
        const confirmed = await ask(
            `Are you sure you want to delete patient ${patients[0].firstname} ${patients[0].lastname}? This action cannot be undone.`, 
            { title: 'Confirm Deletion', kind: 'warning' }
        );

        if (!confirmed) {
            return;
        }

        try {
            await invoke("delete_patient_by_admission_no", { admissionNo });
            toast.success(`Patient ${admissionNo} deleted.`);
            fetchPatients(globalFilterValue); // Reload data
        } catch (err: any) {
            toast.error(`Delete failed: ${err.message || err}`);
        }
    };

    const handleConductTest = (admissionNo: string) => {
        // Navigate to the test page, passing the patient's admission number
        console.log("THE NAVIGATE ADMISSION NO: ", admissionNo)
        let encodedAdmissionNo = encodeURIComponent(admissionNo)
        navigate(`/test/${encodedAdmissionNo}`); 
    };

    
    const actionBodyTemplate = (rowData: PatientRecord) => {
        return (
            <div className="flex gap-2 justify-center items-center">
                <Button 
                    icon={<FaVial />} // A great icon for a lab test
                    severity="success" // Distinctive color for a primary action
                    rounded
                    text 
                    className="action-button-circle test-button" 
                    onClick={() => handleConductTest(rowData.admission_no)} // Link to the new handler
                    aria-label="Conduct Test"
                    tooltip="Conduct New Test" 
                    tooltipOptions={{ position: 'top' }}
                />
                <Button 
                    icon="pi pi-chart-bar" // Using a relevant PrimeReact icon
                    severity="secondary" // Choose a distinctive color
                    rounded
                    text 
                    className="action-button-circle analytics-button" // New class for Tooltip
                    onClick={() => handleViewAnalytics(rowData.admission_no)}
                    aria-label="View Analytics"
                    tooltip="View Patient Analytics" 
                    tooltipOptions={{ position: 'top' }}
                />

                <Button 
                    icon="pi pi-pencil" 
                    severity="info"
                    rounded
                    text 
                    className="action-button-circle"
                    onClick={() => handleEdit(rowData)} 
                    aria-label="Edit"
                    tooltip="Edit Patient" 
                    tooltipOptions={{ position: 'top' }}
                />
                {/* Optional: Add a View Details button here if a detail page exists */}
                <Button 
                    icon="pi pi-trash" 
                    severity="danger" 
                    rounded 
                    text 
                    className="action-button-circle"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rowData.admission_no)
                    }} 
                    aria-label="Delete"
                    tooltip={`Delete Patient ${rowData.admission_no}`}
                    tooltipOptions={{ position: 'top' }}
                />
            </div>
        );
    };

    const renderHeader = () => {
        return (
            <div className="flex justify-content-between align-items-center">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText 
                        value={globalFilterValue} 
                        onChange={(e) => setGlobalFilterValue(e.target.value)} 
                        placeholder="Search by ID, Name, etc." 
                        className="p-inputtext-sm" 
                    />
                </span>
                
                <div className="flex align-items-center gap-3">
                    <span className="text-xl font-bold mr-4">Patient Records</span>
                    {/* 🟢 CREATE BUTTON */}
                    <Button 
                        label="Add New Patient"
                        icon="pi pi-user-plus"
                        severity="success"
                        onClick={handleCreateNew}
                        className="p-button-sm"
                    />
                </div>
            </div>
        );
    };
    
    const header = renderHeader();

    /* ------------------------------------------------------------------ */
    /* RENDER                                                            */
    /* ------------------------------------------------------------------ */

    return (
        <div className="patient-list-container">
            <Toaster />
            <Tooltip target=".action-button-circle" />
            
            <h1>Patient List</h1>
            
            {/* DataTable */}
            <DataTable 
                className="p-datatable-sm patient-list-compact" 
                value={patients} 
                paginator 
                rows={10} 
                loading={loading}
                header={header} 
                sortMode="multiple"
            >
                <Column field="admission_no" header="Admission No." sortable style={{ width: '15%' }} />
                <Column field="lastname" header="Last Name" sortable style={{ width: '25%' }} />
                <Column field="firstname" header="First Name" sortable style={{ width: '25%' }} />
                <Column field="test_type" header="Test Type" sortable style={{ width: '25%' }} />
                <Column field="location" header="Location" sortable style={{ width: '25%' }} />
                <Column field="classification" header="Classification" sortable style={{ width: '15%' }} />
                <Column 
                    body={actionBodyTemplate} 
                    header="Actions" 
                    style={{ width: '10%' }} 
                    exportable={false}
                /> 
            </DataTable>

            {/* Edit/Create Modal (Dialog) */}
            <Dialog 
                // Dynamic Header
                style={{ maxWidth: '600px' }}
                header={isNewPatient ? "Add New Patient" : `Edit Patient: ${currentPatient?.admission_no}`} 
                visible={editModalVisible} 
                modal
                className="p-fluid"
                onHide={() => setEditModalVisible(false)}
                footer={(
                    <div>
                        <Button label="Cancel" icon="pi pi-times" onClick={() => setEditModalVisible(false)} className="p-button-text cancel-style" />
                        <Button 
                            label={isNewPatient ? "Create Patient" : "Save Changes"} 
                            icon="pi pi-check" 
                            onClick={handleSavePatient}
                            loading={isSaving}
                            disabled={!currentPatient?.admission_no || !currentPatient?.firstname || !currentPatient?.lastname || !currentPatient?.national_id} // Basic validation
                        />
                    </div>
                )}
            >

                {currentPatient && (
                    <div className="grid p-fluid form-content-grid">
                        <div className="col-12 mb-2">
                            <p className="text-sm text-gray-500 italic">
                                Fields marked with an asterisk (<span className="text-red-500">*</span>) are required.
                            </p>
                        </div>
                        
                        {/* Admission No. (Editable only for creation) */}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="admission_no">Admission No. *</label>
                            <InputText 
                                id="admission_no" 
                                value={currentPatient.admission_no} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, admission_no: e.target.value }) : null)} 
                                disabled={!isNewPatient} 
                                required
                            />
                        </div>
                        
                        {/* National ID */}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="national_id">National ID *</label>
                            <InputText 
                                id="national_id" 
                                value={currentPatient.national_id ?? ''} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, national_id: e.target.value }) : null)} 
                                required
                            />
                        </div>

                        {/* First Name */}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="firstname">First Name *</label>
                            <InputText 
                                id="firstname" 
                                value={currentPatient.firstname} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, firstname: e.target.value }) : null)} 
                                required
                            />
                        </div>

                        {/* Last Name */}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="lastname">Last Name *</label>
                            <InputText 
                                id="lastname" 
                                value={currentPatient.lastname} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, lastname: e.target.value }) : null)} 
                                required
                            />
                        </div>

                        {/* Test type */}
                        <div className="field col-12">
                            <label htmlFor="test_type">Type of Test</label>
                            <InputText 
                                id="test_type" 
                                value={currentPatient.test_type ?? ''} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, test_type: e.target.value }) : null)} 
                            />
                        </div>

                        {/* Location */}
                        <div className="field col-12">
                            <label htmlFor="location">Residential Location</label>
                            <InputText 
                                id="location" 
                                value={currentPatient.location ?? ''} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, location: e.target.value }) : null)} 
                            />
                        </div>

                        {/* Classification */}
                        <div className="field col-12">
                            <label htmlFor="classification">Classification</label>
                            <Dropdown 
                                id="classification" 
                                value={currentPatient.classification} 
                                options={[{ label: 'Inpatient', value: 'inpatient' }, { label: 'Outpatient', value: 'outpatient' }]}
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, classification: e.value }) : null)} 
                            />
                        </div>
                        
                        {/* Doctor In Charge */}
                        <div className="field col-12">
                            <label htmlFor="doctor_in_charge">Doctor In Charge</label>
                            <InputText 
                                id="doctor_in_charge" 
                                value={currentPatient.doctor_in_charge ?? ''} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, doctor_in_charge: e.target.value }) : null)} 
                            />
                        </div>
                        
                        {/* Contact Person */}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="contact_person">Contact Person</label>
                            <InputText 
                                id="contact_person" 
                                value={currentPatient.contact_person ?? ''} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, contact_person: e.target.value }) : null)} 
                            />
                        </div>
                        
                        {/* Telephone 1 */}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="telephone_1">Telephone 1</label>
                            <InputText 
                                id="telephone_1" 
                                value={currentPatient.telephone_1 ?? ''} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, telephone_1: e.target.value }) : null)} 
                            />
                        </div>
                        
                        {/* Telephone 2 */}
                        <div className="field col-12">
                            <label htmlFor="telephone_2">Telephone 2 (Optional)</label>
                            <InputText 
                                id="telephone_2" 
                                value={currentPatient.telephone_2 ?? ''} 
                                onChange={(e) => setCurrentPatient(p => p ? ({ ...p, telephone_2: e.target.value }) : null)} 
                            />
                        </div>

                    </div>
                )}
            </Dialog>
        </div>
    );
}