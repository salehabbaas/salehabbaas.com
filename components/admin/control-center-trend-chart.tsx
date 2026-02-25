"use client";

import { useEffect, useId, useState } from "react";

type TrendRow = { day: string; events: number; pageViews: number };

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function percentDelta(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function ControlCenterTrendChart({ rows }: { rows: TrendRow[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(Math.max(rows.length - 1, 0));
  const [showEvents, setShowEvents] = useState(true);
  const [showViews, setShowViews] = useState(true);
  const chartId = useId().replace(/:/g, "");

  useEffect(() => {
    setSelectedIndex(Math.max(rows.length - 1, 0));
  }, [rows.length]);

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6 text-sm text-muted-foreground">
        No visitor trend data yet.
      </div>
    );
  }

  const width = 1200;
  const height = 440;
  const paddingTop = 24;
  const paddingBottom = 58;
  const paddingLeft = 62;
  const paddingRight = 20;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(1, ...rows.map((item) => Math.max(item.events, item.pageViews)));
  const eventsTotal = rows.reduce((sum, row) => sum + row.events, 0);
  const pageViewsTotal = rows.reduce((sum, row) => sum + row.pageViews, 0);
  const avgEvents = Math.round(eventsTotal / rows.length);
  const avgPageViews = Math.round(pageViewsTotal / rows.length);

  const eventCoords = rows.map((row, index) => {
    const x = rows.length === 1 ? paddingLeft + chartWidth / 2 : paddingLeft + (index / (rows.length - 1)) * chartWidth;
    const y = paddingTop + (1 - row.events / maxValue) * chartHeight;
    return { x, y, value: row.events };
  });

  const pageViewCoords = rows.map((row, index) => {
    const x = rows.length === 1 ? paddingLeft + chartWidth / 2 : paddingLeft + (index / (rows.length - 1)) * chartWidth;
    const y = paddingTop + (1 - row.pageViews / maxValue) * chartHeight;
    return { x, y, value: row.pageViews };
  });

  function linePath(points: Array<{ x: number; y: number }>) {
    if (!points.length) return "";
    return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  }

  function areaPath(points: Array<{ x: number; y: number }>) {
    if (!points.length) return "";
    const line = linePath(points);
    const last = points[points.length - 1];
    const first = points[0];
    const baseline = paddingTop + chartHeight;
    return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }

  const activeIndex = hoveredIndex ?? selectedIndex;
  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), rows.length - 1);
  const activeRow = rows[safeActiveIndex];
  const prevRow = safeActiveIndex > 0 ? rows[safeActiveIndex - 1] : null;
  const eventDelta = prevRow ? percentDelta(activeRow.events, prevRow.events) : null;
  const viewsDelta = prevRow ? percentDelta(activeRow.pageViews, prevRow.pageViews) : null;
  const activeX = eventCoords[safeActiveIndex]?.x ?? paddingLeft;
  const activeEventY = eventCoords[safeActiveIndex]?.y ?? paddingTop + chartHeight;
  const activeViewY = pageViewCoords[safeActiveIndex]?.y ?? paddingTop + chartHeight;

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = Math.round(maxValue * (1 - ratio));
    const y = paddingTop + ratio * chartHeight;
    return { y, value };
  });

  const firstLabel = rows[0]?.day ?? "";
  const midLabel = rows[Math.floor(rows.length / 2)]?.day ?? "";
  const lastLabel = rows[rows.length - 1]?.day ?? "";
  const eventsAreaId = `${chartId}-events-area`;
  const viewsAreaId = `${chartId}-views-area`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Events (14d)</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{formatCount(eventsTotal)}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/70 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Page Views (14d)</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{formatCount(pageViewsTotal)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)/0.76),hsl(var(--card)/0.5))] p-2">
        <div className="h-[22rem] w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img" aria-label="Interactive visitor trend chart">
            <defs>
              <linearGradient id={eventsAreaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.32" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id={viewsAreaId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.28" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => (
              <g key={`tick-${tick.y}`}>
                <line x1={paddingLeft} x2={width - paddingRight} y1={tick.y} y2={tick.y} stroke="hsl(var(--border))" strokeOpacity="0.5" />
                <text x={paddingLeft - 10} y={tick.y + 4} textAnchor="end" fontSize="11" fill="hsl(var(--muted-foreground))">
                  {formatCount(tick.value)}
                </text>
              </g>
            ))}

            <line x1={paddingLeft} x2={width - paddingRight} y1={paddingTop + (1 - avgEvents / maxValue) * chartHeight} y2={paddingTop + (1 - avgEvents / maxValue) * chartHeight} stroke="hsl(var(--success))" strokeWidth="2" strokeDasharray="7 6" strokeOpacity="0.85" />
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={paddingTop + (1 - avgPageViews / maxValue) * chartHeight}
              y2={paddingTop + (1 - avgPageViews / maxValue) * chartHeight}
              stroke="hsl(var(--warning))"
              strokeWidth="2"
              strokeDasharray="7 6"
              strokeOpacity="0.85"
            />

            <line x1={activeX} x2={activeX} y1={paddingTop} y2={paddingTop + chartHeight} stroke="hsl(var(--foreground))" strokeOpacity="0.2" strokeDasharray="4 4" />

            {showViews ? <path d={areaPath(pageViewCoords)} fill={`url(#${viewsAreaId})`} className="transition-opacity duration-200" /> : null}
            {showEvents ? <path d={areaPath(eventCoords)} fill={`url(#${eventsAreaId})`} className="transition-opacity duration-200" /> : null}

            {showViews ? (
              <path d={linePath(pageViewCoords)} fill="none" stroke="hsl(var(--accent))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {showEvents ? (
              <path d={linePath(eventCoords)} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}

            {rows.map((row, index) => {
              const currentX = eventCoords[index].x;
              const prevX = eventCoords[index - 1]?.x ?? paddingLeft;
              const nextX = eventCoords[index + 1]?.x ?? width - paddingRight;
              const zoneStart = index === 0 ? paddingLeft : (currentX + prevX) / 2;
              const zoneEnd = index === rows.length - 1 ? width - paddingRight : (currentX + nextX) / 2;
              const isActive = index === safeActiveIndex;

              return (
                <g key={`zone-${row.day}-${index}`}>
                  <rect
                    x={zoneStart}
                    y={paddingTop}
                    width={Math.max(1, zoneEnd - zoneStart)}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${row.day}`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(index)}
                    onBlur={() => setHoveredIndex(null)}
                    onClick={() => setSelectedIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedIndex(index);
                      }
                    }}
                  />
                  {showEvents ? (
                    <circle cx={eventCoords[index].x} cy={eventCoords[index].y} r={isActive ? 5 : 3} fill="hsl(var(--primary))" className="transition-all duration-200" />
                  ) : null}
                  {showViews ? (
                    <circle cx={pageViewCoords[index].x} cy={pageViewCoords[index].y} r={isActive ? 5 : 3} fill="hsl(var(--accent))" className="transition-all duration-200" />
                  ) : null}
                </g>
              );
            })}

            {showEvents ? <text x={activeX + 10} y={activeEventY - 8} fontSize="11" fill="hsl(var(--foreground))">{formatCount(activeRow.events)}</text> : null}
            {showViews ? <text x={activeX + 10} y={activeViewY + 16} fontSize="11" fill="hsl(var(--foreground))">{formatCount(activeRow.pageViews)}</text> : null}
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{firstLabel}</span>
        <span>{midLabel}</span>
        <span>{lastLabel}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
            showEvents ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-card/70 text-muted-foreground"
          }`}
          onClick={() => setShowEvents((prev) => (showViews ? !prev : true))}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          Events
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
            showViews ? "border-accent/40 bg-accent/10 text-accent" : "border-border/60 bg-card/70 text-muted-foreground"
          }`}
          onClick={() => setShowViews((prev) => (showEvents ? !prev : true))}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          Page views
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border border-success/35 bg-success/10 px-3 py-1.5 text-success">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          Avg events {formatCount(avgEvents)}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-warning/35 bg-warning/10 px-3 py-1.5 text-warning">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" />
          Avg views {formatCount(avgPageViews)}
        </span>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/65 p-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Selected Day</p>
          <p className="mt-1 text-sm font-semibold">{activeRow.day}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Events</p>
          <p className="mt-1 text-sm font-semibold">
            {formatCount(activeRow.events)}
            {eventDelta !== null ? (
              <span className={`ml-2 text-xs ${eventDelta >= 0 ? "text-success" : "text-destructive"}`}>{eventDelta >= 0 ? "+" : ""}{eventDelta}%</span>
            ) : null}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Page Views</p>
          <p className="mt-1 text-sm font-semibold">
            {formatCount(activeRow.pageViews)}
            {viewsDelta !== null ? (
              <span className={`ml-2 text-xs ${viewsDelta >= 0 ? "text-success" : "text-destructive"}`}>{viewsDelta >= 0 ? "+" : ""}{viewsDelta}%</span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
