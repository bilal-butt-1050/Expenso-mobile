import { colors } from "./colors";

// One shadow scale, instead of each floating component inventing its own.
export const elevation = {
  floating: {
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
} as const;
