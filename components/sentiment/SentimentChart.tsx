"use client";

import React, { JSX, useEffect, useRef } from "react";

interface EmotionalDataPoint {
  timestamp: number;
  emotion: string;
  intensity: number;
}

interface SentimentChartProps {
  emotionalJourney: Array<EmotionalDataPoint>;
  width?: number;
  height?: number;
}

export default function SentimentChart({
  emotionalJourney,
  width = 600,
  height = 200,
}: SentimentChartProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Color mapping for different emotions
  const emotionColors = {
    enthusiastic: "#4ade80", // green-400
    confident: "#60a5fa", // blue-400
    engaged: "#a78bfa", // violet-400
    neutral: "#94a3b8", // slate-400
    thoughtful: "#fcd34d", // amber-300
    uncertain: "#fb923c", // orange-400
    nervous: "#f87171", // red-400
    disinterested: "#6b7280", // gray-500
  };

  // Default color if emotion not found
  const defaultColor = "#94a3b8"; // slate-400

  useEffect(() => {
    if (!canvasRef.current || emotionalJourney.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sort journey by timestamp
    const sortedJourney = [...emotionalJourney].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Calculate x-axis scale (time)
    const startTime = sortedJourney[0].timestamp;
    const endTime = sortedJourney[sortedJourney.length - 1].timestamp;
    const timeRange = endTime - startTime;

    // Draw background grid
    ctx.strokeStyle = "#e2e8f0"; // slate-200
    ctx.lineWidth = 0.5;

    // Horizontal grid lines (intensity levels)
    for (let i = 0; i <= 100; i += 10) {
      const y = height - (i / 100) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Add y-axis labels
    ctx.fillStyle = "#64748b"; // slate-500
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 100; i += 20) {
      const y = height - (i / 100) * height;
      ctx.fillText(`${i}%`, 30, y + 4);
    }

    // Draw the emotional journey line
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();

    sortedJourney.forEach((point, index) => {
      const x = ((point.timestamp - startTime) / timeRange) * (width - 40) + 40;
      const y = height - (point.intensity / 100) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    // Style and stroke the line with gradient
    const gradient = ctx.createLinearGradient(40, 0, width, 0);
    gradient.addColorStop(0, "#60a5fa"); // blue-400
    gradient.addColorStop(0.5, "#a78bfa"); // violet-400
    gradient.addColorStop(1, "#4ade80"); // green-400

    ctx.strokeStyle = gradient;
    ctx.stroke();

    // Draw emotion markers (dots)
    sortedJourney.forEach((point) => {
      const x = ((point.timestamp - startTime) / timeRange) * (width - 40) + 40;
      const y = height - (point.intensity / 100) * height;

      // Draw the dot for the emotion
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle =
        emotionColors[point.emotion as keyof typeof emotionColors] ||
        defaultColor;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Add legend
    const uniqueEmotions = Array.from(
      new Set(sortedJourney.map((p) => p.emotion))
    );
    const legendX = width - 120;
    const legendY = 20;

    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";

    uniqueEmotions.forEach((emotion, index) => {
      const y = legendY + index * 15;

      // Draw color box
      ctx.fillStyle =
        emotionColors[emotion as keyof typeof emotionColors] || defaultColor;
      ctx.fillRect(legendX, y - 8, 10, 10);

      // Draw emotion name
      ctx.fillStyle = "#334155"; // slate-700
      ctx.fillText(emotion, legendX + 15, y);
    });
  }, [emotionalJourney, width, height]);

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto bg-white rounded-lg"
      />
    </div>
  );
}
