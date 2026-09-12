import React from "react";
import { IncomeListScreen } from "../income/IncomeListScreen";

/**
 * Legacy route redirect / forwarder:
 * Income has evolved from a 3-field settings card into a first-class
 * dedicated bottom navigation tab with itemized logging.
 */
export function IncomeScreen() {
  return <IncomeListScreen />;
}
