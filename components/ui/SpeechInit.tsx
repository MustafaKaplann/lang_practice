"use client";

import { useEffect } from "react";
import { initSpeech, cancel } from "@/lib/speech";

export default function SpeechInit() {
  useEffect(() => {
    initSpeech();
    return () => { cancel(); };
  }, []);
  return null;
}
