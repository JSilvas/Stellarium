import React, { useRef, useEffect } from 'react';
import './PowerLawChart.css';

function PowerLawChart({ data, totalEvents, largestEvent }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(10, 20, 40, 0.85)';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = 'rgba(9, 211, 172, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#09d3ac';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('Avalanche Size Distribution', 15, 25);

    // Subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${totalEvents} events | max: ${largestEvent}`, 15, 42);

    // Create logarithmic bins
    const bins = createLogBins(data, 15);
    if (bins.length === 0) return;

    // Chart dimensions
    const chartX = 40;
    const chartY = 55;
    const chartWidth = width - 60;
    const chartHeight = height - 85;

    // Find max count for scaling
    const maxCount = Math.max(...bins.map(b => b.count));
    if (maxCount === 0) return;

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, chartY + chartHeight);
    ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
    ctx.stroke();

    // Draw bars
    const barWidth = chartWidth / bins.length;
    const barGap = Math.max(1, barWidth * 0.1);

    bins.forEach((bin, i) => {
      if (bin.count === 0) return;

      const barHeight = (bin.count / maxCount) * chartHeight;
      const x = chartX + i * barWidth + barGap;
      const y = chartY + chartHeight - barHeight;
      const w = barWidth - barGap * 2;

      // Color gradient based on bin size
      const hue = 180 - (i / bins.length) * 120; // Cyan to orange
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.8)`);
      gradient.addColorStop(1, `hsla(${hue}, 70%, 40%, 0.8)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, barHeight);

      // Bar outline
      ctx.strokeStyle = `hsla(${hue}, 70%, 70%, 0.5)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, barHeight);
    });

    // X-axis labels (log scale)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';

    // Show labels for first, middle, and last bins
    const labelIndices = [0, Math.floor(bins.length / 2), bins.length - 1];
    labelIndices.forEach(i => {
      if (i >= bins.length) return;
      const bin = bins[i];
      const x = chartX + i * barWidth + barWidth / 2;
      const y = chartY + chartHeight + 12;

      let label;
      if (bin.min === bin.max) {
        label = `${bin.min}`;
      } else if (bin.max < 10) {
        label = `${bin.min}-${bin.max}`;
      } else {
        label = `${Math.round(bin.min)}+`;
      }

      ctx.fillText(label, x, y);
    });

    // Y-axis label
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.translate(12, chartY + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Frequency', 0, 0);
    ctx.restore();

    // X-axis label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Size (balls)', chartX + chartWidth / 2, height - 8);

    // Power-law indicator
    if (bins.length > 5 && detectPowerLaw(bins)) {
      ctx.fillStyle = 'rgba(255, 150, 50, 0.8)';
      ctx.font = 'italic 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('⚡ Power-law detected', width - 15, height - 8);
    }

  }, [data, totalEvents, largestEvent]);

  return (
    <div className="power-law-chart">
      <canvas
        ref={canvasRef}
        width={300}
        height={220}
      />
    </div>
  );
}

// Create logarithmic bins for better power-law visualization
function createLogBins(data, numBins) {
  if (!data || data.length === 0) return [];

  const minSize = Math.min(...data);
  const maxSize = Math.max(...data);

  if (minSize === maxSize) {
    return [{
      min: minSize,
      max: maxSize,
      count: data.length,
      label: `${minSize}`
    }];
  }

  // Use logarithmic scale if range is large, otherwise linear
  const useLogScale = maxSize / minSize > 10;

  const bins = [];

  if (useLogScale) {
    // Logarithmic bins
    const logMin = Math.log10(Math.max(minSize, 1));
    const logMax = Math.log10(maxSize);
    const logStep = (logMax - logMin) / numBins;

    for (let i = 0; i < numBins; i++) {
      const binLogMin = logMin + i * logStep;
      const binLogMax = logMin + (i + 1) * logStep;
      const binMin = Math.pow(10, binLogMin);
      const binMax = Math.pow(10, binLogMax);

      bins.push({
        min: Math.floor(binMin),
        max: Math.floor(binMax),
        count: 0
      });
    }
  } else {
    // Linear bins for small ranges
    const binSize = Math.max(1, Math.ceil((maxSize - minSize) / numBins));

    for (let i = 0; i < numBins; i++) {
      const binMin = minSize + i * binSize;
      const binMax = minSize + (i + 1) * binSize;

      bins.push({
        min: binMin,
        max: binMax,
        count: 0
      });
    }
  }

  // Count events in each bin
  data.forEach(size => {
    for (let bin of bins) {
      if (size >= bin.min && (size <= bin.max || bin === bins[bins.length - 1])) {
        bin.count++;
        break;
      }
    }
  });

  // Remove empty bins at the end
  while (bins.length > 0 && bins[bins.length - 1].count === 0) {
    bins.pop();
  }

  return bins;
}

// Simple power-law detection (decreasing trend in log space)
function detectPowerLaw(bins) {
  if (bins.length < 4) return false;

  // Check if counts generally decrease
  let decreasingCount = 0;
  for (let i = 1; i < bins.length; i++) {
    if (bins[i].count <= bins[i - 1].count) {
      decreasingCount++;
    }
  }

  // Power-law should have mostly decreasing counts
  return decreasingCount >= bins.length * 0.6;
}

export default PowerLawChart;
