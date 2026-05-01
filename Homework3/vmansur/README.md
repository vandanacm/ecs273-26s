# ECS 273 Homework 3: D3 Stock Dashboard

This project is a React + TypeScript dashboard with linked visualizations for stock analysis.

It contains three coordinated views:

- View 1: OHLC time-series line chart (zoomable, tooltip, reset zoom)
- View 2: t-SNE scatter plot (sector color coding, zoom, tooltip, ticker labels, click-to-select)
- View 3: expandable news panel for the selected stock

Selecting a stock from the dropdown updates all views. Clicking a ticker in the scatter plot also updates the dropdown, line chart, and news panel.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Visualization: D3.js
- Styling: Tailwind CSS

## Prerequisites

Before running, make sure you have:

- Node.js 18+ (Node.js 20+ recommended)
- npm (comes with Node.js)

## Setup and Run Instructions (From Scratch)

### 1. Navigate to the project folder

```bash
cd "/Users/vmansur/MyDrive/Spring'26/ECS273/ecs273-26s/Homework3/vmansur"
```

### 2. Install required packages

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Open the app in browser

Vite will print a local URL in the terminal (usually):

```text
http://localhost:5173
```

## Production Build and Checks

### Build the project

```bash
npm run build
```

### Preview production build locally

```bash
npm run preview
```

### Run linter

```bash
npm run lint
```

## Data Layout

Place input files under `data/` in the following structure:

```text
data/
├── stockdata/
│   ├── AAPL.csv
│   ├── NVDA.csv
│   └── ...
├── stocknews/
│   ├── AAPL/
│   │   ├── <news-file>.txt
│   │   └── ...
│   └── ...
└── tsne.csv
```

Files used by the app:

- `data/stockdata/*.csv` for OHLC time-series data
- `data/stocknews/**/*.txt` for per-ticker news articles
- `data/tsne.csv` (or `data/tsne*.csv`) for t-SNE points

## Notes

- This submission is frontend-only and does not require a separate backend service.
- If `npm run dev` fails due to port conflict, Vite may choose another port automatically.
