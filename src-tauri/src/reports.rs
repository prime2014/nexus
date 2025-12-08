// In your models.rs or main.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AdmissionRecord {
    pub admission_id: i64,
    pub admission_no: String,
    pub doctor_in_charge: String,
    pub technician: Option<String>,
    pub diabetes_test: Option<f64>, // Assuming number can be nullable/float
    pub cancer_tests: String, // JSON string
    pub timestamp: String,
    pub firstname: String,
    pub lastname: String,
    // Add any other fields you fetch in the search_admissions_by_patient
    // pub national_id: String,
    // pub classification: String,
    // pub patient_doctor: String, 
}


// In src/main.rs (or wherever your Tauri commands are)
// Make sure to import tauri::command and AdmissionRecord

#[tauri::command]
pub async fn generate_report(
    admissions: Vec<AdmissionRecord>,
    // You might also need the Tauri Window handle to show a dialog
    window: tauri::Window
) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;
    use tauri::api::dialog::blocking::FileDialogBuilder;

    if admissions.is_empty() {
        return Err("No admission records provided for report generation.".to_string());
    }

    // 1. Generate the Report Content (Simplified Markdown/Text for example)
    let patient_name = format!("{} {}", admissions[0].firstname, admissions[0].lastname);
    let mut content = format!("--- Cancer Analytics Report for {} ---\n\n", patient_name);
    
    for (i, admission) in admissions.iter().enumerate() {
        let avg_voltage = {
            // Re-calculate the average voltage for the report content if needed, 
            // or just display the raw JSON for the backend to handle proper parsing.
            // For a real PDF, you'd use a parser here.
            
            // Placeholder: Just indicate data presence
            if admission.cancer_tests.len() > 10 {
                "Data Present (Requires calculation in backend)".to_string()
            } else {
                "N/A".to_string()
            }
        };

        content.push_str(&format!(
            "Admission #{}: {}\n", i + 1, admission.admission_no
        ));
        content.push_str(&format!("  Date: {}\n", admission.timestamp));
        content.push_str(&format!("  Doctor: {}\n", admission.doctor_in_charge));
        content.push_str(&format!("  Avg Voltage: {}\n", avg_voltage));
        content.push_str("--------------------------\n");
    }

    // 2. Open Save Dialog (non-blocking)
    let default_file_name = format!("{}-analytics-report.pdf", patient_name.replace(" ", "_"));

    // Use a blocking file dialog for simplicity with an async command
    let save_path = match FileDialogBuilder::new()
        .set_file_name(&default_file_name)
        .add_filter("PDF Document", &["pdf"])
        .save_file()
    {
        Some(path) => path,
        None => return Err("Report generation cancelled by user.".to_string()),
    };
    
    // 3. Write Content to File (This is where the actual PDF writing logic would go)
    // *** NOTE: This is currently writing a .txt file for demonstration. 
    //           Replace this section with your chosen PDF library's logic.
    match File::create(&save_path) {
        Ok(mut file) => {
            // In a real app, you'd call printpdf::PdfDocument::save_to_file here.
            file.write_all(content.as_bytes())
                .map_err(|e| format!("Failed to write file: {}", e))?;
            
            // Since we saved, we'll return the path.
            Ok(format!("Report successfully saved to: {}", save_path.display()))
        }
        Err(e) => {
            Err(format!("Failed to create file: {}", e))
        }
    }
}