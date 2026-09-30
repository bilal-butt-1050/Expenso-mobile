import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";

/** The raised Home button's diameter: larger than the + button, as the main destination (D-61). */
export const HOME_BUTTON_SIZE = 64;
/** How far the Home button's centre sits below the dock's top edge. */
export const HOME_BUTTON_DROP = 6;
/** Space between the Home button and the edge of its cutout. */
export const NOTCH_GAP = 6;
/** Radius of the rounded corners where the cutout meets the bar's top edge. */
const FILLET = 10;

/**
 * The tab dock's background, with a round cutout that the raised Home button sits in (D-61).
 *
 * The cutout is a circle concentric with the button, `NOTCH_GAP` wider, centred `HOME_BUTTON_DROP`
 * below the dock's top edge. Tangent fillets join it to the top edge, so the edge curves smoothly
 * in. Inside the cutout the navigator's own background shows through, so it reads as a hole in the
 * bar rather than a shape painted on it.
 */
export function NotchedTabBackground({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const cx = width / 2;
  const cy = HOME_BUTTON_DROP;
  const r = HOME_BUTTON_SIZE / 2 + NOTCH_GAP;
  const f = FILLET;

  // Fillet circle: radius f, tangent to the top edge (centre at y = f) and to the cutout circle
  // (centre distance r + f from (cx, cy)). Its tangent point on the top edge is xf either side.
  const xf = Math.sqrt((r + f) ** 2 - (f - cy) ** 2);
  // Where each fillet meets the cutout: r along the line from the cutout's centre to the fillet's.
  const px = (r * xf) / (r + f);
  const py = cy + (r * (f - cy)) / (r + f);
  // The cutout's arc runs under the button between those two points. It's more than half a circle
  // when the points sit above the cutout's centre.
  const largeArc = py < cy ? 1 : 0;

  const edge =
    `M 0 0 H ${cx - xf} ` +
    `A ${f} ${f} 0 0 1 ${cx - px} ${py} ` +
    `A ${r} ${r} 0 ${largeArc} 0 ${cx + px} ${py} ` +
    `A ${f} ${f} 0 0 1 ${cx + xf} 0 H ${width}`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Path d={`${edge} V ${height} H 0 Z`} fill={colors.surface} />
        {/* The bar's top border, following the cutout. Half a pixel down so the 1px line is crisp. */}
        <Path d={edge} fill="none" stroke={colors.borderLight} strokeWidth={1} transform="translate(0, 0.5)" />
      </Svg>
    </View>
  );
}
