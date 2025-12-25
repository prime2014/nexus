import ReactDOM from "react-dom/client";
// import App from "./App";

// import 'primereact/resources/themes/lara-light-blue/theme.css'; // theme
// import 'primereact/resources/primereact.min.css';               // core styles
// import 'primeicons/primeicons.css';                             // icons
// import 'primeflex/primeflex.css'; 
// import { PrimeReactProvider } from 'primereact/api';
// import { Provider } from "react-redux";
// import { store } from "./store";
// import "./index.css";

// //version 0.1.0
// console.log("FORCING NEW BUILD HASH - REMOVE LATER");

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   // <React.StrictMode>
//     <Provider store={store}>
//       <PrimeReactProvider>
//         <App />
//       </PrimeReactProvider>
//     </Provider>
//   // </React.StrictMode>,
// );

import React from "react";
// import ReactDOM from "react-dom/client";
import App from "./App";
import SetupWizard from "./pages/Setup"; // Adjust path as needed

import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import { PrimeReactProvider } from 'primereact/api';
import { Provider } from "react-redux";
import { store } from "./store";
import "./index.css";

async function bootstrap() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");

  const currentWindow = getCurrentWindow();
  const label = currentWindow.label;

  const root = ReactDOM.createRoot(document.getElementById("root"));

  if (label === "setupwizard") {
    // Only render the SetupWizard in the setup window
    root.render(
      <Provider store={store}>
        <SetupWizard />
      </Provider>
    );
  } else {
    // Normal app in main window
    root.render(
      <Provider store={store}>
        <PrimeReactProvider>
          <App />
        </PrimeReactProvider>
      </Provider>
    );
  }
}

bootstrap();