import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme/colors";
import { size } from "../theme/spacing";

/** Space between the raised Home button and the edge of its cutout. */
export const NOTCH_GAP = 6;
/** Radius of the rounded corners where the cutout meets the bar's top edge. */
const FILLET = 10;

/**
 * The tab dock's background, with a round cutout that the raised Home button sits in (D-61).
 *
 * The cutout is a circle centred on the button's centre, which sits exactly on the dock's top
 * edge, `NOTCH_GAP` wider than the button, joined to the top edge by small tangent fillets so the
 * edge curves smoothly into it. Inside the cutout the navigator's own background shows through, so
 * it reads as a hole in the bar rather than a shape painted on it.
 */
export function NotchedTabBackground({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const cx = width / 2;
  const r = size.fab / 2 + NOTCH_GAP;
  const f = FILLET;

  // Fillet circle: radius f, tangent to the top edge (centre at y = f) and to the cutout circle
  // (centre distance r + f). Its tangent point on the top edge is xf either side of the centre.
  const xf = Math.sqrt((r + f) ** 2 - f ** 2);
  // Where each fillet meets the cutout: on the line between the two circles' centres.
  const px = (r * xf) / (r + f);
  const py = (r * f) / (r + f);

  const edge =
    `M 0 0 H ${cx - xf} ` +
    `A ${f} ${f} 0 0 1 ${cx - px} ${py} ` +
    `A ${r} ${r} 0 0 0 ${cx + px} ${py} ` +
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
