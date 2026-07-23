"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { koreaRegionDistricts } from "@/utils/korea-region-districts";

const regions = Object.keys(koreaRegionDistricts);

type HourlyWeather = {
  time: string;
  icon: string;
  condition: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  windSpeed: number;
};
