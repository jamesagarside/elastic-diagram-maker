import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";

// Import EUI themes and styles
import "@elastic/eui/dist/eui_theme_light.css";
// Import our custom icon registrations
import "./assets/eui-icons";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
