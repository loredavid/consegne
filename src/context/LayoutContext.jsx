import React, { createContext, useState } from "react";

export const SidebarContext = createContext({ sidebarOpen: true, setSidebarOpen: () => {} });

export function SidebarProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}
