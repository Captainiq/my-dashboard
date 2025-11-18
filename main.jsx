import React, { useEffect, useState, useMemo } from "react";
// Dashboard.jsx - Default export React component
// Usage: place this inside a Create React App / Vite React project.
// TailwindCSS assumed available (no import needed in this file per project setup)
// Recharts is used for charts (npm install recharts)

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';

export default function Dashboard({
  spreadsheetId,
  apiKey,
  range = "Sheet1!A1:I",
  pollIntervalMs = 30000 // default 30s
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper: convert raw Google Sheets values to objects using header row
  const parseValues = (values) => {
    if (!values || values.length === 0) return [];
    const headers = values[0].map(h => String(h).trim());
    const data = values.slice(1).map(r => {
      const obj = {};
      for (let i=0;i<headers.length;i++) {
        obj[headers[i]] = r[i] !== undefined ? r[i] : "";
      }
      return obj;
    });
    return data;
  };

  // Fetch function using Sheets API v4 (public key or API key + sheet sharing)
  const fetchSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/$2PACX-1vSSoZqPMIYN4AENE9Aeia7sMoXBYxlxftHViPAcYZ3fe_iXmLhRS3kmUJNv2Dl96Q/values/${encodeURIComponent(range)}?key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const data = parseValues(json.values);
      setRows(data);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!spreadsheetId || !apiKey) return;
    fetchSheet();
    const t = setInterval(fetchSheet, pollIntervalMs);
    return () => clearInterval(t);
  }, [spreadsheetId, apiKey, range, pollIntervalMs]);

  // Derived metrics for charts
  const chartData = useMemo(() => {
    // Expecting columns: Company name, Symbol, Market cap, Revenue growth Percentage (YoY), Profit Growth Percentage (YoY), Margin Expansion, Which Sector this Company, Main Revenue Stream, Debt Reduced Or Not
    return rows.map(r => ({
      name: r['Company name'] || r['Company Name'] || r['Name'] || r['company'] || '—',
      marketCap: parseNumber(r['Market cap']),
      revenueGrowth: parsePercent(r['Revenue growth Percentage (YoY)']),
      profitGrowth: parsePercent(r['Profit Growth Percentage (YoY)']),
      marginExpansion: parsePercent(r['Margin Expansion']),
      sector: r['Which Sector this Company'] || r['Sector'] || 'Other',
      revenueStream: r['Main Revenue Stream'] || '',
      debtReduced: normalizeYesNo(r['Debt Reduced Or Not'])
    }));
  }, [rows]);

  function parseNumber(v) {
    if (!v && v !== 0) return 0;
    try {
      // remove commas, $ signs, B/M/T shorteners
      let s = String(v).replace(/[$,]/g, '').trim();
      // handle 1.2B / 450M etc
      const m = s.match(/^([0-9\.\-]+)\s*([bBmMtT])?$/);
      if (m) {
        let n = parseFloat(m[1]);
        const suf = (m[2] || '').toLowerCase();
        if (suf === 'b') n *= 1e9;
        if (suf === 'm') n *= 1e6;
        if (suf === 't') n *= 1e12;
        return n;
      }
      return parseFloat(s) || 0;
    } catch(e){ return 0; }
  }

  function parsePercent(v) {
    if (v === undefined || v === null || v === '') return 0;
    const s = String(v).replace('%','').trim();
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function normalizeYesNo(v) {
    if (!v) return 'Unknown';
    const s = String(v).toLowerCase();
    if (['yes','y','true','1','reduced','reduction'].some(x => s.includes(x))) return 'Yes';
    if (['no','n','false','0','unchanged'].some(x => s.includes(x))) return 'No';
    return s.charAt(0).toUpperCase()+s.slice(1);
  }

  // Small summary metrics
  const totals = useMemo(() => {
    const count = chartData.length;
    const avgRevenueGrowth = count ? (chartData.reduce((a,b)=>a+(b.revenueGrowth||0),0)/count) : 0;
    const avgProfitGrowth = count ? (chartData.reduce((a,b)=>a+(b.profitGrowth||0),0)/count) : 0;
    const sectors = {};
    chartData.forEach(d => { sectors[d.sector] = (sectors[d.sector]||0)+1; });
    return { count, avgRevenueGrowth, avgProfitGrowth, sectors };
  }, [chartData]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Company Metrics Dashboard</h1>
        <p className="text-sm text-gray-600">Connected to Google Sheet — auto-refresh every {Math.round(pollIntervalMs/1000)}s</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="col-span-1 md:col-span-1 p-4 bg-white rounded-2xl shadow">
          <h3 className="text-sm text-gray-500">Companies</h3>
          <div className="text-2xl font-semibold">{totals.count}</div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow">
          <h3 className="text-sm text-gray-500">Avg. Revenue Growth (YoY)</h3>
          <div className="text-2xl font-semibold">{totals.avgRevenueGrowth.toFixed(2)}%</div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow">
          <h3 className="text-sm text-gray-500">Avg. Profit Growth (YoY)</h3>
          <div className="text-2xl font-semibold">{totals.avgProfitGrowth.toFixed(2)}%</div>
        </div>
        <div className="p-4 bg-white rounded-2xl shadow">
          <h3 className="text-sm text-gray-500">Sectors</h3>
          <div className="text-lg">{Object.keys(totals.sectors).slice(0,3).map(s=> <span key={s} className="inline-block mr-2">{s} ({totals.sectors[s]})</span>)}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-white p-4 rounded-2xl shadow">
          <h2 className="font-semibold mb-2">Revenue vs Profit Growth</h2>
          <div style={{height:300}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide={chartData.length>10} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenueGrowth" name="Revenue %" barSize={20} />
                <Bar dataKey="profitGrowth" name="Profit %" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow">
          <h2 className="font-semibold mb-2">Margin Expansion (Top 5)</h2>
          <ul className="space-y-2">
            {chartData.sort((a,b)=>b.marginExpansion-a.marginExpansion).slice(0,5).map(d=> (
              <li key={d.name} className="p-2 border rounded"> 
                <div className="font-medium">{d.name}</div>
                <div className="text-sm text-gray-600">Margin Expansion: {d.marginExpansion}%</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white p-4 rounded-2xl shadow">
        <h2 className="font-semibold mb-3">Companies Table</h2>
        {loading && <div className="text-sm text-gray-500 mb-2">Refreshing data…</div>}
        {error && <div className="text-red-500 mb-2">Error: {error}</div>}
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-left">Market Cap</th>
                <th className="px-4 py-2 text-left">Revenue %</th>
                <th className="px-4 py-2 text-left">Profit %</th>
                <th className="px-4 py-2 text-left">Margin Exp.</th>
                <th className="px-4 py-2 text-left">Sector</th>
                <th className="px-4 py-2 text-left">Main Revenue Stream</th>
                <th className="px-4 py-2 text-left">Debt Reduced</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{r['Company name'] || r['Company Name'] || r['Name']}</td>
                  <td className="px-4 py-2">{r['Symbol']}</td>
                  <td className="px-4 py-2">{r['Market cap']}</td>
                  <td className="px-4 py-2">{r['Revenue growth Percentage (YoY)']}</td>
                  <td className="px-4 py-2">{r['Profit Growth Percentage (YoY)']}</td>
                  <td className="px-4 py-2">{r['Margin Expansion']}</td>
                  <td className="px-4 py-2">{r['Which Sector this Company']}</td>
                  <td className="px-4 py-2">{r['Main Revenue Stream']}</td>
                  <td className="px-4 py-2">{r['Debt Reduced Or Not']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-6 text-sm text-gray-500">Tip: To reduce delays, publish your sheet or grant viewer access and use an API key. For push updates, set up a Google Apps Script webhook (see README).</footer>
    </div>
  );
}

/*
README / Setup Instructions (copy into your project README.md)

1) Create React app & install deps
   npx create-vite@latest my-dashboard --template react
   cd my-dashboard
   npm install
   npm install recharts
   Setup Tailwind per Tailwind docs (or use your existing setup)

2) Obtain Google Sheets access method (choose one):

A) Quick & easy (no server): Publish or share sheet & use API key
   - Go to Google Cloud Console -> Create project
   - Enable "Google Sheets API" for the project
   - Create an API key (Credentials -> Create API Key)
   - In Google Sheets: File -> Share -> Anyone with link -> Viewer (or publish to web)
   - Take the spreadsheet ID from the URL: https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit
   - Use the Dashboard component props: <Dashboard spreadsheetId={SPREADSHEET_ID} apiKey={API_KEY} />
   - This reads the range you specify (default Sheet1!A1:I)
   - Note: This approach polls the API on an interval (default 30s) to pick up changes.

B) Secure / server-side proxy (recommended for private sheets)
   - Create an OAuth service account or OAuth client and a small server that calls the Sheets API with proper credentials.
   - Alternatively, write a Google Apps Script webapp that returns JSON (see C).

C) Push updates (real-time-ish) using Google Apps Script → your webhook
   - Create a new Apps Script bound to the spreadsheet (Extensions -> Apps Script)
   - Example Apps Script (doPost trigger when sheet edited):
     function onEdit(e){
       // Customize to send edited row or entire sheet
       const url = 'https://your-server.com/sheets-webhook';
       const payload = {
         range: e.range.getA1Notation(),
         values: e.range.getValues(),
         user: e.user
       };
       const options = { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload) };
       UrlFetchApp.fetch(url, options);
     }
   - On your server receive the webhook and broadcast to clients (via WebSocket or server-sent events) or update a cache endpoint the React app polls.

3) Fields mapping
   The component expects headers in the first row. Column names used in the component (case-sensitive) are:
     - Company name
     - Symbol
     - Market cap
     - Revenue growth Percentage (YoY)
     - Profit Growth Percentage (YoY)
     - Margin Expansion
     - Which Sector this Company
     - Main Revenue Stream
     - Debt Reduced Or Not
   If you use different header strings, either rename the sheet's headers or modify the parsing keys in Dashboard.jsx.

4) Deploy
   - Build for production: npm run build
   - Host on Vercel / Netlify / any static host
   - If using push webhooks, deploy the server endpoint (Heroku / Vercel Serverless / Fly / AWS)

Security notes:
 - If your sheet is private, don't use a public API key in client-side code. Use a server proxy or OAuth.
 - If you must use an API key in the client, restrict it to your domain in Google Cloud Console.

That's it — your dashboard will reflect sheet updates automatically via polling or you can wire up push updates for faster refresh.
*/
