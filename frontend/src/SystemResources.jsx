import React, { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import Stack from "@mui/material/Stack";

const API_URL = "/api/stats";
const MAX_HISTORY = 30;

const MiniGraph = ({ data, dataKey, color, label, scale }) => {
  const currentVal = data[data.length - 1]?.[dataKey] ?? 0;

  return (
    <div style={{ height: "90px", width: "100%", marginBottom: "8px" }}>
      {/* Graph Area */}
      <div
        style={{
          height: "62px",
          borderBottom: "1px solid #334155",
          position: "relative",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`grad-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[0, scale]} hide />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#grad-${dataKey})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Label & Value Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "#94a3b8",
          padding: "4px 2px 0 2px",
          fontWeight: "bold",
          textTransform: "uppercase",
        }}
      >
        <span>{label}</span>
        {label == "TEMP" && (
          <span style={{ color: "#f8fafc" }}>{currentVal.toFixed(0)}°F</span>
        )}
        {label != "TEMP" && (
          <span style={{ color: "#f8fafc" }}>{currentVal.toFixed(0)}%</span>
        )}
      </div>
    </div>
  );
};

const SharpVerticalStats = () => {
  const [history, setHistory] = useState([]);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const res = await fetch(API_URL);
  //       const json = await res.json();

  //       const newEntry = {
  //         cpu: json.cpu.percent,
  //         gpu: json.gpu.gpu_utilization_percent,
  //         mem: json.memory.percent,
  //         // Normalizing Temp: Assuming 212°F is max for visual scale
  //         temp: json.gpu.temperature_f,
  //         // temp: Math.min((json.gpu.temperature_f / 212) * 100, 100),
  //       };

  //       setHistory((prev) => [...prev, newEntry].slice(-MAX_HISTORY));
  //     } catch (err) {
  //       console.error("Monitor Error:", err);
  //     }
  //   };

  //   fetchData();
  //   const interval = setInterval(fetchData, 2000);
  //   return () => clearInterval(interval);
  // }, []);

  const current = history[history.length - 1] || {};

  const containerStyle = {
    width: "120px",
    height: "500px",
    backgroundColor: "#020617", // Slate 950
    color: "#f8fafc",
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    fontFamily: "Inter, system-ui, sans-serif",
    boxSizing: "border-box",
    border: "1px solid #1e293b",
    borderRadius: "12px",
  };

  return (
    <Stack
      direction="column"
      spacing={2}
      sx={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={containerStyle}>
        <header style={{ textAlign: "center", marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "12px",
              margin: 0,
              letterSpacing: "2px",
              color: "#475569",
              fontWeight: "800",
            }}
          >
            SYSTEM
          </h2>
        </header>

        {/* Vertical Progress Bars Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginLeft: "8px",
            marginRight: "8px",
            marginBottom: "24px",
            height: "40px",
          }}
        >
          {[
            { key: "cpu", color: "#992800", multiplier: 1 },
            { key: "gpu", color: "#d34a24", multiplier: 1 },
            { key: "mem", color: "#ffaf00", multiplier: 1 },
            { key: "temp", color: "#3c7f72", multiplier: 0.47 },
          ].map((item) => (
            <div
              key={item.key}
              style={{
                width: "10px",
                height: "100%",
                backgroundColor: "#1e293b",
                borderRadius: "2px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  width: "100%",
                  height: `${current[item.key] * item.multiplier || 0}%`,
                  backgroundColor: item.color,
                  transition: "height 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>

        {/* Graphs */}
        <MiniGraph
          data={history}
          dataKey="cpu"
          scale={100}
          color="#992800"
          label="CPU"
        />
        <MiniGraph
          data={history}
          dataKey="gpu"
          scale={100}
          color="#d34a24"
          label="GPU"
        />
        <MiniGraph
          data={history}
          dataKey="mem"
          scale={100}
          color="#ffaf00"
          label="MEM"
        />
        <MiniGraph
          data={history}
          dataKey="temp"
          scale={212}
          color="#3c7f72"
          label="TEMP"
        />
      </div>
    </Stack>
  );
};

export default SharpVerticalStats;
