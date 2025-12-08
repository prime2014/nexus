import React, { useEffect } from "react";
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { toast } from "react-hot-toast";
import { useDoctor } from "../context/DoctorContext";
import "./SaveDataModal.css"; // Keep your CSS for custom styles

// --- Type Definitions (Kept from original) ---
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
    sample_type: "normal" | "cancer" | ""
}

interface SaveDataModalProps {
    show: boolean;
    onClose: () => void;
    onSave: () => void;
    formData: PatientForm;
    setFormData: React.Dispatch<React.SetStateAction<PatientForm>>;
    isSaving: boolean;
    doctor_in_charge: string;
}

// --- Helper Component: Modern Input Field ---
interface ModernInputProps {
    name: keyof PatientForm;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    type?: 'text' | 'tel';
    helpText?: string;
}

const ModernInput: React.FC<ModernInputProps> = ({
    name,
    label,
    value,
    onChange,
    required = false,
    type = 'text',
    helpText,
}) => (
    <div className="p-field p-col-12 p-md-6 field-spacing">
        <label htmlFor={name} className="p-d-block">
            {label} {required && <span className="required-star">*</span>}
        </label>
        <InputText
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            type={type}
            className="p-inputtext-lg p-d-block p-mt-1" // Larger input and block display
            style={{ width: '100%' }}
        />
        {helpText && <small className="p-d-block p-error">{helpText}</small>}
    </div>
);

// --- Main Modal Component ---
export const SaveDataModal: React.FC<SaveDataModalProps> = ({
    show,
    onClose,
    onSave,
    formData,
    setFormData,
    isSaving,
    doctor_in_charge
}) => {
    const { doctorName, isLoading } = useDoctor();
    
    // Automatically set doctor_in_charge from context
    useEffect(() => {
        if (!isLoading && doctorName && doctorName !== "Loading...") {
            setFormData(prev => ({ ...prev, doctor_in_charge: doctorName }));
        }
    }, [doctorName, isLoading, setFormData]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleDropdownChange = (name: keyof PatientForm, value: any) => {
        setFormData((prev) => ({ ...prev, [name]: value as "inpatient" | "outpatient" }));
    };

    const isSaveDisabled =
        isSaving ||
        !formData.admission_no ||
        !formData.firstname ||
        !formData.lastname ||
        !formData.doctor_in_charge;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log(formData)
        
        if (!formData.admission_no || !formData.firstname || !formData.lastname || !formData.doctor_in_charge) {
            toast.error('Please fill in all fields marked with asterisk (*)');
            return;
        }
        
        onSave();
    };


    const classificationOptions = [
        { label: 'Inpatient', value: 'inpatient' },
        { label: 'Outpatient', value: 'outpatient' },
    ];

    // --- Modern Footer Design ---
    const footerContent = (
        <div className="modal-footer-modern">
            <Button 
                label="Cancel" 
                icon="pi pi-times" 
                onClick={onClose} 
                className="p-button-text p-button-secondary"
            />
            <Button
                label={isSaving ? "Saving..." : "Save Patient Data"}
                form="patient-data-form"
                icon="pi pi-save"
                type="submit" // Crucial for form submission
                disabled={isSaveDisabled || isSaving}
                loading={isSaving}
                className="p-button-success"
            />
        </div>
    );
    
    return (
        <Dialog 
            header="💾 Save New Patient Data" 
            visible={show} 
            modal 
            style={{ width: '50vw', minWidth: '300px' }} // Wider modal for better form layout
            onHide={onClose} 
            footer={footerContent}
            className="save-data-dialog" // Custom class for styling the Dialog wrapper
        >
            <form id="patient-data-form" onSubmit={handleSubmit} className="p-grid p-fluid modal-form-grid">
                
                {/* --- Section 1: Core Patient Details --- */}
                <h4 className="section-title-modern p-col-12">Patient Demographics</h4>
                
                <ModernInput
                    name="admission_no"
                    label="Admission No"
                    value={formData.admission_no}
                    onChange={handleChange}
                    required={true}
                    helpText="Must be unique for tracking purposes."
                />
                <ModernInput
                    name="national_id"
                    label="National ID (Optional)"
                    value={formData.national_id}
                    onChange={handleChange}
                />
                
                <ModernInput
                    name="firstname"
                    label="First Name"
                    value={formData.firstname}
                    onChange={handleChange}
                    required={true}
                />
                <ModernInput
                    name="lastname"
                    label="Last Name"
                    value={formData.lastname}
                    onChange={handleChange}
                    required={true}
                />

                {/* --- Section 2: Contact & Classification --- */}
                <h4 className="section-title-modern p-col-12">Contact & Classification</h4>
                
                <ModernInput
                    name="contact_person"
                    label="Emergency Contact Person"
                    value={formData.contact_person}
                    onChange={handleChange}
                />
                
                <div className="p-field p-col-12 p-md-6 field-spacing">
                    <label htmlFor="classification" className="p-d-block">Classification</label>
                    <Dropdown
                        name="classification"
                        value={formData.classification}
                        options={classificationOptions}
                        onChange={(e) => handleDropdownChange('classification', e.value)}
                        placeholder="Select Classification"
                        className="p-inputtext-lg p-d-block p-mt-1"
                        style={{ width: '100%' }}
                    />
                </div>
                
                <ModernInput
                    name="telephone_1"
                    label="Primary Phone"
                    value={formData.telephone_1}
                    onChange={handleChange}
                    type="tel"
                />
                <ModernInput
                    name="telephone_2"
                    label="Secondary Phone (Optional)"
                    value={formData.telephone_2}
                    onChange={handleChange}
                    type="tel"
                />

                {/* --- Section 3: Professional/Doctor --- */}
                <h4 className="section-title-modern p-col-12">Medical Responsibility</h4>
                
                <ModernInput
                    name="doctor_in_charge"
                    label={`Doctor In Charge`}
                    value={formData.doctor_in_charge}
                    onChange={handleChange as (e: React.ChangeEvent<HTMLInputElement>) => void} // Type assertion for ModernInput
                    required={true}
                    helpText={`Defaults to the current user (${doctorName}).`}
                />
            
            {/* The Dialog footer will render the save buttons outside the form body */}
            </form>
        </Dialog>
    );
}