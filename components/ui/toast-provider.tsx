"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1C1C1F",
          color: "#FFFFFF",
          border: "1px solid #2A2A2E",
          borderRadius: "12px",
          fontFamily: "Montserrat, sans-serif",
          fontSize: "14px",
        },
        success: {
          iconTheme: {
            primary: "#F9CA1F",
            secondary: "#0C0C0E",
          },
        },
        error: {
          iconTheme: {
            primary: "#EF4444",
            secondary: "#0C0C0E",
          },
        },
      }}
    />
  );
}
