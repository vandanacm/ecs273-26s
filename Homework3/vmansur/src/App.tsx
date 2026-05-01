
import { useState } from "react";

import LineChart from "./component/LineChart";
import NewsList from "./component/NewsList";
import RenderOptions from "./component/options";
import { STOCKS } from "./component/stocks";
import TSNEScatter from "./component/TSNEScatter";


export default function App() {
  const [selectedStock, setSelectedStock] = useState<string>(STOCKS[0]);

  return (
    <div className="flex flex-col h-full w-full">
      <header className="bg-gradient-to-r from-slate-800 via-indigo-800 to-violet-800 text-white p-3 flex flex-row items-center justify-between shadow-lg">
        <h2 className="text-left text-2xl font-semibold">Homework 3: D3 Stock Dashboard</h2>
        <label htmlFor="stock-select" className="mx-2">
          <span className="mr-2">Select stock:</span>
          <select
            id="stock-select"
            className="bg-white text-slate-900 p-2 rounded-lg mx-2 shadow-sm border border-slate-200"
            value={selectedStock}
            onChange={(event) => setSelectedStock(event.target.value)}
          >
              <RenderOptions />
          </select>
        </label>
      </header>
      <div className="flex flex-row h-full w-full">
        <div className="flex flex-col w-2/3">

          <div className="h-1/2 p-2">
            <h3 className="text-left text-xl text-slate-800 font-semibold">View 1: Stock Overview Line Chart</h3>
            <div className="border border-indigo-100 rounded-xl h-[calc(100%_-_2rem)] bg-white shadow-md">
              <LineChart selectedStock={selectedStock} />
            </div>
          </div>
          <div className="h-1/2 p-2">
            <h3 className="text-left text-xl h-[2rem] text-slate-800 font-semibold">View 2: t-SNE Scatter Plot</h3>
            <div className="border border-sky-100 rounded-xl h-[calc(100%_-_2rem)] bg-white shadow-md">
              <TSNEScatter selectedStock={selectedStock} onSelectStock={setSelectedStock} />
            </div>
          </div>
          
        </div>
        <div className="w-1/3 h-full p-2">
            <h3 className="text-left text-xl h-[2rem] text-slate-800 font-semibold">View 3: Recent News</h3>
            <div className="border border-slate-200 rounded-xl h-[calc(100%_-_2rem)] bg-slate-50 shadow-md">
              <NewsList selectedStock={selectedStock} />
            </div>
          </div>
        
      </div>
    </div>
    
  );
}
