"use client";

import { useEffect, useState } from "react";
import styles from "./PlaceNavigationChooser.module.css";

type Provider = "kakao" | "naver";

type PlaceTarget = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

const PREFERENCE_KEY = "kopick:preferred-navigation-provider";
