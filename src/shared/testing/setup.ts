import { configure } from "@testing-library/react";
import { JSDOM } from "jsdom";

// Node 26 exposes a global localStorage getter without a backing file. Vitest
// copies it over jsdom's getter on Windows, leaving window.localStorage undefined.
if (typeof window !== "undefined" && !window.localStorage) {
  const storage = new JSDOM("", { url: "http://localhost/" }).window.localStorage;
  Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
}

configure({ asyncUtilTimeout: 5000 });
