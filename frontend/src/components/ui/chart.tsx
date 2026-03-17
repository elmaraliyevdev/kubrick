// Simple chart components using SVG for visualizations
// This is a lightweight alternative to external charting libraries

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface LineChartData {
  label: string;
  value: number;
}

// Simple Line Chart Component
export function LineChart({ 
  data, 
  height = 200, 
  width = 400,
  strokeColor = "#3b82f6",
  className = ""
}: {
  data: LineChartData[];
  height?: number;
  width?: number;
  strokeColor?: string;
  className?: string;
}) {
  if (!data || data.length === 0) return <div>No data</div>;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * (width - 60) + 30;
    const y = height - 40 - ((point.value - minValue) / range) * (height - 80);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`overflow-hidden ${className}`}>
      <svg width={width} height={height} className="w-full h-full">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - 40 - ratio * (height - 80);
          const value = Math.round(minValue + ratio * range);
          return (
            <text key={ratio} x="5" y={y + 3} fontSize="10" fill="#6b7280" textAnchor="start">
              {value}
            </text>
          );
        })}
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * (width - 60) + 30;
          const y = height - 40 - ((point.value - minValue) / range) * (height - 80);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={strokeColor}
              className="hover:r-4 transition-all"
            />
          );
        })}
        
        {/* X-axis labels */}
        {data.map((point, index) => {
          if (index % Math.ceil(data.length / 6) === 0) {
            const x = (index / (data.length - 1)) * (width - 60) + 30;
            return (
              <text 
                key={index} 
                x={x} 
                y={height - 10} 
                fontSize="10" 
                fill="#6b7280" 
                textAnchor="middle"
              >
                {point.label}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

// Simple Bar Chart Component
export function BarChart({ 
  data, 
  height = 200, 
  width = 400,
  className = ""
}: {
  data: ChartData[];
  height?: number;
  width?: number;
  className?: string;
}) {
  if (!data || data.length === 0) return <div>No data</div>;

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width - 60) / data.length - 10;
  
  return (
    <div className={`overflow-hidden ${className}`}>
      <svg width={width} height={height} className="w-full h-full">
        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 60);
          const x = 30 + index * ((width - 60) / data.length);
          const y = height - 40 - barHeight;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color || "#3b82f6"}
                rx="2"
                className="hover:opacity-80 transition-opacity"
              />
              <text
                x={x + barWidth / 2}
                y={height - 25}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {item.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 5}
                fontSize="10"
                fill="#374151"
                textAnchor="middle"
                fontWeight="500"
              >
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Simple Donut Chart Component
export function DonutChart({ 
  data, 
  size = 200,
  className = ""
}: {
  data: ChartData[];
  size?: number;
  className?: string;
}) {
  if (!data || data.length === 0) return <div>No data</div>;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const center = size / 2;
  const radius = size * 0.35;
  const innerRadius = radius * 0.6;
  
  let cumulativeAngle = 0;
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg width={size} height={size}>
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + angle;
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (endAngle * Math.PI) / 180;
          
          const x1 = center + radius * Math.cos(startAngleRad);
          const y1 = center + radius * Math.sin(startAngleRad);
          const x2 = center + radius * Math.cos(endAngleRad);
          const y2 = center + radius * Math.sin(endAngleRad);
          
          const ix1 = center + innerRadius * Math.cos(startAngleRad);
          const iy1 = center + innerRadius * Math.sin(startAngleRad);
          const ix2 = center + innerRadius * Math.cos(endAngleRad);
          const iy2 = center + innerRadius * Math.sin(endAngleRad);
          
          const pathData = [
            `M ${ix1} ${iy1}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `L ${ix2} ${iy2}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
            'Z'
          ].join(' ');
          
          cumulativeAngle += angle;
          
          return (
            <path
              key={index}
              d={pathData}
              fill={item.color || defaultColors[index % defaultColors.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          );
        })}
        {/* Center text */}
        <text x={center} y={center - 5} textAnchor="middle" className="text-lg font-semibold fill-gray-700">
          {total}
        </text>
        <text x={center} y={center + 12} textAnchor="middle" className="text-xs fill-gray-500">
          Total
        </text>
      </svg>
      
      {/* Legend */}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color || defaultColors[index % defaultColors.length] }}
            />
            <span className="text-gray-700">{item.label}</span>
            <span className="text-gray-500">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}