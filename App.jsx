import React from 'react';
import Dashboard from './Dashboard';

function App() {
  const spreadsheetId = import.meta.env.VITE_SHEET_ID; // see .env below
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY; // see .env below

  return (
    <Dashboard
      spreadsheetId={spreadsheetId}
      apiKey={apiKey}
      range="Sheet1!A1:I"
      pollIntervalMs={30000}
    />
  );
}

export default App;
