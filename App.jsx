import React from 'react';
import Dashboard from './Dashboard';

function App() {
  const spreadsheetId = import.meta.env.VITE_SHEET_ID; // see .env below
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY; // see .env below

  return (
    <Dashboard
      spreadsheetId={2PACX-1vSSoZqPMIYN4AENE9Aeia7sMoXBYxlxftHViPAcYZ3fe_iXmLhRS3kmUJNv2Dl96Q}
      apiKey={921758913714-pbvqk1fqvu55k6klnlnst84ret46p5kr.apps.googleusercontent.com}
      range="Sheet1!A1:I"
      pollIntervalMs={30000}
    />
  );
}

export default App;
