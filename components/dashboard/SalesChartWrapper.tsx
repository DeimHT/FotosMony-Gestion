"use client";

import dynamic from "next/dynamic";
import { SalesDataPoint } from "@/types";

const SalesChart = dynamic(() => import("./SalesChart"), { ssr: false });

export default function SalesChartWrapper({ data }: { data: SalesDataPoint[] }) {
  return <SalesChart data={data} />;
}
