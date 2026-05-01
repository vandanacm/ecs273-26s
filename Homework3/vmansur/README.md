# ECS 273 Homework 3 (React + TypeScript)

Interactive D3 dashboard for stock analytics with three linked views:

- View 1: OHLC time-series line chart with horizontal zoom + scroll
- View 2: t-SNE scatter plot with sector color, legend, highlight, zoom
- View 3: expandable news list for selected stock

## Expected Data Layout

Place your files under `data/`:

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

The app reads:

- `data/stockdata/*.csv` for OHLC time-series
- `data/stocknews/**/*.txt` for news
- `data/tsne.csv` (or `data/tsne*.csv`) for t-SNE points

## Run

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```
