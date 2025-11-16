import React from "react";
import CanvasJSReact from "@canvasjs/react-charts";

const CanvasJSChart = CanvasJSReact.CanvasJSChart;

export default function GraphPage() {
  const [dataPoints, setDataPoints] = React.useState<{ x: number; y: number }[]>(
    []
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints((prev) => [
        ...prev.slice(-19),
        { x: prev.length + 1, y: Math.random() * 100 },
      ]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const options = {
    theme: "light2",
    title: {
      text: "Live Serial Data",
      fontFamily: "Roboto",
    },
    axisX: {
      title: "Time (s)",
    },
    axisY: {
      title: "Value",
      includeZero: false,
    },
    data: [
      {
        type: "line",
        dataPoints,
        color: "#42A5F5",
      },
    ],
  };

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <CanvasJSChart options={options} />
    </div>
  );
}
