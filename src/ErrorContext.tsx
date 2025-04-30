import React, { createContext, useContext, useState } from "react";

// Create context
const ErrorContext = createContext<any>(null);

// Provider component
export const ErrorProvider = ({ children }: { children: React.ReactNode }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <ErrorContext.Provider value={{ errorMessage, setErrorMessage }}>
      {children}
    </ErrorContext.Provider>
  );
};

// Custom hook to use the context
export const useError = () => {
  return useContext(ErrorContext);
};
