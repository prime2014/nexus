// import React, { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import toast from "react-hot-toast";
// import { invoke } from "@tauri-apps/api/core";
// import { Window } from "@tauri-apps/api/window";

// import { useDispatch } from 'react-redux';
// import { setSettings as setMySettings } from '../store/settingsSlice';

// const themeOptions = [
//     { label: 'System Default', value: 'system', emoji: '💻' },
//     { label: 'Light Mode', value: 'light', emoji: '☀️' },
//     { label: 'Dark Mode', value: 'dark', emoji: '🌙' }
// ];

// const logOptions = [
//     { label: 'Error (Minimal)', value: 'error' },
//     { label: 'Info (Standard)', value: 'info' },
//     { label: 'Debug (Verbose)', value: 'debug' }
// ];

interface MyAppSettings {
    theme: string;
    baud_rate_default: number;
    auto_connect_enabled: boolean;
    default_doctor_name: string;
    log_level: string;
    log_file_location: string;
    sqlite_file_path: string;
}

interface DefaultPaths {
    log_directory: string,
    database_directory: string,
}

// export default function SetupWizard() {
//     const dispatch = useDispatch();
//     const [currentStep, setCurrentStep] = useState(0);
//     const [settings, setSettings] = useState({
//         theme: 'system',
//         baudRateDefault: 9600,
//         autoConnectEnabled: true,
//         defaultDoctorName: '',
//         logLevel: 'info',
//         logDirectory: '',
//         databaseDirectory: ''
//     });
//     const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

//     const steps = [
//         { id: 0, title: "Welcome", icon: "❤️" },
//         { id: 1, title: "Appearance", icon: "🎨" },
//         { id: 2, title: "Doctor Info", icon: "👨‍⚕️" },
//         { id: 3, title: "Storage", icon: "💾" },
//         { id: 4, title: "Hardware", icon: "📡" },
//         { id: 5, title: "Complete", icon: "✓" }
//     ];

//     useEffect(() => {
//         const loadDefaultPaths = async () => {
//             try {
//                 const paths = await invoke<{ log_directory: string; database_directory: string }>("get_default_paths");
//                 setSettings(prev => ({
//                     ...prev,
//                     logDirectory: paths.log_directory,
//                     databaseDirectory: paths.database_directory,
//                 }));
//             } catch (err) {
//                 console.error("Failed to load default paths:", err);
//                 // Fallback placeholders
//                 setSettings(prev => ({
//                     ...prev,
//                     logDirectory: 'Default (AppData/Logs)',
//                     databaseDirectory: 'Default (AppData/app.db)',
//                 }));
//             }
//         };

//         loadDefaultPaths();
//     }, []);

//     useEffect(() => {
//         if (toast.show) {
//             const timer = setTimeout(() => {
//                 setToast({ show: false, message: '', type: 'success' });
//             }, 3000);
//             return () => clearTimeout(timer);
//         }
//     }, [toast.show]);

//     const showToast = (message, type = 'success') => {
//         setToast({ show: true, message, type });
//     };

//     const handleChange = (key, value) => {
//         setSettings(prev => ({ ...prev, [key]: value }));
//     };

//     const handleNext = () => {
//         if (currentStep < steps.length - 1) {
//             setCurrentStep(currentStep + 1);
//         }
//     };

//     const handleBack = () => {
//         if (currentStep > 0) {
//             setCurrentStep(currentStep - 1);
//         }
//     };

//     const handleFinish = async () => {
//         const app_settings: MyAppSettings = {
//             theme: settings.theme,
//             baud_rate_default: settings.baudRateDefault,
//             auto_connect_enabled: settings.autoConnectEnabled,
//             default_doctor_name: settings.defaultDoctorName,
//             log_level: settings.logLevel,
//             log_file_location: settings.logDirectory || null,
//             sqlite_file_path: settings.databaseDirectory || null,
//         };
//         dispatch(setMySettings(app_settings));

//         try {
//             await invoke("save_setup_settings", { settings: app_settings });
            
//             const { Window, getCurrentWindow } = await import("@tauri-apps/api/window");

//             const { emit } = await import('@tauri-apps/api/event');
//             const setupWizard = getCurrentWindow();
//             const mainWindow = await Window.getByLabel("main");

//             await emit('setup-finished', { settings: app_settings });

//             if (mainWindow) {
//                 await mainWindow.show();
//                 await setupWizard.close();
//                 await mainWindow.setFocus()
                
//             }

//             showToast("Welcome! Application ready.", "success");
//         } catch (err) {
//             console.error("Setup failed:", err);
//             showToast("Failed to complete setup. Please restart.", "error");
//         }
//     };

//     const pageVariants = {
//         initial: { opacity: 0, x: 100 },
//         animate: { opacity: 1, x: 0 },
//         exit: { opacity: 0, x: -100 }
//     };

//     return (
//         <div style={{
//             minHeight: '100vh',
//             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             padding: '20px',
//             fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
//         }}>
//             {/* Toast Notification */}
//             <AnimatePresence>
//                 {toast.show && (
//                     <motion.div
//                         initial={{ opacity: 0, y: -50 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -50 }}
//                         style={{
//                             position: 'fixed',
//                             top: '20px',
//                             right: '20px',
//                             background: toast.type === 'success' ? '#10b981' : '#ef4444',
//                             color: 'white',
//                             padding: '16px 24px',
//                             borderRadius: '12px',
//                             boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
//                             zIndex: 1000,
//                             display: 'flex',
//                             alignItems: 'center',
//                             gap: '8px'
//                         }}
//                     >
//                         <span>{toast.type === 'success' ? '✓' : '✕'}</span>
//                         <span>{toast.message}</span>
//                     </motion.div>
//                 )}
//             </AnimatePresence>

//             <motion.div
//                 initial={{ scale: 0.9, opacity: 0 }}
//                 animate={{ scale: 1, opacity: 1 }}
//                 transition={{ duration: 0.5 }}
//                 style={{
//                     width: '100%',
//                     maxWidth: '800px',
//                     background: 'white',
//                     borderRadius: '24px',
//                     boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
//                     overflow: 'hidden'
//                 }}
//             >
//                 {/* Progress Bar */}
//                 <div style={{
//                     height: '6px',
//                     background: '#e0e0e0',
//                     position: 'relative'
//                 }}>
//                     <motion.div
//                         initial={{ width: 0 }}
//                         animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
//                         transition={{ duration: 0.3 }}
//                         style={{
//                             height: '100%',
//                             background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
//                         }}
//                     />
//                 </div>

//                 {/* Step Indicators */}
//                 <div style={{
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     padding: '30px 40px 20px',
//                     borderBottom: '1px solid #f0f0f0',
//                     overflowX: 'auto'
//                 }}>
//                     {steps.map((step, index) => (
//                         <div key={step.id} style={{
//                             display: 'flex',
//                             flexDirection: 'column',
//                             alignItems: 'center',
//                             flex: 1,
//                             minWidth: '80px',
//                             position: 'relative'
//                         }}>
//                             <motion.div
//                                 animate={{
//                                     scale: currentStep === index ? 1.1 : 1,
//                                     background: currentStep >= index 
//                                         ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
//                                         : '#e0e0e0'
//                                 }}
//                                 style={{
//                                     width: '48px',
//                                     height: '48px',
//                                     borderRadius: '50%',
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     justifyContent: 'center',
//                                     color: currentStep >= index ? 'white' : '#999',
//                                     fontSize: '20px',
//                                     fontWeight: 'bold',
//                                     marginBottom: '8px',
//                                     transition: 'all 0.3s'
//                                 }}
//                             >
//                                 {step.icon}
//                             </motion.div>
//                             <span style={{
//                                 fontSize: '12px',
//                                 color: currentStep === index ? '#667eea' : '#999',
//                                 fontWeight: currentStep === index ? '600' : '400',
//                                 transition: 'all 0.3s',
//                                 textAlign: 'center'
//                             }}>
//                                 {step.title}
//                             </span>
//                         </div>
//                     ))}
//                 </div>

//                 {/* Content Area */}
//                 <div style={{ padding: '40px', minHeight: '400px' }}>
//                     <AnimatePresence mode="wait">
//                         {currentStep === 0 && (
//                             <motion.div
//                                 key="welcome"
//                                 variants={pageVariants}
//                                 initial="initial"
//                                 animate="animate"
//                                 exit="exit"
//                                 transition={{ duration: 0.3 }}
//                             >
//                                 <div style={{ textAlign: 'center' }}>
//                                     <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} style={{ fontSize: '80px', marginBottom: '20px' }}
//                                     >
//                                         🏥
//                                     </motion.div>
//                                     <h1 style={{ fontSize: '36px',
//                                         margin: '0 0 16px 0',
//                                         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//                                         WebkitBackgroundClip: 'text',
//                                         WebkitTextFillColor: 'transparent',
//                                         backgroundClip: 'text'
//                                     }}>
//                                         Welcome to Medical Manager
//                                     </h1>
//                                     <p style={{
//                                         fontSize: '18px',
//                                         color: '#666',
//                                         lineHeight: '1.6',
//                                         maxWidth: '500px',
//                                         margin: '0 auto'
//                                     }}>
//                                         Let's get your application set up in just a few steps. 
//                                         This will only take a minute!
//                                     </p>
//                                 </div>
//                             </motion.div>
//                         )}

//                         {currentStep === 1 && (
//                             <motion.div
//                                 key="appearance"
//                                 variants={pageVariants}
//                                 initial="initial"
//                                 animate="animate"
//                                 exit="exit"
//                                 transition={{ duration: 0.3 }}
//                             >
//                                 <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
//                                     Choose Your Theme
//                                 </h2>
//                                 <p style={{ fontSize: '16px', color: '#666', marginBottom: '40px' }}>
//                                     Select how you'd like the application to look
//                                 </p>
                                
//                                 <div style={{
//                                     display: 'grid',
//                                     gridTemplateColumns: 'repeat(3, 1fr)',
//                                     gap: '20px',
//                                     marginBottom: '40px'
//                                 }}>
//                                     {themeOptions.map((option) => (
//                                         <motion.div
//                                             key={option.value}
//                                             whileHover={{ scale: 1.05 }}
//                                             whileTap={{ scale: 0.95 }}
//                                             onClick={() => handleChange('theme', option.value)}
//                                             style={{
//                                                 padding: '24px',
//                                                 border: settings.theme === option.value 
//                                                     ? '3px solid #667eea' 
//                                                     : '2px solid #e0e0e0',
//                                                 borderRadius: '16px',
//                                                 cursor: 'pointer',
//                                                 textAlign: 'center',
//                                                 background: settings.theme === option.value 
//                                                     ? '#f7f8ff' 
//                                                     : 'white',
//                                                 transition: 'all 0.2s'
//                                             }}
//                                         >
//                                             <div style={{ fontSize: '36px', marginBottom: '12px' }}>
//                                                 {option.emoji}
//                                             </div>
//                                             <div style={{ fontWeight: '600', color: '#333' }}>
//                                                 {option.label}
//                                             </div>
//                                         </motion.div>
//                                     ))}
//                                 </div>

//                                 <div style={{
//                                     background: '#f8f9fa',
//                                     padding: '20px',
//                                     borderRadius: '12px',
//                                     marginTop: '20px'
//                                 }}>
//                                     <label style={{
//                                         display: 'block',
//                                         marginBottom: '12px',
//                                         fontWeight: '600',
//                                         color: '#333',
//                                         fontSize: '14px'
//                                     }}>
//                                         Advanced: Logging Level
//                                     </label>
//                                     <select 
//                                         value={settings.logLevel} 
//                                         onChange={(e) => handleChange('logLevel', e.target.value)} 
//                                         style={{
//                                             width: '100%',
//                                             padding: '12px 16px',
//                                             fontSize: '16px',
//                                             borderRadius: '8px',
//                                             border: '2px solid #e0e0e0',
//                                             background: 'white',
//                                             cursor: 'pointer',
//                                             outline: 'none'
//                                         }}
//                                     >
//                                         {logOptions.map(opt => (
//                                             <option key={opt.value} value={opt.value}>{opt.label}</option>
//                                         ))}
//                                     </select>
//                                 </div>
//                             </motion.div>
//                         )}

//                         {currentStep === 2 && (
//                             <motion.div
//                                 key="doctor"
//                                 variants={pageVariants}
//                                 initial="initial"
//                                 animate="animate"
//                                 exit="exit"
//                                 transition={{ duration: 0.3 }}
//                             >
//                                 <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
//                                     Doctor Information
//                                 </h2>
//                                 <p style={{ fontSize: '16px', color: '#666', marginBottom: '40px' }}>
//                                     Set the default doctor name for admission records
//                                 </p>
                                
//                                 <div style={{
//                                     background: '#f8f9fa',
//                                     padding: '40px',
//                                     borderRadius: '16px',
//                                     textAlign: 'center'
//                                 }}>
//                                     <motion.div
//                                         animate={{ y: [0, -10, 0] }}
//                                         transition={{ duration: 2, repeat: Infinity }}
//                                         style={{ fontSize: '64px', marginBottom: '24px' }}
//                                     >
//                                         👨‍⚕️
//                                     </motion.div>
//                                     <label style={{
//                                         display: 'block',
//                                         marginBottom: '12px',
//                                         fontWeight: '600',
//                                         fontSize: '18px',
//                                         color: '#333'
//                                     }}>
//                                         Default Doctor Name
//                                     </label>
//                                     <input 
//                                         type="text"
//                                         value={settings.defaultDoctorName} 
//                                         onChange={(e) => handleChange('defaultDoctorName', e.target.value)} 
//                                         placeholder="Dr. Smith" 
//                                         style={{
//                                             width: '100%',
//                                             maxWidth: '400px',
//                                             padding: '16px',
//                                             fontSize: '16px',
//                                             borderRadius: '12px',
//                                             border: '2px solid #e0e0e0',
//                                             textAlign: 'center',
//                                             outline: 'none',
//                                             transition: 'border-color 0.2s'
//                                         }}
//                                         onFocus={(e) => e.target.style.borderColor = '#667eea'}
//                                         onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
//                                     />
//                                     <p style={{
//                                         marginTop: '16px',
//                                         fontSize: '14px',
//                                         color: '#999'
//                                     }}>
//                                         You can always change this later in settings
//                                     </p>
//                                 </div>
//                             </motion.div>
//                         )}

//                         {currentStep === 3 && (
//                             <motion.div
//                                 key="storage"
//                                 variants={pageVariants}
//                                 initial="initial"
//                                 animate="animate"
//                                 exit="exit"
//                                 transition={{ duration: 0.3 }}
//                             >
//                                 <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
//                                     Storage Locations
//                                 </h2>
                                
//                                 <div style={{
//                                     display: 'flex',
//                                     flexDirection: 'column',
//                                     gap: '24px'
//                                 }}>
//                                     {/* Log Directory */}
//                                     <div style={{
//                                         background: '#f8f9fa',
//                                         padding: '24px',
//                                         borderRadius: '16px'
//                                     }}>
//                                         <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
//                                             <span style={{ fontSize: '24px', marginRight: '12px' }}>📝</span>
//                                             <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
//                                                 Log Files Directory
//                                             </h3>
//                                         </div>
//                                         <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
//                                             Application logs will be stored here for debugging and monitoring
//                                         </p>
//                                         <div style={{
//                                             display: 'flex',
//                                             gap: '12px',
//                                             alignItems: 'center'
//                                         }}>
//                                             <input 
//                                                 type="text"
//                                                 value={settings.logDirectory}
//                                                 readOnly
//                                                 disabled
//                                                 placeholder="Select a directory..."
//                                                 style={{
//                                                     flex: 1,
//                                                     padding: '12px',
//                                                     fontSize: '14px',
//                                                     borderRadius: '8px',
//                                                     border: '2px solid #e0e0e0',
//                                                     background: 'white',
//                                                     outline: 'none',
//                                                     color: '#333'
//                                                 }}
//                                             />
                                            
//                                         </div>
//                                     </div>

//                                     {/* Database Directory */}
//                                     <div style={{
//                                         background: '#f8f9fa',
//                                         padding: '24px',
//                                         borderRadius: '16px'
//                                     }}>
//                                         <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
//                                             <span style={{ fontSize: '24px', marginRight: '12px' }}>🗄️</span>
//                                             <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
//                                                 Database Directory
//                                             </h3>
//                                         </div>
//                                         <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
//                                             Patient records and application data will be stored here
//                                         </p>
//                                         <div style={{
//                                             display: 'flex',
//                                             gap: '12px',
//                                             alignItems: 'center'
//                                         }}>
//                                             <input 
//                                                 type="text"
//                                                 value={settings.databaseDirectory}
//                                                 readOnly
//                                                 disabled
//                                                 placeholder="Select a directory..."
//                                                 style={{
//                                                     flex: 1,
//                                                     padding: '12px',
//                                                     fontSize: '14px',
//                                                     borderRadius: '8px',
//                                                     border: '2px solid #e0e0e0',
//                                                     background: 'white',
//                                                     outline: 'none',
//                                                     color: '#333'
//                                                 }}
//                                             />
                                            
//                                         </div>
//                                     </div>

//                                     <div style={{
//                                         background: '#fff3cd',
//                                         border: '1px solid #ffc107',
//                                         padding: '16px',
//                                         borderRadius: '12px',
//                                         display: 'flex',
//                                         gap: '12px',
//                                         alignItems: 'flex-start'
//                                     }}>
//                                         <span style={{ fontSize: '20px' }}>💡</span>
//                                         <div style={{ flex: 1 }}>
//                                             <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#856404', fontSize: '14px' }}>
//                                                 Tip: Using Default Locations
//                                             </p>
//                                             <p style={{ margin: 0, fontSize: '13px', color: '#856404', lineHeight: '1.5' }}>
//                                                 The default locations are recommended for most users.
//                                             </p>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </motion.div>
//                         )}

//                         {currentStep === 4 && (
//                             <motion.div
//                                 key="hardware"
//                                 variants={pageVariants}
//                                 initial="initial"
//                                 animate="animate"
//                                 exit="exit"
//                                 transition={{ duration: 0.3 }}
//                             >
//                                 <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
//                                     Hardware Settings
//                                 </h2>
//                                 <p style={{ fontSize: '16px', color: '#666', marginBottom: '40px' }}>
//                                     Configure how the app connects to medical devices
//                                 </p>
                                
//                                 <div style={{
//                                     display: 'flex',
//                                     flexDirection: 'column',
//                                     gap: '24px'
//                                 }}>
//                                     <div style={{
//                                         background: '#f8f9fa',
//                                         padding: '24px',
//                                         borderRadius: '16px',
//                                         display: 'flex',
//                                         justifyContent: 'space-between',
//                                         alignItems: 'center'
//                                     }}>
//                                         <div>
//                                             <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
//                                                 Auto-Connect on Startup
//                                             </h3>
//                                             <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
//                                                 Automatically connect to known devices when app launches
//                                             </p>
//                                         </div>
//                                         <motion.div
//                                             whileTap={{ scale: 0.95 }}
//                                             onClick={() => handleChange('autoConnectEnabled', !settings.autoConnectEnabled)}
//                                             style={{
//                                                 width: '60px',
//                                                 height: '32px',
//                                                 background: settings.autoConnectEnabled ? '#667eea' : '#ccc',
//                                                 borderRadius: '16px',
//                                                 cursor: 'pointer',
//                                                 position: 'relative',
//                                                 transition: 'background 0.3s'
//                                             }}
//                                         >
//                                             <motion.div
//                                                 animate={{ x: settings.autoConnectEnabled ? 28 : 0 }}
//                                                 transition={{ type: 'spring', stiffness: 500, damping: 30 }}
//                                                 style={{
//                                                     width: '28px',
//                                                     height: '28px',
//                                                     background: 'white',
//                                                     borderRadius: '50%',
//                                                     position: 'absolute',
//                                                     top: '2px',
//                                                     left: '2px',
//                                                     boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
//                                                 }}
//                                             />
//                                         </motion.div>
//                                     </div>

//                                     <div style={{
//                                         background: '#f8f9fa',
//                                         padding: '24px',
//                                         borderRadius: '16px'
//                                     }}>
//                                         <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
//                                             Default Baud Rate
//                                         </h3>
//                                         <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
//                                             Serial communication speed (bits per second)
//                                         </p>
//                                         <input 
//                                             type="number"
//                                             value={settings.baudRateDefault} 
//                                             onChange={(e) => handleChange('baudRateDefault', Number(e.target.value))} 
//                                             style={{
//                                                 width: '200px',
//                                                 padding: '12px',
//                                                 fontSize: '16px',
//                                                 borderRadius: '8px',
//                                                 border: '2px solid #e0e0e0',
//                                                 outline: 'none',
//                                                 transition: 'border-color 0.2s'
//                                             }}
//                                             onFocus={(e) => e.target.style.borderColor = '#667eea'}
//                                             onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
//                                         />
//                                     </div>
//                                 </div>
//                             </motion.div>
//                         )}

//                         {currentStep === 5 && (
//                             <motion.div
//                                 key="complete"
//                                 variants={pageVariants}
//                                 initial="initial"
//                                 animate="animate"
//                                 exit="exit"
//                                 transition={{ duration: 0.3 }}
//                             >
//                                 <div style={{ textAlign: 'center' }}>
//                                     <motion.div
//                                         initial={{ scale: 0 }}
//                                         animate={{ scale: 1 }}
//                                         transition={{ type: "spring", duration: 0.5 }}
//                                         style={{ fontSize: '80px', marginBottom: '20px' }}
//                                     >
//                                         ✅
//                                     </motion.div>
//                                     <h1 style={{
//                                         fontSize: '36px',
//                                         margin: '0 0 16px 0',
//                                         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//                                         WebkitBackgroundClip: 'text',
//                                         WebkitTextFillColor: 'transparent',
//                                         backgroundClip: 'text'
//                                     }}>
//                                         All Set!
//                                     </h1>
//                                     <p style={{
//                                         fontSize: '18px',
//                                         color: '#666',
//                                         lineHeight: '1.6',
//                                         maxWidth: '500px',
//                                         margin: '0 auto 40px'
//                                     }}>
//                                         Your application is ready to use. Click finish to start managing patient records.
//                                     </p>

//                                     <div style={{
//                                         background: '#f8f9fa',
//                                         padding: '24px',
//                                         borderRadius: '16px',
//                                         textAlign: 'left',
//                                         maxWidth: '600px',
//                                         margin: '0 auto'
//                                     }}>
//                                         <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>
//                                             Your Configuration:
//                                         </h3>
//                                         <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
//                                             <div><strong>Theme:</strong> {themeOptions.find(o => o.value === settings.theme)?.label}</div>
//                                             <div><strong>Doctor:</strong> {settings.defaultDoctorName || 'Not set'}</div>
//                                             <div><strong>Auto-Connect:</strong> {settings.autoConnectEnabled ? 'Enabled' : 'Disabled'}</div>
//                                             <div><strong>Baud Rate:</strong> {settings.baudRateDefault}</div>
//                                             <div><strong>Log Level:</strong> {logOptions.find(o => o.value === settings.logLevel)?.label}</div>
//                                             <div style={{ 
//                                                 marginTop: '12px', 
//                                                 paddingTop: '12px', 
//                                                 borderTop: '1px solid #e0e0e0',
//                                                 fontSize: '12px',
//                                                 wordBreak: 'break-all'
//                                             }}>
//                                                 <div><strong>Log Directory:</strong></div>
//                                                 <div style={{ color: '#999', marginBottom: '8px' }}>{settings.logDirectory}</div>
//                                                 <div><strong>Database Directory:</strong></div>
//                                                 <div style={{ color: '#999' }}>{settings.databaseDirectory}</div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </motion.div>
//                         )}
//                     </AnimatePresence>
//                 </div>

//                 {/* Navigation Buttons */}
//                 <div style={{
//                     padding: '20px 40px 40px',
//                     display: 'flex',
//                     justifyContent: 'space-between',
//                     gap: '16px'
//                 }}>
//                     <motion.button
//                         whileHover={{ scale: currentStep === 0 ? 1 : 1.05 }}
//                         whileTap={{ scale: currentStep === 0 ? 1 : 0.95 }}
//                         onClick={handleBack}
//                         disabled={currentStep === 0}
//                         style={{
//                             padding: '12px 24px',
//                             fontSize: '16px',
//                             fontWeight: '600',
//                             border: '2px solid #667eea',
//                             background: 'white',
//                             color: '#667eea',
//                             borderRadius: '12px',
//                             cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
//                             opacity: currentStep === 0 ? 0.5 : 1,
//                             transition: 'all 0.2s'
//                         }}
//                     >
//                         ← Back
//                     </motion.button>
                    
//                     {currentStep < steps.length - 1 ? (
//                         <motion.button
//                             whileHover={{ scale: 1.05 }}
//                             whileTap={{ scale: 0.95 }}
//                             onClick={handleNext}
//                             style={{
//                                 padding: '12px 32px',
//                                 fontSize: '16px',
//                                 fontWeight: '600',
//                                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//                                 color: 'white',
//                                 border: 'none',
//                                 borderRadius: '12px',
//                                 cursor: 'pointer',
//                                 boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
//                                 transition: 'all 0.2s'
//                             }}
//                         >
//                             Continue →
//                         </motion.button>
//                     ) : (
//                         <motion.button
//                             whileHover={{ scale: 1.05 }}
//                             whileTap={{ scale: 0.95 }}
//                             onClick={handleFinish}
//                             style={{
//                                 padding: '12px 32px',
//                                 fontSize: '16px',
//                                 fontWeight: '600',
//                                 background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
//                                 color: 'white',
//                                 border: 'none',
//                                 borderRadius: '12px',
//                                 cursor: 'pointer',
//                                 boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
//                                 transition: 'all 0.2s'
//                             }}
//                         >
//                             ✓ Finish Setup
//                         </motion.button>
//                     )}
//                 </div>
//             </motion.div>
//         </div>
//     );
// }

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Commented out Tauri imports - will integrate later
import { invoke,  } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
import { connect, useDispatch } from 'react-redux';
import { setSettings as setMySettings } from '../store/settingsSlice';
import { logOptions, themeOptions, steps } from "../common/setupOptions";
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { setDevices } from '../store/arduinoSlice';
import type { ArduinoDevice } from '../store/arduinoSlice';


type Devices = {
    id: number,
    board_name: string,
    custom_name: string | null,
    pid: string,
    port: string,
    product: string,
    serial_number: string,
    status: string,
    vid: number
}

export default function SetupWizard() {
    const dispatch = useDispatch();
    const [currentStep, setCurrentStep] = useState(0);
    const [settings, setSettings] = useState({
        theme: 'system',
        baudRateDefault: 9600,
        autoConnectEnabled: true,
        defaultDoctorName: '',
        logLevel: 'info',
        logDirectory: '',
        databaseDirectory: ''
    });
    const [isScanning, setIsScanning] = useState(false);
    const [deviceCustomizations, setDeviceCustomizations] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  

    useEffect(() => {
        const loadDefaultPaths = async () => {
            
            try {
                // Commented out for now - will integrate later
                const paths = await invoke<DefaultPaths>("get_default_paths");
                setSettings(prev => ({
                    ...prev,
                    logDirectory: paths.log_directory,
                    databaseDirectory: paths.database_directory,
                }));

                
            } catch (err) {
                console.error("Failed to load default paths:", err);
            }
        };

        loadDefaultPaths();
    }, []);

    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast({ show: false, message: '', type: 'success' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.show]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleDeviceCustomization = (deviceId, field, value) => {
        setDeviceCustomizations(prev => ({
            ...prev,
            [deviceId]: {
                ...prev[deviceId],
                [field]: value
            }
        }));
    };

    const scanForDevices = async () => {
        setIsScanning(true);
        try {
            // Commented out for now - will integrate later
            await invoke("scan_arduino_now");
            
        } catch (error) {
            console.error("Failed to scan devices:", error);
            showToast("Failed to scan for devices", "error");
        } finally {
            setIsScanning(false);
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = async () => {
        const app_settings = {
            theme: settings.theme,
            baud_rate_default: settings.baudRateDefault,
            auto_connect_enabled: settings.autoConnectEnabled,
            default_doctor_name: settings.defaultDoctorName,
            log_level: settings.logLevel,
            log_file_location: settings.logDirectory || null,
            sqlite_file_path: settings.databaseDirectory || null,
        };
        
        // Commented out for now - will integrate later
        dispatch(setMySettings(app_settings));

        try {
            // Commented out for now - will integrate later
            await invoke("save_setup_settings", { settings: app_settings });
            
            const { Window, getCurrentWindow } = await import("@tauri-apps/api/window");
            const { emit } = await import('@tauri-apps/api/event');
            const setupWizard = getCurrentWindow();
            const mainWindow = await Window.getByLabel("main");
            await emit('setup-finished', { settings: app_settings });
            if (mainWindow) {
                await mainWindow.show();
                await setupWizard.close();
                await mainWindow.setFocus()
            }

            showToast("Welcome! Application ready.", "success");
            console.log("Settings:", app_settings);
            console.log("Device Customizations:", deviceCustomizations);
        } catch (err) {
            console.error("Setup failed:", err);
            showToast("Failed to complete setup. Please restart.", "error");
        }
    };

    const pageVariants = {
        initial: { opacity: 0, x: 100 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -100 }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
            {/* Toast Notification */}
            <AnimatePresence>
                {toast.show && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        style={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            background: toast.type === 'success' ? '#10b981' : '#ef4444',
                            color: 'white',
                            padding: '16px 24px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>{toast.type === 'success' ? '✓' : '✕'}</span>
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                style={{
                    width: '100%',
                    maxWidth: '800px',
                    background: 'white',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    overflow: 'hidden'
                }}
            >
                {/* Progress Bar */}
                <div style={{
                    height: '6px',
                    background: '#e0e0e0',
                    position: 'relative'
                }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                        style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        }}
                    />
                </div>

                {/* Step Indicators */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '30px 40px 20px',
                    borderBottom: '1px solid #f0f0f0',
                    overflowX: 'auto'
                }}>
                    {steps.map((step, index) => (
                        <div key={step.id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            minWidth: '80px',
                            position: 'relative'
                        }}>
                            <motion.div
                                animate={{
                                    scale: currentStep === index ? 1.1 : 1,
                                    background: currentStep >= index 
                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : '#e0e0e0'
                                }}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: currentStep >= index ? 'white' : '#999',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    marginBottom: '8px',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {step.icon}
                            </motion.div>
                            <span style={{
                                fontSize: '12px',
                                color: currentStep === index ? '#667eea' : '#999',
                                fontWeight: currentStep === index ? '600' : '400',
                                transition: 'all 0.3s',
                                textAlign: 'center'
                            }}>
                                {step.title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div style={{ padding: '40px', minHeight: '400px' }}>
                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <motion.div
                                key="welcome"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} style={{ fontSize: '80px', marginBottom: '20px' }}
                                    >
                                        🏥
                                    </motion.div>
                                    <h1 style={{ fontSize: '36px',
                                        margin: '0 0 16px 0',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}>
                                        Welcome to Medical Manager
                                    </h1>
                                    <p style={{
                                        fontSize: '18px',
                                        color: '#666',
                                        lineHeight: '1.6',
                                        maxWidth: '500px',
                                        margin: '0 auto'
                                    }}>
                                        Let's get your application set up in just a few steps. 
                                        This will only take a minute!
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 1 && (
                            <motion.div
                                key="appearance"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
                                    Choose Your Theme
                                </h2>
                                <p style={{ fontSize: '16px', color: '#666', marginBottom: '40px' }}>
                                    Select how you'd like the application to look
                                </p>
                                
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '20px',
                                    marginBottom: '40px'
                                }}>
                                    {themeOptions.map((option) => (
                                        <motion.div
                                            key={option.value}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleChange('theme', option.value)}
                                            style={{
                                                padding: '24px',
                                                border: settings.theme === option.value 
                                                    ? '3px solid #667eea' 
                                                    : '2px solid #e0e0e0',
                                                borderRadius: '16px',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                background: settings.theme === option.value 
                                                    ? '#f7f8ff' 
                                                    : 'white',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontSize: '36px', marginBottom: '12px' }}>
                                                {option.emoji}
                                            </div>
                                            <div style={{ fontWeight: '600', color: '#333' }}>
                                                {option.label}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div style={{
                                    background: '#f8f9fa',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    marginTop: '20px'
                                }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '12px',
                                        fontWeight: '600',
                                        color: '#333',
                                        fontSize: '14px'
                                    }}>
                                        Advanced: Logging Level
                                    </label>
                                    <select 
                                        value={settings.logLevel} 
                                        onChange={(e) => handleChange('logLevel', e.target.value)} 
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            fontSize: '16px',
                                            borderRadius: '8px',
                                            border: '2px solid #e0e0e0',
                                            background: 'white',
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                    >
                                        {logOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="doctor"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
                                    Doctor Information
                                </h2>
                                <p style={{ fontSize: '16px', color: '#666', marginBottom: '40px' }}>
                                    Set the default doctor name for admission records
                                </p>
                                
                                <div style={{
                                    background: '#f8f9fa',
                                    padding: '40px',
                                    borderRadius: '16px',
                                    textAlign: 'center'
                                }}>
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{ fontSize: '64px', marginBottom: '24px' }}
                                    >
                                        👨‍⚕️
                                    </motion.div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '12px',
                                        fontWeight: '600',
                                        fontSize: '18px',
                                        color: '#333'
                                    }}>
                                        Default Doctor Name
                                    </label>
                                    <input 
                                        type="text"
                                        value={settings.defaultDoctorName} 
                                        onChange={(e) => handleChange('defaultDoctorName', e.target.value)} 
                                        placeholder="Dr. Smith" 
                                        style={{
                                            width: '100%',
                                            maxWidth: '400px',
                                            padding: '16px',
                                            fontSize: '16px',
                                            borderRadius: '12px',
                                            border: '2px solid #e0e0e0',
                                            textAlign: 'center',
                                            outline: 'none',
                                            transition: 'border-color 0.2s'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                    />
                                    <p style={{
                                        marginTop: '16px',
                                        fontSize: '14px',
                                        color: '#999'
                                    }}>
                                        You can always change this later in settings
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="storage"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
                                    Storage Locations
                                </h2>
                                
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '24px'
                                }}>
                                    {/* Log Directory */}
                                    <div style={{
                                        background: '#f8f9fa',
                                        padding: '24px',
                                        borderRadius: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '24px', marginRight: '12px' }}>📝</span>
                                            <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
                                                Log Files Directory
                                            </h3>
                                        </div>
                                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                                            Application logs will be stored here for debugging and monitoring
                                        </p>
                                        <div style={{
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'center'
                                        }}>
                                            <input 
                                                type="text"
                                                value={settings.logDirectory}
                                                readOnly
                                                disabled
                                                placeholder="Select a directory..."
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    borderRadius: '8px',
                                                    border: '2px solid #e0e0e0',
                                                    background: 'white',
                                                    outline: 'none',
                                                    color: '#333'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Database Directory */}
                                    <div style={{
                                        background: '#f8f9fa',
                                        padding: '24px',
                                        borderRadius: '16px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '24px', marginRight: '12px' }}>🗄️</span>
                                            <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
                                                Database Directory
                                            </h3>
                                        </div>
                                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                                            Patient records and application data will be stored here
                                        </p>
                                        <div style={{
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'center'
                                        }}>
                                            <input 
                                                type="text"
                                                value={settings.databaseDirectory}
                                                readOnly
                                                disabled
                                                placeholder="Select a directory..."
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    borderRadius: '8px',
                                                    border: '2px solid #e0e0e0',
                                                    background: 'white',
                                                    outline: 'none',
                                                    color: '#333'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{
                                        background: '#fff3cd',
                                        border: '1px solid #ffc107',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        gap: '12px',
                                        alignItems: 'flex-start'
                                    }}>
                                        <span style={{ fontSize: '20px' }}>💡</span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#856404', fontSize: '14px' }}>
                                                Tip: Using Default Locations
                                            </p>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#856404', lineHeight: '1.5' }}>
                                                The default locations are recommended for most users.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                       

                        {currentStep === 4 && (
                            <motion.div
                                key="hardware"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#333' }}>
                                    Hardware Settings
                                </h2>
                                <p style={{ fontSize: '16px', color: '#666', marginBottom: '40px' }}>
                                    Configure how the app connects to medical devices
                                </p>
                                
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '24px'
                                }}>
                                    <div style={{
                                        background: '#f8f9fa',
                                        padding: '24px',
                                        borderRadius: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
                                                Auto-Connect on Startup
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                                                Automatically connect to known devices when app launches
                                            </p>
                                        </div>
                                        <motion.div
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleChange('autoConnectEnabled', !settings.autoConnectEnabled)}
                                            style={{
                                                width: '60px',
                                                height: '32px',
                                                background: settings.autoConnectEnabled ? '#667eea' : '#ccc',
                                                borderRadius: '16px',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                transition: 'background 0.3s'
                                            }}
                                        >
                                            <motion.div
                                                animate={{ x: settings.autoConnectEnabled ? 28 : 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: '2px',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}
                                            />
                                        </motion.div>
                                    </div>

                                    <div style={{
                                        background: '#f8f9fa',
                                        padding: '24px',
                                        borderRadius: '16px'
                                    }}>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
                                            Default Baud Rate
                                        </h3>
                                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                                            Serial communication speed (bits per second)
                                        </p>
                                        <input 
                                            type="number"
                                            value={settings.baudRateDefault} 
                                            onChange={(e) => handleChange('baudRateDefault', Number(e.target.value))} 
                                            style={{
                                                width: '200px',
                                                padding: '12px',
                                                fontSize: '16px',
                                                borderRadius: '8px',
                                                border: '2px solid #e0e0e0',
                                                outline: 'none',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 5 && (
                            <motion.div
                                key="complete"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", duration: 0.5 }}
                                        style={{ fontSize: '80px', marginBottom: '20px' }}
                                    >
                                        ✅
                                    </motion.div>
                                    <h1 style={{
                                        fontSize: '36px',
                                        margin: '0 0 16px 0',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}>
                                        All Set!
                                    </h1>
                                    <p style={{
                                        fontSize: '18px',
                                        color: '#666',
                                        lineHeight: '1.6',
                                        maxWidth: '500px',
                                        margin: '0 auto 40px'
                                    }}>
                                        Your application is ready to use. Click finish to start managing patient records.
                                    </p>

                                    <div style={{
                                        background: '#f8f9fa',
                                        padding: '24px',
                                        borderRadius: '16px',
                                        textAlign: 'left',
                                        maxWidth: '600px',
                                        margin: '0 auto'
                                    }}>
                                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>
                                            Your Configuration:
                                        </h3>
                                        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                                            <div><strong>Theme:</strong> {themeOptions.find(o => o.value === settings.theme)?.label}</div>
                                            <div><strong>Doctor:</strong> {settings.defaultDoctorName || 'Not set'}</div>
                                            <div><strong>Auto-Connect:</strong> {settings.autoConnectEnabled ? 'Enabled' : 'Disabled'}</div>
                                            <div><strong>Baud Rate:</strong> {settings.baudRateDefault}</div>
                                            <div><strong>Log Level:</strong> {logOptions.find(o => o.value === settings.logLevel)?.label}</div>
                                            <div style={{ 
                                                marginTop: '12px', 
                                                paddingTop: '12px', 
                                                borderTop: '1px solid #e0e0e0',
                                                fontSize: '12px',
                                                wordBreak: 'break-all'
                                            }}>
                                                <div><strong>Log Directory:</strong></div>
                                                <div style={{ color: '#999', marginBottom: '8px' }}>{settings.logDirectory}</div>
                                                <div><strong>Database Directory:</strong></div>
                                                <div style={{ color: '#999' }}>{settings.databaseDirectory}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Navigation Buttons */}
                <div style={{
                    padding: '20px 40px 40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px'
                }}>
                    <motion.button
                        whileHover={{ scale: currentStep === 0 ? 1 : 1.05 }}
                        whileTap={{ scale: currentStep === 0 ? 1 : 0.95 }}
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            fontWeight: '600',
                            border: '2px solid #667eea',
                            background: 'white',
                            color: '#667eea',
                            borderRadius: '12px',
                            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                            opacity: currentStep === 0 ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        ← Back
                    </motion.button>
                    
                    {currentStep < steps.length - 1 ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleNext}
                            style={{
                                padding: '12px 32px',
                                fontSize: '16px',
                                fontWeight: '600',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Continue →
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleFinish}
                            style={{
                                padding: '12px 32px',
                                fontSize: '16px',
                                fontWeight: '600',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            ✓ Finish Setup
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}