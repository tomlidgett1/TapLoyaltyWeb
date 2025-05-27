"use client"

import { useState, useEffect, useRef, Fragment } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, getDoc, doc } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  BarChartIcon, 
  LineChartIcon, 
  PieChartIcon,
  Loader2, 
  Clock,
  DollarSign,
  Activity,
  Info,
  Send,
  ArrowDown,
  ArrowUp,
  Code,
  Table as TableIcon,
  Terminal,
  Database
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/components/dashboard-layout"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getFunctions, httpsCallable } from "firebase/functions"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Smooth transition styles
const transitionStyles = `
  .smooth-appear {
    animation: smoothAppear 0.3s ease-out forwards;
  }
  
  @keyframes smoothAppear {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .scale-in {
    animation: scaleIn 0.3s ease-out forwards;
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .insight-result {
    animation: gentleFadeIn 0.6s ease-out forwards;
  }
  
  @keyframes gentleFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  .insight-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .insight-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: rgba(203, 213, 225, 0.3) transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(203, 213, 225, 0.3);
    border-radius: 20px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: rgba(203, 213, 225, 0.5);
  }
  
  /* Metallic text animation */
  .thinking-text {
    background-image: linear-gradient(
      90deg, 
      #333, #555, #777, #555, #333
    );
    background-size: 400% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: metallic-shine 4s linear infinite;
    text-shadow: 0px 0px 1px rgba(0,0,0,0.1);
    font-weight: 600;
  }
  
  @keyframes metallic-shine {
    0% { background-position: 0% 0; }
    100% { background-position: 100% 0; }
  }
  
  .thinking-state {
    animation: fadeInOut 3s ease-in-out;
    transition: opacity 0.8s ease, transform 0.5s ease;
  }
  
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(5px); }
    15% { opacity: 1; transform: translateY(0); }
    85% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-5px); }
  }
  
  /* Custom chart styles */
  .chart-container {
    width: 100%;
    height: 100%;
    min-height: 250px;
    position: relative;
    overflow: hidden;
  }
  
  /* Bar chart styling */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    height: 250px;
    width: 100%;
    padding: 2rem 0 1rem 0;
    gap: 12px;
    border-bottom: 1px solid #e5e7eb;
    position: relative;
  }
  
  .bar {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: height 0.5s ease;
    height: 100%;
    justify-content: flex-end;
  }
  
  .bar-value {
    width: 100%;
    background-color: #3b82f6;
    border-radius: 4px 4px 0 0;
    opacity: 0.9;
    transition: height 0.5s ease-out;
    min-height: 4px;
    position: relative;
  }
  
  .bar-label {
    margin-top: 8px;
    font-size: 12px;
    color: #64748b;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    padding: 0 4px;
  }
  
  .bar-value-label {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    font-weight: 500;
    color: #4b5563;
    white-space: nowrap;
    background-color: rgba(255, 255, 255, 0.7);
    padding: 2px 4px;
    border-radius: 4px;
    z-index: 5;
  }
  
  /* Y-axis lines for the bar chart */
  .bar-chart-grid {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 0;
  }
  
  .bar-chart-grid-line {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 1px dashed #e5e7eb;
  }
  
  .bar-chart-grid-label {
    position: absolute;
    left: -5px;
    transform: translateY(-50%);
    font-size: 10px;
    color: #9ca3af;
  }
  
  /* Line chart styling */
  .line-chart {
    height: 250px;
    width: 100%;
    position: relative;
    padding: 1rem 0;
    margin-left: 50px; /* Add space for y-axis */
    margin-bottom: 30px; /* Add space for x-axis labels */
  }
  
  .line-chart-path {
    stroke: #3b82f6;
    stroke-width: 2.5;
    fill: none;
    stroke-linecap: round;
    filter: drop-shadow(0 1px 2px rgba(59, 130, 246, 0.3));
  }
  
  .line-chart-area {
    fill: url(#line-chart-gradient);
    opacity: 0.2;
  }
  
  .line-chart-dot {
    fill: #3b82f6;
    stroke: white;
    stroke-width: 2;
  }
  
  /* Y-axis styling */
  .y-axis {
    position: absolute;
    left: -50px;
    top: 0;
    bottom: 0;
    width: 50px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px 0;
  }
  
  .y-axis-label {
    font-size: 10px;
    color: #6b7280;
    text-align: right;
    padding-right: 8px;
    transform: translateY(50%);
  }
  
  .y-axis-title {
    position: absolute;
    left: -40px;
    top: 50%;
    transform: rotate(-90deg) translateX(50%);
    transform-origin: left center;
    font-size: 12px;
    font-weight: 500;
    color: #4b5563;
    white-space: nowrap;
  }
  
  .x-axis {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -30px;
    height: 30px;
  }
  
  .x-axis-label {
    position: absolute;
    font-size: 10px;
    color: #6b7280;
    transform: translateX(-50%);
    text-align: center;
    max-width: 60px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .x-axis-title {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    font-weight: 500;
    color: #4b5563;
  }
  
  /* Grid lines */
  .chart-grid-line {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 1px dashed #e5e7eb;
    z-index: 0;
  }
  
  /* Pie chart styling */
  .pie-chart {
    width: 220px;
    height: 220px;
    margin: 0 auto;
    position: relative;
  }
  
  .pie-slice {
    transition: transform 0.2s;
  }
  
  .pie-slice:hover {
    transform: translateX(5px) translateY(-5px);
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
  
  .legend-label {
    font-size: 12px;
    color: #64748b;
  }
  
  /* Key figures styles */
  .key-figures {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 16px;
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
  }
  
  .key-figure {
    background-color: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 12px;
    min-width: 140px;
  }
  
  .key-figure-label {
    font-size: 12px;
    color: #64748b;
  }
  
  .key-figure-value {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
  }
  
  /* SQL Query display */
  .sql-query {
    position: relative;
    background-color: #1e293b;
    color: #e2e8f0;
    border-radius: 6px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .sql-query pre {
    padding: 12px;
    margin: 0;
  }
  
  .sql-toggle {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(30, 41, 59, 0.5);
    color: #e2e8f0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    cursor: pointer;
  }
  
  /* Table styling */
  .insight-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  
  .insight-table th {
    text-align: left;
    padding: 10px;
    border-bottom: 1px solid #e5e7eb;
    color: #64748b;
    font-weight: 500;
  }
  
  .insight-table td {
    padding: 10px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .insight-table tr:last-child td {
    border-bottom: none;
  }
  
  /* Stat changes */
  .stat-up {
    color: #10b981;
  }
  
  .stat-down {
    color: #ef4444;
  }
  
  /* GitHub-inspired tab navigation styles */
  .github-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 1rem;
    padding-bottom: 0;
  }
  
  .github-tab {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
    border: none;
    background: transparent;
    color: #64748b;
    font-weight: 500;
    cursor: pointer;
    position: relative;
    margin-bottom: -1px;
  }
  
  .github-tab:hover {
    color: #0f172a;
  }
  
  .github-tab.active {
    font-weight: 600;
    color: #0f172a;
  }
  
  .github-tab.active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background-color: #fd8c73;
    border-radius: 1px;
  }
`;

// Type definitions
interface InsightResponse {
  sql?: string;
  summary?: string;
  answer?: string;
  rows?: any[];
  viz?: {
    type: string;
    xField?: string;
    yField?: string;
    zField?: string;
    series?: string;
    columns?: string[];
  };
  keyFigures?: Record<string, any>;
  table?: {
    columns: string[];
    rows: any[][];
  };
  followUpQuestions?: string[];
  debug?: {
    sql?: string;
    rowCount?: number;
  };
}

interface InsightState {
  query: string;
  response: InsightResponse | null;
  isLoading: boolean;
  error: string | null;
  showSql: boolean;
}

// Chart Components
const BarChartViz = ({ data, xField, yField, series }: { data: any[], xField: string, yField: string, series?: string }) => {
  if (!data || data.length === 0) return <div>No data available</div>;
  
  const max = Math.max(...data.map(d => d[yField])) * 1.1;
  const hasSeriesData = series && data.some(d => d[series] !== undefined);
  
  // Generate grid lines for better readability
  const gridLines = [];
  const gridLineCount = 5;
  for (let i = 0; i <= gridLineCount; i++) {
    const value = max * (i / gridLineCount);
    const positionPercent = 100 - (i / gridLineCount * 100);
    gridLines.push(
      <div key={i} className="bar-chart-grid-line" style={{ top: `${positionPercent}%` }}>
        <span className="bar-chart-grid-label">${Math.round(value).toLocaleString()}</span>
      </div>
    );
  }
  
  return (
    <div className="chart-container pb-4 overflow-visible">
      <div className="bar-chart">
        <div className="bar-chart-grid">
          {gridLines}
        </div>
        
        {data.map((item, index) => {
          const heightPercent = (item[yField] / max * 100);
          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bar">
                    <div 
                      className="bar-value relative" 
                      style={{ 
                        height: `${heightPercent}%`,
                        backgroundColor: hasSeriesData ? getColorForValue(item[series], index) : '#3b82f6'
                      }} 
                    >
                      <div className="bar-value-label">
                        ${Math.round(item[yField]).toLocaleString()}
                      </div>
                      
                      {/* Show number of purchases as a badge if series data exists */}
                      {hasSeriesData && (
                        <div className="absolute -top-3 -right-3 bg-white border border-gray-200 rounded-full h-6 w-6 flex items-center justify-center text-xs shadow-sm">
                          {item[series]}
                        </div>
                      )}
                    </div>
                    <div className="bar-label">{item[xField]}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 text-xs">
                  <div className="font-medium">{item[xField]}</div>
                  <div className="mt-1">${item[yField].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  {hasSeriesData && (
                    <div className="mt-1 text-gray-500">Purchases: {item[series]}</div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to get bar colors based on series value
const getColorForValue = (value: number, index: number): string => {
  // If all values are the same, use standard colors
  if (value === 1) return '#3b82f6'; // Default blue
  
  // For varying values, use different color intensities
  const baseColors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#f43f5e', // Rose
    '#0ea5e9', // Sky
  ];
  
  // Use index for base color, then adjust intensity based on value
  const baseColor = baseColors[index % baseColors.length];
  
  // For higher values, use more intense colors
  if (value > 5) return baseColor;
  if (value > 3) return adjustColorBrightness(baseColor, -10);
  if (value > 1) return adjustColorBrightness(baseColor, -20);
  return adjustColorBrightness(baseColor, -30);
};

// Helper to adjust color brightness
const adjustColorBrightness = (hex: string, percent: number): string => {
  // Convert hex to RGB
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  
  // Adjust brightness
  r = Math.min(255, Math.max(0, r + percent));
  g = Math.min(255, Math.max(0, g + percent));
  b = Math.min(255, Math.max(0, b + percent));
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const LineChartViz = ({ data, xField, yField }: { data: any[], xField: string, yField: string }) => {
  if (!data || data.length === 0) return <div>No data available</div>;
  
  const height = 250;
  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  
  const max = Math.max(...data.map(d => d[yField])) * 1.1;
  const min = Math.min(...data.map(d => d[yField])) * 0.9;
  
  // Format the min/max values for display
  const formatValue = (val: number) => {
    return val >= 1000 ? 
      `$${(val/1000).toFixed(1)}K` : 
      `$${val.toFixed(0)}`;
  };
  
  // Generate Y-axis labels
  const yAxisLabels = [];
  const yAxisLineCount = 5;
  for (let i = 0; i <= yAxisLineCount; i++) {
    const value = min + ((max - min) * (i / yAxisLineCount));
    const positionPercent = 100 - (i / yAxisLineCount * 100);
    
    yAxisLabels.push(
      <Fragment key={`y-${i}`}>
        <div className="y-axis-label" style={{ bottom: `${positionPercent}%` }}>
          {formatValue(value)}
        </div>
        <div 
          className="chart-grid-line" 
          style={{ 
            bottom: `${positionPercent}%`,
            opacity: i === 0 ? 0 : 0.5 // Hide the bottom grid line
          }} 
        />
      </Fragment>
    );
  }
  
  const xScale = (index: number) => (index / (data.length - 1)) * (width - padding.left - padding.right) + padding.left;
  const yScale = (value: number) => height - padding.bottom - ((value - min) / (max - min)) * (height - padding.top - padding.bottom);
  
  // Generate path
  let path = '';
  let areaPath = '';
  
  data.forEach((point, index) => {
    const x = xScale(index);
    const y = yScale(point[yField]);
    
    if (index === 0) {
      path += `M ${x},${y}`;
      areaPath += `M ${x},${height - padding.bottom} L ${x},${y}`;
    } else {
      path += ` L ${x},${y}`;
      areaPath += ` L ${x},${y}`;
    }
  });
  
  areaPath += ` L ${xScale(data.length - 1)},${height - padding.bottom} Z`;
  
  // Generate x-axis labels (handle dates properly)
  const xAxisLabels = data.map((point, index) => {
    // Try to detect if the x value is a date and format accordingly
    let formattedXValue = point[xField];
    
    // Check if it's a date string and format it nicely
    if (typeof formattedXValue === 'string' && 
        (formattedXValue.includes('-') || formattedXValue.includes('/'))) {
      try {
        const date = new Date(formattedXValue);
        if (!isNaN(date.getTime())) {
          // Format as MMM YYYY for full dates
          formattedXValue = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }
      } catch (e) {
        // Keep original format if parsing fails
      }
    }
    
    return (
      <div 
        key={`x-${index}`} 
        className="x-axis-label" 
        style={{ 
          left: `${xScale(index)}px`,
          bottom: '5px'
        }}
      >
        {formattedXValue}
      </div>
    );
  });
  
  // Infer axis titles from field names
  const yAxisTitle = yField
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase());
  
  const xAxisTitle = xField
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase());
  
  return (
    <div className="chart-container relative pb-8">
      {/* Y-axis */}
      <div className="y-axis">
        {yAxisLabels}
        <div className="y-axis-title">{yAxisTitle}</div>
      </div>
      
      <div className="line-chart">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="line-chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d={areaPath} className="line-chart-area" />
          <path d={path} className="line-chart-path" />
          
          {data.map((point, index) => (
            <g key={index}>
              <circle 
                cx={xScale(index)} 
                cy={yScale(point[yField])} 
                r="4" 
                className="line-chart-dot" 
              />
            </g>
          ))}
        </svg>
      </div>
      
      {/* X-axis */}
      <div className="x-axis">
        {xAxisLabels}
        <div className="x-axis-title">{xAxisTitle}</div>
      </div>
    </div>
  );
};

const PieChartViz = ({ data, xField, yField, isDonut }: { data: any[], xField: string, yField: string, isDonut: boolean }) => {
  if (!data || data.length === 0) return <div>No data available</div>;
  
  const total = data.reduce((sum, item) => sum + item[yField], 0);
  let currentAngle = 0;
  
  // Pie chart colors
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#6366f1", // indigo
    "#ec4899", // pink
    "#8b5cf6", // purple
    "#f43f5e", // rose
    "#0ea5e9", // sky
  ];
  
  return (
    <div className="flex flex-wrap items-center justify-center">
      <div className="pie-chart">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          {data.map((item, index) => {
            const percentage = item[yField] / total;
            const angle = percentage * 360;
            
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;
            
            const startAngleRad = (startAngle - 90) * (Math.PI / 180);
            const endAngleRad = (endAngle - 90) * (Math.PI / 180);
            
            const x1 = 50 + 50 * Math.cos(startAngleRad);
            const y1 = 50 + 50 * Math.sin(startAngleRad);
            const x2 = 50 + 50 * Math.cos(endAngleRad);
            const y2 = 50 + 50 * Math.sin(endAngleRad);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 50,50`,
              `L ${x1},${y1}`,
              `A 50,50 0 ${largeArc},1 ${x2},${y2}`,
              `Z`
            ].join(' ');
            
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <path 
                      d={pathData} 
                      fill={colors[index % colors.length]} 
                      className="pie-slice" 
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="font-medium">{item[xField]}</div>
                    <div className="text-xs">${item[yField].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ({(percentage * 100).toFixed(1)}%)</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </svg>
      </div>
      
      <div className="ml-4 mt-4">
        {data.map((item, index) => (
          <div key={index} className="legend-item">
            <div 
              className="legend-color" 
              style={{ backgroundColor: colors[index % colors.length] }} 
            />
            <div className="legend-label">{item[xField]} (${item[yField].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TableViz = ({ data, columns }: { data: any[], columns?: string[] }) => {
  if (!data || data.length === 0) return <div>No data available</div>;
  
  // If columns are not specified, use all keys from the first data item
  const tableColumns = columns || Object.keys(data[0]);
  
  return (
    <div className="max-h-[300px] overflow-auto">
      <table className="insight-table">
        <thead>
          <tr>
            {tableColumns.map((col, idx) => (
              <th key={idx}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {tableColumns.map((col, colIdx) => (
                <td key={colIdx}>
                  {typeof row[col] === 'number' 
                    ? row[col].toLocaleString(undefined, 
                        {minimumFractionDigits: 2, maximumFractionDigits: 2})
                    : row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const KeyFigures = ({ keyFigures }: { keyFigures: Record<string, any> }) => {
  if (!keyFigures || Object.keys(keyFigures).length === 0) return null;
  
  return (
    <div className="key-figures">
      {Object.entries(keyFigures).map(([key, value], index) => (
        <div key={index} className="key-figure">
          <div className="key-figure-label">{key.replace(/([A-Z])/g, ' $1').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase())}</div>
          <div className="key-figure-value">
            {typeof value === 'number' 
              ? `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
              : value}
          </div>
        </div>
      ))}
    </div>
  );
};

const InsightViz = ({ response }: { response: InsightResponse }) => {
  if (!response || !response.viz) return null;
  
  const { viz, rows } = response;
  const { type, xField, yField, zField, series, columns } = viz;
  
  if (!rows || rows.length === 0) return <div>No data available to visualize</div>;
  
  switch (type) {
    case 'bar':
      return <BarChartViz data={rows} xField={xField || ''} yField={yField || ''} series={series} />;
    case 'column':
      // Column chart is a horizontal bar chart
      return <ColumnChartViz data={rows} xField={xField || ''} yField={yField || ''} />;
    case 'stackedBar':
      return <StackedBarChartViz data={rows} xField={xField || ''} yField={yField || ''} series={series || ''} />;
    case 'line':
      return <LineChartViz data={rows} xField={xField || ''} yField={yField || ''} />;
    case 'area':
      return <AreaChartViz data={rows} xField={xField || ''} yField={yField || ''} />;
    case 'scatter':
      return <ScatterChartViz data={rows} xField={xField || ''} yField={yField || ''} />;
    case 'histogram':
      return <HistogramViz data={rows} xField={xField || ''} />;
    case 'pie':
    case 'donut': // Handle donut as pie for now
      return <PieChartViz data={rows} xField={xField || ''} yField={yField || ''} isDonut={type === 'donut'} />;
    case 'funnel':
      return <FunnelViz data={rows} xField={xField || ''} yField={yField || ''} />;
    case 'heatmap':
      return <HeatmapViz data={rows} xField={xField || ''} yField={yField || ''} zField={zField || ''} />;
    case 'table':
      return <TableViz data={rows} columns={columns} />;
    case 'kpi':
      return <KpiViz data={rows} />;
    default:
      return (
        <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium">Visualization type not yet implemented</p>
          </div>
          <p className="text-sm text-gray-600">The requested visualization type "{type}" is not available in this version.</p>
        </div>
      );
  }
};

// New components for additional chart types
const ColumnChartViz = ({ data, xField, yField }: { data: any[], xField: string, yField: string }) => {
  if (!data || data.length === 0) return <div>No data available</div>;
  
  const max = Math.max(...data.map(d => d[yField])) * 1.1;
  
  return (
    <div className="chart-container">
      <div className="flex h-[250px] items-start my-4 gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center h-full gap-2">
            <div className="text-xs text-gray-500 w-20 truncate text-right pr-2">{item[xField]}</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center h-full">
                    <div 
                      className="bg-blue-500 h-6 rounded-md" 
                      style={{ 
                        width: `${(item[yField] / max * 100)}%`,
                        maxWidth: '300px',
                        minWidth: '4px'
                      }} 
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="font-medium">${item[yField].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
    </div>
  );
};

const StackedBarChartViz = ({ data, xField, yField, series }: { data: any[], xField: string, yField: string, series: string }) => {
  // Simplified stacked bar visualization
  return (
    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <BarChartIcon className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-medium">Stacked Bar Chart</p>
      </div>
      <p className="text-sm text-gray-600 mb-2">Showing {data.length} data points with {series} as stacking dimension</p>
      <div className="overflow-auto max-h-[250px] scrollbar-thin">
        <TableViz data={data} />
      </div>
    </div>
  );
};

const AreaChartViz = ({ data, xField, yField }: { data: any[], xField: string, yField: string }) => {
  // Simplified area chart visualization (uses line chart with fill)
  if (!data || data.length === 0) return <div>No data available</div>;
  
  const height = 250;
  const width = 600;
  const padding = 30;
  
  const max = Math.max(...data.map(d => d[yField])) * 1.1;
  const min = Math.min(...data.map(d => d[yField])) * 0.9;
  
  const xScale = (index: number) => (index / (data.length - 1)) * (width - 2 * padding) + padding;
  const yScale = (value: number) => height - padding - ((value - min) / (max - min)) * (height - 2 * padding);
  
  // Generate path
  let path = '';
  let areaPath = '';
  
  data.forEach((point, index) => {
    const x = xScale(index);
    const y = yScale(point[yField]);
    
    if (index === 0) {
      path += `M ${x},${y}`;
      areaPath += `M ${x},${height - padding} L ${x},${y}`;
    } else {
      path += ` L ${x},${y}`;
      areaPath += ` L ${x},${y}`;
    }
  });
  
  areaPath += ` L ${xScale(data.length - 1)},${height - padding} Z`;
  
  return (
    <div className="chart-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="area-chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#area-chart-gradient)" />
        <path d={path} className="line-chart-path" stroke="#3b82f6" strokeWidth="2.5" fill="none" />
        
        {/* X-Axis Labels */}
        {data.map((point, index) => (
          <text
            key={`x-label-${index}`}
            x={xScale(index)}
            y={height - 5}
            textAnchor="middle"
            fontSize="10"
            fill="#64748b"
          >
            {point[xField]}
          </text>
        ))}
      </svg>
    </div>
  );
};

const ScatterChartViz = ({ data, xField, yField }: { data: any[], xField: string, yField: string }) => {
  // Simplified scatter chart implementation
  return (
    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-medium">Scatter Plot</p>
      </div>
      <p className="text-sm text-gray-600 mb-2">Showing correlation between {xField} and {yField}</p>
      <div className="overflow-auto max-h-[250px] scrollbar-thin">
        <TableViz data={data} />
      </div>
    </div>
  );
};

const HistogramViz = ({ data, xField }: { data: any[], xField: string }) => {
  // Simplified histogram implementation
  return (
    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <BarChartIcon className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-medium">Histogram</p>
      </div>
      <p className="text-sm text-gray-600 mb-2">Distribution of {xField} across {data.length} data points</p>
      <div className="overflow-auto max-h-[250px] scrollbar-thin">
        <TableViz data={data} />
      </div>
    </div>
  );
};

const FunnelViz = ({ data, xField, yField }: { data: any[], xField: string, yField: string }) => {
  // Simplified funnel chart
  return (
    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-medium">Funnel Chart</p>
      </div>
      <p className="text-sm text-gray-600 mb-2">Showing {data.length} stages with conversion values</p>
      <div className="overflow-auto max-h-[250px] scrollbar-thin">
        <TableViz data={data} />
      </div>
    </div>
  );
};

const HeatmapViz = ({ data, xField, yField, zField }: { data: any[], xField: string, yField: string, zField: string }) => {
  // Simplified heatmap
  return (
    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <TableIcon className="h-4 w-4 text-blue-500" />
        <p className="text-sm font-medium">Heatmap</p>
      </div>
      <p className="text-sm text-gray-600 mb-2">Showing {xField} vs {yField} with {zField} as intensity</p>
      <div className="overflow-auto max-h-[250px] scrollbar-thin">
        <TableViz data={data} />
      </div>
    </div>
  );
};

const KpiViz = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return <div>No data available</div>;
  
  // Extract the first row for KPI display
  const kpiData = data[0];
  
  return (
    <div className="p-8 bg-gray-50 rounded-md border border-gray-200 flex items-center justify-center">
      <div className="text-center">
        {Object.entries(kpiData).map(([key, value]) => (
          <div key={key} className="mb-4">
            <div className="text-sm text-gray-500">{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">
              {typeof value === 'number' 
                ? value >= 1000 
                  ? `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                  : `$${value.toFixed(2)}`
                : String(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Data Table Component for standard tabular data
const DataTable = ({ data }: { data: { columns: string[], rows: any[][] } }) => {
  if (!data || !data.columns || !data.rows || data.rows.length === 0) {
    return <div className="text-sm text-gray-500 py-4">No data available</div>;
  }
  
  // Format column headers to be more readable
  const formatColumnName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  return (
    <div className="overflow-x-auto mb-6">
      <div className="border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {data.columns.map((column, index) => (
                <th 
                  key={index} 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b border-gray-200"
                >
                  {formatColumnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200"
                  >
                    {typeof cell === 'number' 
                      ? cell.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) 
                      : cell === null || cell === '' 
                        ? '—' // Em dash for empty values
                        : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Follow-up Questions Component
const FollowUpQuestions = ({ 
  questions, 
  onSelectQuestion 
}: { 
  questions: string[], 
  onSelectQuestion: (question: string) => void 
}) => {
  if (!questions || questions.length === 0) return null;
  
  return (
    <div className="mb-6 fade-in">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Follow-up Questions</h3>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelectQuestion(question)}
            className="text-sm rounded-md border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};

// ThinkingLoadingState component
const ThinkingLoadingState = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const thinkingMessages = [
    "Thinking...",
    "Looking up your data...",
    "Analysing patterns...",
    "Finding insights...",
    "Preparing visualizations...",
    "Generating results..."
  ];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % thinkingMessages.length);
    }, 3000); // Change message every 3 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="py-4 pl-1">
      <div className="bg-white/95 border border-blue-100 rounded-md shadow-md px-5 py-3 flex items-center w-fit">
        <div className="relative mr-3">
          {/* Multiple spinners with different speeds and sizes for an interesting effect */}
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" 
               style={{ animationDuration: '0.8s' }} />
          <div className="absolute inset-0 h-5 w-5 rounded-full border-2 border-blue-400 border-r-transparent animate-spin" 
               style={{ animationDirection: 'reverse', animationDuration: '1.2s' }} />
          <div className="absolute inset-0 h-5 w-5 rounded-full border border-blue-300 border-b-transparent animate-spin" 
               style={{ animationDuration: '1.5s' }} />
        </div>
        <div key={currentMessageIndex} className="font-medium text-sm thinking-text thinking-state">
          {thinkingMessages[currentMessageIndex]}
        </div>
      </div>
    </div>
  );
};

// Main Page Component
export default function InsightsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [insight, setInsight] = useState<InsightState>({
    query: "",
    response: null,
    isLoading: false,
    error: null,
    showSql: false
  });
  // Add state for storing multiple insights
  const [insights, setInsights] = useState<{
    id: string;
    query: string;
    response: InsightResponse | null;
    error: string | null;
    showSql: boolean;
    timestamp: Date;
  }[]>([]);
  const [suggestedQueries] = useState([
    "What were our top 5 products by revenue last month?",
    "How have our weekly sales changed over the past 3 months?",
    "What's our average order value?",
    "Which days of the week have the best sales?",
    "What's our customer retention rate?"
  ]);
  
  // Add state for historical data timestamp
  const [historicalDataInfo, setHistoricalDataInfo] = useState<{
    timestamp: Date | null;
    loading: boolean;
    error: string | null;
  }>({
    timestamp: null,
    loading: true,
    error: null
  });
  
  // Add debug mode state
  const [showDebug, setShowDebug] = useState(false);
  
  // Fetch historical data timestamp
  useEffect(() => {
    async function fetchHistoricalDataTimestamp() {
      if (!user?.uid) return;
      
      try {
        const checkpointRef = doc(db, 'merchants', user.uid, 'integrations', 'historical_sync_checkpoint');
        const checkpointDoc = await getDoc(checkpointRef);
        
        if (checkpointDoc.exists() && checkpointDoc.data().lastProcessedTimestamp) {
          const timestamp = checkpointDoc.data().lastProcessedTimestamp;
          // Convert Firebase timestamp to Date
          const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
          setHistoricalDataInfo({
            timestamp: date,
            loading: false,
            error: null
          });
        } else {
          setHistoricalDataInfo({
            timestamp: null,
            loading: false,
            error: "No historical data timestamp found"
          });
        }
      } catch (error) {
        console.error("Error fetching historical data timestamp:", error);
        setHistoricalDataInfo({
            timestamp: null,
            loading: false,
            error: "Failed to fetch historical data timestamp"
        });
      }
    }
    
    fetchHistoricalDataTimestamp();
  }, [user?.uid]);
  
  // Format historical data date
  const formatHistoricalDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  // Calculate how long ago the timestamp is
  const getTimeAgo = (date: Date | null) => {
    if (!date) return "";
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };
  
  // Handle tab selection with GitHub-inspired tab style
  const handleTabSelect = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Process natural language query
  const handleProcessQuery = async () => {
    if (!insight.query.trim() || !user?.uid) {
      toast({ 
        title: "Query Required", 
        description: "Please enter a question about your sales data.",
        variant: "destructive" 
      });
      return;
    }
    
    setInsight(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Log what's being sent to the API
    console.log('📤 Sending query to API:', {
      question: insight.query,
      merchantId: user.uid
    });
    
    try {
      // Use our Next.js API route instead of calling Firebase directly
      // This avoids CORS issues by proxying the request through our server
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: insight.query,
          merchantId: user.uid
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ API response:', responseData);
      
      // Create a new insight object
      let newInsightData = {
        id: uuidv4(), // Generate unique ID for each insight
        query: insight.query,
        response: null as InsightResponse | null,
        error: null as string | null,
        showSql: true,
        timestamp: new Date()
      };
      
      // Process the result - checking for both formats of response
      // The API could return { success, data } OR direct data object
      if (responseData && responseData.success && responseData.data) {
        // Format 1: { success: true, data: {...} }
        newInsightData.response = responseData.data;
        
        toast({ 
          title: "Insight Generated", 
          description: "Your sales data insight has been created."
        });
      } else if (responseData && responseData.sql !== undefined) {
        // Format 2: Direct data object { sql, answer, viz, keyFigures, rows }
        newInsightData.response = responseData;
        
        toast({ 
          title: "Insight Generated", 
          description: "Your sales data insight has been created."
        });
      } else {
        console.error("Invalid response format:", responseData);
        throw new Error(responseData.error || "Invalid response format from API");
      }
      
      // Add the new insight to the beginning of the array
      setInsights(prev => [newInsightData, ...prev]);
      
      // Reset the form
      setInsight(prev => ({
        ...prev,
        query: "", // Clear the query
        isLoading: false
      }));
    } catch (error: any) {
      console.error("❌ Error processing query:", error);
      
      // Add the error insight to the insights array
      setInsights(prev => [{
        id: uuidv4(),
        query: insight.query,
        response: null,
        error: error.message || "Failed to generate insight",
        showSql: false,
        timestamp: new Date()
      }, ...prev]);
      
      // Reset the form
      setInsight(prev => ({
        ...prev,
        isLoading: false,
        query: "" // Clear the query
      }));
      
      toast({
        title: "Processing Error",
        description: "Failed to generate insight. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Select a suggested query
  const handleSelectSuggestedQuery = (suggestedQuery: string) => {
    setInsight(prev => ({ ...prev, query: suggestedQuery }));
  };
  
  // Toggle SQL query visibility for a specific insight
  const toggleSqlVisibility = (insightId: string) => {
    setInsights(prev => prev.map(item => 
      item.id === insightId ? { ...item, showSql: !item.showSql } : item
    ));
  };
  
  // Add a handler for follow-up questions
  const handleFollowUpQuestion = (question: string) => {
    setInsight(prev => ({ ...prev, query: question }));
    // Optional: automatically process the question
    // setTimeout(() => handleProcessQuery(), 100);
  };
  
  return (
    <DashboardLayout>
      <style dangerouslySetInnerHTML={{ __html: transitionStyles }} />
      <div className="flex flex-col h-full max-w-full">
        {/* Header Section */}
        <div className="px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            {/* Tab Navigation moved to header */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
              <button
                onClick={() => handleTabSelect("all")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === "all"
                    ? "text-gray-800 bg-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-200/70"
                )}
              >
                <BarChartIcon className="h-4 w-4" />
                <span>All Insights</span>
              </button>
              <button
                onClick={() => handleTabSelect("saved")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === "saved"
                    ? "text-gray-800 bg-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-200/70"
                )}
              >
                <Clock className="h-4 w-4" />
                <span>Saved</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Database className="h-4 w-4 text-blue-500" />
                </div>
                <Input 
                  placeholder="Ask a question about your sales data..." 
                  className="pl-10 h-9 rounded-md w-full min-w-[400px]"
                  value={insight.query}
                  onChange={(e) => setInsight(prev => ({ ...prev, query: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !insight.isLoading) {
                      handleProcessQuery();
                    }
                  }}
                />
              </div>
              
              <Button 
                onClick={handleProcessQuery}
                disabled={!insight.query.trim() || insight.isLoading}
                className="rounded-md"
              >
                {insight.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Data Range Information */}
          {historicalDataInfo.timestamp && (
            <div className="text-xs text-gray-500 flex items-center mt-3">
              <Info className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
              <span>Historical data available from <span className="font-medium">{formatHistoricalDate(historicalDataInfo.timestamp)}</span></span>
            </div>
          )}
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          
          {/* Loading State */}
          {insight.isLoading && <ThinkingLoadingState />}
          
          {/* Main Content */}
          {insight.isLoading ? null : insights.length > 0 ? (
            <div className="space-y-6">
              {insights.map((insightItem, insightIndex) => (
                <div key={insightItem.id} className="bg-gray-50 border border-gray-200 rounded-md p-6 insight-result fade-in">
                  {/* Query Header */}
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-gray-900">{insightItem.query}</h2>
                    {insightItem.response?.answer && (
                      <p className="mt-1 text-gray-600">
                        {insightItem.response.answer || insightItem.response.summary || "Analysis of your data"}
                      </p>
                    )}
                  </div>
                  
                  {insightItem.error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <h3 className="text-lg font-medium text-red-600">Error Generating Insight</h3>
                      <p className="mt-1 text-sm text-red-600">{insightItem.error}</p>
                      <p className="mt-4 text-sm text-red-600">Please try a different question or try again later.</p>
                    </div>
                  ) : insightItem.response ? (
                    <div className="space-y-6">
                      {/* Follow-up Questions */}
                      {insightItem.response.followUpQuestions && (
                        <FollowUpQuestions 
                          questions={insightItem.response.followUpQuestions} 
                          onSelectQuestion={handleFollowUpQuestion}
                        />
                      )}
                      
                      {/* Data Visualization Container */}
                      <div className="bg-white border border-gray-200 rounded-md p-6">
                        {/* Table Data Display */}
                        {insightItem.response.table && (
                          <DataTable data={insightItem.response.table} />
                        )}
                        
                        {/* Traditional Visualization (only if no table) */}
                        {!insightItem.response.table && insightItem.response.viz && (
                          <InsightViz response={insightItem.response} />
                        )}
                        
                        {/* Key Figures */}
                        {insightItem.response.keyFigures && (
                          <KeyFigures keyFigures={insightItem.response.keyFigures} />
                        )}
                      </div>
                      
                      {/* Debug Section */}
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDebug(!showDebug)}
                          className="h-7 text-xs rounded-md flex items-center gap-1"
                        >
                          {showDebug ? (
                            <>
                              <Code className="h-3.5 w-3.5" />
                              Hide Debug Info
                            </>
                          ) : (
                            <>
                              <Terminal className="h-3.5 w-3.5" />
                              Show Debug Info
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Debug Information */}
                      {showDebug && (
                        <div className="space-y-4">
                          {/* Debug Function Response */}
                          <div className="bg-white border border-gray-200 rounded-md p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-medium flex items-center gap-1">
                                <Code className="h-4 w-4 text-blue-500" />
                                Function Response
                              </h3>
                            </div>
                            <pre className="text-xs bg-gray-900 text-gray-200 p-3 rounded-md overflow-auto max-h-60 scrollbar-thin">
                              {JSON.stringify(insightItem.response, null, 2)}
                            </pre>
                          </div>
                          
                          {/* SQL Query Display */}
                          {insightItem.response.sql && (
                            <div className="bg-white border border-gray-200 rounded-md">
                              <div className="sql-query">
                                <button className="sql-toggle" onClick={() => toggleSqlVisibility(insightItem.id)}>
                                  {insightItem.showSql ? 'Hide SQL' : 'Show SQL'}
                                </button>
                                <pre>{insightItem.response.sql}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-200 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Generated {insightIndex === 0 ? 'just now' : 'earlier'}</span>
                        </div>
                        <div>
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-md">
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-gray-50 border border-gray-200 rounded-md p-12">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Ask a question about your data</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Type your question in the search bar above to generate insights from your sales data.
                </p>
                
                {/* Suggested Questions */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Try asking:</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedQueries.slice(0, 3).map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectSuggestedQuery(query)}
                        className="text-xs rounded-md border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 