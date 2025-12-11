import ReactDOM from "react-dom/client";
import App from "./App";

import 'primereact/resources/themes/lara-light-blue/theme.css'; // theme
import 'primereact/resources/primereact.min.css';               // core styles
import 'primeicons/primeicons.css';                             // icons
import 'primeflex/primeflex.css'; 
import { Provider } from "react-redux";
import { store } from "./store";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  // </React.StrictMode>,
);
