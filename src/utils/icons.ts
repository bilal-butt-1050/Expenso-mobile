import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * Icon names arrive as plain strings (categories, income sources, stored rows). An unknown name used
 * to be cast straight through and rendered nothing. Now it falls back to a neutral icon.
 */
export function iconName(name: string | null | undefined, fallback: IconName = "shape-outline"): IconName {
  return name && name in MaterialCommunityIcons.glyphMap ? (name as IconName) : fallback;
}
