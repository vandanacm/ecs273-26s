import * as d3 from "d3";
import debounce from "lodash/debounce";
import { useEffect, useRef, useState } from "react";

import { getStockDataByTicker } from "./dataLoader";
import { StockCandle } from "../types";

const margin = { top: 24, right: 28, bottom: 0, left: 64 };
const axisTextColor = "#334155";
const axisLineColor = "#94a3b8";
const axisDomainColor = "#64748b";

const lineDefs = [
  { key: "open", label: "Open", color: "#3b82f6" },
  { key: "high", label: "High", color: "#f97316" },
  { key: "low", label: "Low", color: "#14b8a6" },
  { key: "close", label: "Close", color: "#a855f7" },
] as const;

interface LineChartProps {
  selectedStock: string;
  alignToNewsWindow: boolean;
  newsDateRange: { start: string; end: string } | null;
}

export default function LineChart({
  selectedStock,
  alignToNewsWindow,
  newsDateRange,
}: LineChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [series, setSeries] = useState<StockCandle[]>([]);

  useEffect(() => {
    let isActive = true;
    getStockDataByTicker(selectedStock).then((nextSeries) => {
      if (isActive) {
        setSeries(nextSeries);
      }
    });
    return () => {
      isActive = false;
    };
  }, [selectedStock]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) {
      return;
    }

    const draw = () => {
      if (!containerRef.current || !svgRef.current) {
        return;
      }
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width <= 0 || height <= 0) {
        return;
      }
      zoomBehaviorRef.current = drawChart(
        svgRef.current,
        tooltipRef.current,
        series,
        width,
        height,
        selectedStock,
        alignToNewsWindow,
        newsDateRange,
      );
    };

    const observer = new ResizeObserver(debounce(draw, 120));
    observer.observe(containerRef.current);
    draw();

    return () => observer.disconnect();
  }, [series, selectedStock, alignToNewsWindow, newsDateRange]);

  const resetZoom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    if (!svgRef.current || !zoomBehaviorRef.current) {
      return;
    }
    d3.select(svgRef.current).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-3 py-2">
        <h4 className="truncate text-base font-semibold text-slate-800">
          {selectedStock} OHLC Time Series
        </h4>
        <button
          type="button"
          onClick={resetZoom}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm"
        >
          Reset Zoom
        </button>
      </div>
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-x-auto">
        <div
          ref={containerRef}
          className="relative h-full"
          style={{
            minWidth: `${Math.max(760, series.length * 9)}px`,
          }}
        >
          <svg ref={svgRef} className="h-full w-full" />
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute z-20 hidden rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-xs text-slate-700 shadow"
          />
        </div>
      </div>
    </div>
  );
}

function drawChart(
  svgElement: SVGSVGElement,
  tooltipElement: HTMLDivElement | null,
  series: StockCandle[],
  width: number,
  height: number,
  selectedStock: string,
  alignToNewsWindow: boolean,
  newsDateRange: { start: string; end: string } | null,
): d3.ZoomBehavior<SVGSVGElement, unknown> | null {
  const svg = d3.select(svgElement);
  svg.selectAll("*").remove();
  if (tooltipElement) {
    tooltipElement.style.display = "none";
  }

  if (series.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .text(`No stock CSV found for ${selectedStock}.`);
    return null;
  }

  const displaySeries = getDisplaySeries(series, alignToNewsWindow, newsDateRange);
  if (displaySeries.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .text(`No overlapping points in news window for ${selectedStock}.`);
    return null;
  }

  const x = d3
    .scaleTime()
    .domain(d3.extent(displaySeries, (d) => d.date) as [Date, Date])
    .range([margin.left, width - margin.right]);

  const yMin = d3.min(displaySeries, (d) => d.low) ?? 0;
  const yMax = d3.max(displaySeries, (d) => d.high) ?? 0;
  const brushH = 16;
  /** Space reserved below plot: tick labels, axis title, gaps, brush, hint line (prevents Date overlapping brush). */
  const xTickDepth = 20;
  const gapAfterTicks = 4;
  const dateTitleHeight = 14;
  const gapBeforeBrush = 10;
  const gapAfterBrush = 12;
  const hintBand = 22;
  const belowPlot =
    xTickDepth + gapAfterTicks + dateTitleHeight + gapBeforeBrush + brushH + gapAfterBrush + hintBand;
  const plotBottomY = height - belowPlot;
  const dateLabelY = plotBottomY + xTickDepth + gapAfterTicks + dateTitleHeight / 2;
  const brushTopY = plotBottomY + xTickDepth + gapAfterTicks + dateTitleHeight + gapBeforeBrush;
  const hintTextY = brushTopY + brushH + gapAfterBrush;

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = plotBottomY - margin.top;
  const plotLeft = margin.left;
  const plotRight = width - margin.right;

  const y = d3
    .scaleLinear()
    .domain([yMin * 0.98, yMax * 1.02])
    .nice()
    .range([plotBottomY, margin.top]);

  const defs = svg.append("defs");
  const bgGradientId = `line-bg-${selectedStock}`;
  const closeGradientId = `close-fill-${selectedStock}`;
  const glowFilterId = `line-glow-${selectedStock}`;
  const clipPathId = `line-clip-${selectedStock}`;

  const bgGradient = defs
    .append("linearGradient")
    .attr("id", bgGradientId)
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "0%")
    .attr("y2", "100%");
  bgGradient.append("stop").attr("offset", "0%").attr("stop-color", "#eff6ff");
  bgGradient.append("stop").attr("offset", "100%").attr("stop-color", "#f8fafc");

  const closeGradient = defs
    .append("linearGradient")
    .attr("id", closeGradientId)
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "0%")
    .attr("y2", "100%");
  closeGradient.append("stop").attr("offset", "0%").attr("stop-color", "#c084fc").attr("stop-opacity", 0.45);
  closeGradient.append("stop").attr("offset", "100%").attr("stop-color", "#f5d0fe").attr("stop-opacity", 0.05);

  const glow = defs.append("filter").attr("id", glowFilterId);
  glow
    .append("feDropShadow")
    .attr("dx", 0)
    .attr("dy", 0)
    .attr("stdDeviation", 2.5)
    .attr("flood-color", "#a855f7")
    .attr("flood-opacity", 0.35);

  defs
    .append("clipPath")
    .attr("id", clipPathId)
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", plotWidth)
    .attr("height", plotHeight);

  svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", plotWidth)
    .attr("height", plotHeight)
    .attr("rx", 12)
    .attr("fill", `url(#${bgGradientId})`);

  const yGrid = d3
    .axisLeft(y)
    .ticks(6)
    .tickSize(-plotWidth)
    .tickFormat(() => "");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yGrid)
    .call((g) => g.select(".domain").remove())
    .selectAll("line")
    .attr("stroke", "#cbd5e1")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-dasharray", "3,5");

  const xAxisGroup = svg
    .append("g")
    .attr("transform", `translate(0,${plotBottomY})`)
    .call(d3.axisBottom(x).ticks(Math.min(10, displaySeries.length / 15)).tickSizeOuter(0));

  const yAxisGroup = svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6));

  styleAxis(xAxisGroup);
  styleAxis(yAxisGroup);

  svg
    .append("g")
    .attr("class", "x-axis-date-label")
    .attr("transform", `translate(${width / 2}, ${dateLabelY})`)
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "#0f172a")
    .style("font-size", "12px")
    .style("font-weight", "600")
    .text("Date");

  yAxisGroup
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(height / 2))
    .attr("y", -44)
    .attr("fill", "#0f172a")
    .attr("text-anchor", "middle")
    .text("Price (USD)");

  const plotGroup = svg.append("g").attr("clip-path", `url(#${clipPathId})`);
  let currentXScale = x;

  plotGroup
    .append("path")
    .datum(displaySeries)
    .attr("class", "area-close-fill")
    .attr("fill", `url(#${closeGradientId})`)
    .attr("opacity", 0);

  const drawAreaFill = (xScale: d3.ScaleTime<number, number>) => {
    const areaGen = d3
      .area<StockCandle>()
      .x((d) => xScale(d.date))
      .y0(plotBottomY)
      .y1((d) => y(d.close))
      .curve(d3.curveMonotoneX);
    plotGroup.select<SVGPathElement>(".area-close-fill").datum(displaySeries).attr("d", areaGen);
  };

  const drawLines = (xScale: d3.ScaleTime<number, number>) => {
    for (const line of lineDefs) {
      const generator = d3
        .line<StockCandle>()
        .x((d) => xScale(d.date))
        .y((d) => y(d[line.key]))
        .curve(d3.curveMonotoneX);
      const path = plotGroup.selectAll(`path.line-${line.key}`).data([displaySeries]);
      path
        .join("path")
        .attr("class", `line-${line.key}`)
        .attr("fill", "none")
        .attr("stroke", line.color)
        .attr("stroke-width", line.key === "close" ? 2.7 : 2.1)
        .attr("stroke-linecap", "round")
        .attr("filter", line.key === "close" ? `url(#${glowFilterId})` : null)
        .attr("d", generator);
    }
  };

  drawLines(x);
  drawAreaFill(x);
  plotGroup
    .select(".area-close-fill")
    .transition()
    .duration(280)
    .ease(d3.easeCubicOut)
    .attr("opacity", 1);

  const bisectDate = d3.bisector((d: StockCandle) => d.date).center;
  svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", plotWidth)
    .attr("height", plotHeight)
    .attr("fill", "transparent")
    .on("mouseenter mousemove", (event) => {
      if (!tooltipElement) {
        return;
      }
      const [mouseX, mouseY] = d3.pointer(event, svgElement);
      const hoveredDate = currentXScale.invert(mouseX);
      const idx = bisectDate(displaySeries, hoveredDate, 0, displaySeries.length - 1);
      const point = displaySeries[idx];
      if (!point) {
        return;
      }
      tooltipElement.style.display = "block";
      tooltipElement.style.left = `${mouseX + 14}px`;
      tooltipElement.style.top = `${mouseY + 14}px`;
      tooltipElement.innerHTML = `
        <div class="font-semibold text-slate-800">${selectedStock} - ${d3.timeFormat("%Y-%m-%d")(point.date)}</div>
        <div>Open: ${point.open.toFixed(2)} | High: ${point.high.toFixed(2)}</div>
        <div>Low: ${point.low.toFixed(2)} | Close: ${point.close.toFixed(2)}</div>
        <div>Volume: ${point.volume.toLocaleString()}</div>
      `;
    })
    .on("mouseleave", () => {
      if (tooltipElement) {
        tooltipElement.style.display = "none";
      }
    });

  const legend = svg
    .append("g")
    .attr("transform", `translate(${margin.left + 8},${margin.top + 4})`);

  lineDefs.forEach((line, idx) => {
    const row = legend.append("g").attr("transform", `translate(0, ${idx * 18})`);
    row
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", line.color)
      .attr("stroke-width", 2.5);
    row
      .append("text")
      .attr("x", 26)
      .attr("y", 4)
      .attr("fill", "#1e293b")
      .style("font-size", "12px")
      .text(line.label);
  });

  /** True while brush.move is driven by zoom — ignore brush "end" (must not re-apply zoom). */
  let brushSyncFromZoom = false;

  const brush = d3
    .brushX()
    .extent([
      [plotLeft, 0],
      [plotRight, brushH],
    ]);

  const brushG = svg
    .append("g")
    .attr("class", "line-x-brush")
    .attr("transform", `translate(0, ${brushTopY})`)
    .call(brush);

  const zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 20])
    .filter((event) => {
      if ((event.target as Element | null)?.closest?.(".line-x-brush")) {
        return false;
      }
      if (event.type !== "wheel") {
        return false;
      }
      return !(event as WheelEvent).ctrlKey;
    })
    .translateExtent([
      [margin.left, 0],
      [width - margin.right, height],
    ])
    .extent([
      [plotLeft, margin.top],
      [plotRight, plotBottomY],
    ])
    .on("zoom", (event) => {
      const newX = event.transform.rescaleX(x);
      currentXScale = newX;
      xAxisGroup.call(
        d3
          .axisBottom(newX)
          .ticks(Math.min(10, displaySeries.length / 15))
          .tickSizeOuter(0),
      );
      styleAxis(xAxisGroup);
      drawLines(newX);
      drawAreaFill(newX);
      const d0 = newX.invert(plotLeft);
      const d1 = newX.invert(plotRight);
      brushSyncFromZoom = true;
      try {
        brushG.call(brush.move, [x(d0), x(d1)]);
      } finally {
        brushSyncFromZoom = false;
      }
    });

  brush.on("end", (event: d3.D3BrushEvent<unknown>) => {
    if (brushSyncFromZoom) {
      return;
    }
    if (!event.selection || !event.sourceEvent) {
      return;
    }
    const s = event.selection as [number, number];
    const w = s[1] - s[0];
    if (w < 6) {
      return;
    }
    const k = plotWidth / w;
    d3.select(svgElement)
      .transition()
      .duration(380)
      .ease(d3.easeCubicOut)
      .call(zoomBehavior.transform, d3.zoomIdentity.translate(plotLeft, 0).scale(k).translate(-s[0], 0));
  });

  brushG.call(brush.move, [plotLeft, plotRight]);
  brushG.selectAll(".selection").attr("fill", "rgba(37, 99, 235, 0.14)").attr("stroke", "#3b82f6");
  brushG.selectAll(".handle").attr("fill", "#64748b");

  svg
    .append("text")
    .attr("x", plotLeft)
    .attr("y", hintTextY)
    .attr("fill", "#64748b")
    .style("font-size", "10px")
    .text("Brush: drag range to zoom that period. Chart: mouse wheel zooms time (no drag-pan). Scroll bar pans wide charts.");

  xAxisGroup.raise();
  yAxisGroup.raise();
  svg.select(".x-axis-date-label").raise();
  brushG.raise();
  svg.call(zoomBehavior);
  return zoomBehavior;
}

function getDisplaySeries(
  series: StockCandle[],
  alignToNewsWindow: boolean,
  newsDateRange: { start: string; end: string } | null,
): StockCandle[] {
  if (!alignToNewsWindow || !newsDateRange) {
    return series;
  }

  const startMs = new Date(`${newsDateRange.start}T00:00:00`).getTime();
  const endMs = new Date(`${newsDateRange.end}T23:59:59`).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return series;
  }

  return series.filter((row) => {
    const dateMs = row.date.getTime();
    return dateMs >= startMs && dateMs <= endMs;
  });
}

function styleAxis(axisGroup: d3.Selection<SVGGElement, unknown, null, undefined>) {
  axisGroup.select(".domain").attr("stroke", axisDomainColor);
  axisGroup.selectAll("line").attr("stroke", axisLineColor);
  axisGroup.selectAll("text").attr("fill", axisTextColor);
}
