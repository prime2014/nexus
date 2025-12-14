import ReactDOM from "react-dom/client";
import App from "./App";

import 'primereact/resources/themes/lara-light-blue/theme.css'; // theme
import 'primereact/resources/primereact.min.css';               // core styles
import 'primeicons/primeicons.css';                             // icons
import 'primeflex/primeflex.css'; 
import { PrimeReactProvider } from 'primereact/api';
import { Provider } from "react-redux";
import { store } from "./store";
import "./index.css";

//version 0.1.0
console.log("FORCING NEW BUILD HASH - REMOVE LATER");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
    <Provider store={store}>
      <PrimeReactProvider>
        <App />
      </PrimeReactProvider>
    </Provider>
  // </React.StrictMode>,
);
