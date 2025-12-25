import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
const themeOptions = [
    { label: 'System Default', value: 'system', emoji: '💻' },
    { label: 'Light Mode', value: 'light', emoji: '☀️' },
    { label: 'Dark Mode', value: 'dark', emoji: '🌙' }
];
const logOptions = [
    { label: 'Error (Minimal)', value: 'error' },
    { label: 'Info (Standard)', value: 'info' },
    { label: 'Debug (Verbose)', value: 'debug' }
];
export default function SetupWizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [settings, setSettings] = useState({
        theme: 'system',
        baudRateDefault: 9600,
        autoConnectEnabled: true,
        defaultDoctorName: '',
        logLevel: 'info',
    });
    const steps = [
        { id: 0, title: "Welcome", icon: "❤️" },
        { id: 1, title: "Appearance", icon: "🎨" },
        { id: 2, title: "Doctor Info", icon: "👨‍⚕️" },
        { id: 3, title: "Hardware", icon: "📡" },
        { id: 4, title: "Complete", icon: "✓" }
    ];
    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
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
    const handleFinish = () => {
        console.log("Setup complete with settings:", settings);
        // invoke("save_settings", { settings });
        alert("Setup complete! Settings saved.");
    };
    const pageVariants = {
        initial: { opacity: 0, x: 100 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -100 }
    };
    return (_jsx("div", { style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }, children: _jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.5 }, style: {
                width: '100%',
                maxWidth: '800px',
                background: 'white',
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                overflow: 'hidden'
            }, children: [_jsx("div", { style: {
                        height: '6px',
                        background: '#e0e0e0',
                        position: 'relative'
                    }, children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${((currentStep + 1) / steps.length) * 100}%` }, transition: { duration: 0.3 }, style: {
                            height: '100%',
                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        } }) }), _jsx("div", { style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '30px 40px 20px',
                        borderBottom: '1px solid #f0f0f0'
                    }, children: steps.map((step, index) => (_jsxs("div", { style: {
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            position: 'relative'
                        }, children: [_jsx(motion.div, { animate: {
                                    scale: currentStep === index ? 1.1 : 1,
                                    background: currentStep >= index
                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : '#e0e0e0'
                                }, style: {
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
                                }, children: step.icon }), _jsx("span", { style: {
                                    fontSize: '12px',
                                    color: currentStep === index ? '#667eea' : '#999',
                                    fontWeight: currentStep === index ? '600' : '400',
                                    transition: 'all 0.3s'
                                }, children: step.title })] }, step.id))) }), _jsx("div", { style: { padding: '40px', minHeight: '400px' }, children: _jsxs(AnimatePresence, { mode: "wait", children: [currentStep === 0 && (_jsx(motion.div, { variants: pageVariants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.3 }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx(motion.div, { animate: { rotate: [0, 10, -10, 0] }, transition: { duration: 2, repeat: Infinity, repeatDelay: 3 }, style: { fontSize: '80px', marginBottom: '20px' }, children: "\uD83C\uDFE5" }), _jsx("h1", { style: {
                                                fontSize: '36px',
                                                margin: '0 0 16px 0',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text'
                                            }, children: "Welcome to Medical Manager" }), _jsx("p", { style: {
                                                fontSize: '18px',
                                                color: '#666',
                                                lineHeight: '1.6',
                                                maxWidth: '500px',
                                                margin: '0 auto'
                                            }, children: "Let's get your application set up in just a few steps. This will only take a minute!" })] }) }, "welcome")), currentStep === 1 && (_jsxs(motion.div, { variants: pageVariants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.3 }, children: [_jsx("h2", { style: { fontSize: '28px', marginBottom: '12px', color: '#333' }, children: "Choose Your Theme" }), _jsx("p", { style: { fontSize: '16px', color: '#666', marginBottom: '40px' }, children: "Select how you'd like the application to look" }), _jsx("div", { style: {
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: '20px',
                                            marginBottom: '40px'
                                        }, children: themeOptions.map((option) => (_jsxs(motion.div, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: () => handleChange('theme', option.value), style: {
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
                                            }, children: [_jsx("div", { style: { fontSize: '36px', marginBottom: '12px' }, children: option.emoji }), _jsx("div", { style: { fontWeight: '600', color: '#333' }, children: option.label })] }, option.value))) }), _jsxs("div", { style: {
                                            background: '#f8f9fa',
                                            padding: '20px',
                                            borderRadius: '12px',
                                            marginTop: '20px'
                                        }, children: [_jsx("label", { style: {
                                                    display: 'block',
                                                    marginBottom: '12px',
                                                    fontWeight: '600',
                                                    color: '#333',
                                                    fontSize: '14px'
                                                }, children: "Advanced: Logging Level" }), _jsx("select", { value: settings.logLevel, onChange: (e) => handleChange('logLevel', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    fontSize: '16px',
                                                    borderRadius: '8px',
                                                    border: '2px solid #e0e0e0',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }, children: logOptions.map(opt => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) })] })] }, "appearance")), currentStep === 2 && (_jsxs(motion.div, { variants: pageVariants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.3 }, children: [_jsx("h2", { style: { fontSize: '28px', marginBottom: '12px', color: '#333' }, children: "Doctor Information" }), _jsx("p", { style: { fontSize: '16px', color: '#666', marginBottom: '40px' }, children: "Set the default doctor name for admission records" }), _jsxs("div", { style: {
                                            background: '#f8f9fa',
                                            padding: '40px',
                                            borderRadius: '16px',
                                            textAlign: 'center'
                                        }, children: [_jsx(motion.div, { animate: { y: [0, -10, 0] }, transition: { duration: 2, repeat: Infinity }, style: { fontSize: '64px', marginBottom: '24px' }, children: "\uD83D\uDC68\u200D\u2695\uFE0F" }), _jsx("label", { style: {
                                                    display: 'block',
                                                    marginBottom: '12px',
                                                    fontWeight: '600',
                                                    fontSize: '18px',
                                                    color: '#333'
                                                }, children: "Default Doctor Name" }), _jsx("input", { type: "text", value: settings.defaultDoctorName, onChange: (e) => handleChange('defaultDoctorName', e.target.value), placeholder: "Dr. Smith", style: {
                                                    width: '100%',
                                                    maxWidth: '400px',
                                                    padding: '16px',
                                                    fontSize: '16px',
                                                    borderRadius: '12px',
                                                    border: '2px solid #e0e0e0',
                                                    textAlign: 'center',
                                                    outline: 'none',
                                                    transition: 'border-color 0.2s'
                                                }, onFocus: (e) => e.target.style.borderColor = '#667eea', onBlur: (e) => e.target.style.borderColor = '#e0e0e0' }), _jsx("p", { style: {
                                                    marginTop: '16px',
                                                    fontSize: '14px',
                                                    color: '#999'
                                                }, children: "You can always change this later in settings" })] })] }, "doctor")), currentStep === 3 && (_jsxs(motion.div, { variants: pageVariants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.3 }, children: [_jsx("h2", { style: { fontSize: '28px', marginBottom: '12px', color: '#333' }, children: "Hardware Settings" }), _jsx("p", { style: { fontSize: '16px', color: '#666', marginBottom: '40px' }, children: "Configure how the app connects to medical devices" }), _jsxs("div", { style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '24px'
                                        }, children: [_jsxs("div", { style: {
                                                    background: '#f8f9fa',
                                                    padding: '24px',
                                                    borderRadius: '16px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }, children: [_jsxs("div", { children: [_jsx("h3", { style: { margin: '0 0 8px 0', fontSize: '18px', color: '#333' }, children: "Auto-Connect on Startup" }), _jsx("p", { style: { margin: 0, fontSize: '14px', color: '#666' }, children: "Automatically connect to known devices when app launches" })] }), _jsx(motion.div, { whileTap: { scale: 0.95 }, onClick: () => handleChange('autoConnectEnabled', !settings.autoConnectEnabled), style: {
                                                            width: '60px',
                                                            height: '32px',
                                                            background: settings.autoConnectEnabled ? '#667eea' : '#ccc',
                                                            borderRadius: '16px',
                                                            cursor: 'pointer',
                                                            position: 'relative',
                                                            transition: 'background 0.3s'
                                                        }, children: _jsx(motion.div, { animate: { x: settings.autoConnectEnabled ? 28 : 0 }, transition: { type: 'spring', stiffness: 500, damping: 30 }, style: {
                                                                width: '28px',
                                                                height: '28px',
                                                                background: 'white',
                                                                borderRadius: '50%',
                                                                position: 'absolute',
                                                                top: '2px',
                                                                left: '2px',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                            } }) })] }), _jsxs("div", { style: {
                                                    background: '#f8f9fa',
                                                    padding: '24px',
                                                    borderRadius: '16px'
                                                }, children: [_jsx("h3", { style: { margin: '0 0 8px 0', fontSize: '18px', color: '#333' }, children: "Default Baud Rate" }), _jsx("p", { style: { margin: '0 0 16px 0', fontSize: '14px', color: '#666' }, children: "Serial communication speed (bits per second)" }), _jsx("input", { type: "number", value: settings.baudRateDefault, onChange: (e) => handleChange('baudRateDefault', Number(e.target.value)), style: {
                                                            width: '200px',
                                                            padding: '12px',
                                                            fontSize: '16px',
                                                            borderRadius: '8px',
                                                            border: '2px solid #e0e0e0',
                                                            outline: 'none',
                                                            transition: 'border-color 0.2s'
                                                        }, onFocus: (e) => e.target.style.borderColor = '#667eea', onBlur: (e) => e.target.style.borderColor = '#e0e0e0' })] })] })] }, "hardware")), currentStep === 4 && (_jsx(motion.div, { variants: pageVariants, initial: "initial", animate: "animate", exit: "exit", transition: { duration: 0.3 }, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring", duration: 0.5 }, style: { fontSize: '80px', marginBottom: '20px' }, children: "\u2705" }), _jsx("h1", { style: {
                                                fontSize: '36px',
                                                margin: '0 0 16px 0',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text'
                                            }, children: "All Set!" }), _jsx("p", { style: {
                                                fontSize: '18px',
                                                color: '#666',
                                                lineHeight: '1.6',
                                                maxWidth: '500px',
                                                margin: '0 auto 40px'
                                            }, children: "Your application is ready to use. Click finish to start managing patient records." }), _jsxs("div", { style: {
                                                background: '#f8f9fa',
                                                padding: '24px',
                                                borderRadius: '16px',
                                                textAlign: 'left',
                                                maxWidth: '500px',
                                                margin: '0 auto'
                                            }, children: [_jsx("h3", { style: { margin: '0 0 16px 0', fontSize: '16px', color: '#333' }, children: "Your Configuration:" }), _jsxs("div", { style: { fontSize: '14px', color: '#666', lineHeight: '1.8' }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Theme:" }), " ", themeOptions.find(o => o.value === settings.theme)?.label] }), _jsxs("div", { children: [_jsx("strong", { children: "Doctor:" }), " ", settings.defaultDoctorName || 'Not set'] }), _jsxs("div", { children: [_jsx("strong", { children: "Auto-Connect:" }), " ", settings.autoConnectEnabled ? 'Enabled' : 'Disabled'] }), _jsxs("div", { children: [_jsx("strong", { children: "Baud Rate:" }), " ", settings.baudRateDefault] }), _jsxs("div", { children: [_jsx("strong", { children: "Log Level:" }), " ", logOptions.find(o => o.value === settings.logLevel)?.label] })] })] })] }) }, "complete"))] }) }), _jsxs("div", { style: {
                        padding: '20px 40px 40px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px'
                    }, children: [_jsx(motion.button, { whileHover: { scale: currentStep === 0 ? 1 : 1.05 }, whileTap: { scale: currentStep === 0 ? 1 : 0.95 }, onClick: handleBack, disabled: currentStep === 0, style: {
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
                            }, children: "\u2190 Back" }), currentStep < steps.length - 1 ? (_jsx(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: handleNext, style: {
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
                            }, children: "Continue \u2192" })) : (_jsx(motion.button, { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: handleFinish, style: {
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
                            }, children: "\u2713 Finish Setup" }))] })] }) }));
}
