import React, { useState } from "react";
import { StyleProp, Text, TextStyle, useWindowDimensions } from "react-native";
import { formatCurrency, formatCurrencyCompact, formatCurrencySpoken } from "../utils/currency";

interface Props {
  amount: number;
  style?: StyleProp<TextStyle>;
}

/**
 * A money value that never wraps mid-number and is never cut (DESIGN NFR-4, rule 1).
 *
 * It renders the full figure first. If that measures more than one line (a narrow screen, large
 * text), it switches to the lakh/crore compact form. Screen readers always get the full value.
 * Replaces `adjustsFontSizeToFit`, which made equivalent figures render at different sizes.
 *
 * `numberOfLines` is deliberately left unset: with `1`, Android truncates to one line and
 * `onTextLayout` never reports the overflow this relies on.
 */
export function MoneyText({ amount, style }: Props) {
  const { fontScale, width } = useWindowDimensions();
  // Compact applies only to the exact value and layout it was measured for, so a new value or
  // layout is measured afresh in full form, with no effect and no stale compact frame.
  const layoutKey = `${amount}|${fontScale}|${width}`;
  const [compactFor, setCompactFor] = useState<string | null>(null);
  const compact = compactFor === layoutKey;

  return (
    <Text
      style={style}
      accessibilityLabel={formatCurrencySpoken(amount)}
      onTextLayout={(e) => {
        if (!compact && e.nativeEvent.lines.length > 1) setCompactFor(layoutKey);
      }}
    >
      {compact ? formatCurrencyCompact(amount) : formatCurrency(amount)}
    </Text>
  );
}
