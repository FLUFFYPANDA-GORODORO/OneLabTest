import React from "react";
import { Toaster } from "react-hot-toast";
import Dashboard from "./components/Dashboard";
import "./index.css";

function App() {
  return (
    <div className="w-full">
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#1e3a8a",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "14px",
            fontWeight: "500",
          },
          success: {
            style: {
              background: "#dbeafe",
              borderColor: "#1e3a8a",
            },
            iconTheme: {
              primary: "#1e3a8a",
              secondary: "#dbeafe",
            },
          },
          error: {
            style: {
              background: "#fee2e2",
              borderColor: "#1e3a8a",
              color: "#7f1d1d",
            },
            iconTheme: {
              primary: "#7f1d1d",
              secondary: "#fee2e2",
            },
          },
        }}
      />
      <Dashboard />
    </div>
  );
}

export default App;
