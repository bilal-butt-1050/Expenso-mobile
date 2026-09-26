import React, { useEffect, useState } from "react";
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
 */
export function MoneyText({ amount, style }: Props) {
  const { fontScale, width } = useWindowDimensions();
  const [compact, setCompact] = useState(false);

  // A new value or a new layout gets measured afresh in full form.
  useEffect(() => {
    setCompact(false);
  }, [amount, fontScale, width]);

  return (
    <Text
      style={style}
      accessibilityLabel={formatCurrencySpoken(amount)}
      onTextLayout={(e) => {
        if (!compact && e.nativeEvent.lines.length > 1) setCompact(true);
      }}
    >
      {compact ? formatCurrencyCompact(amount) : formatCurrency(amount)}
    </Text>
  );
}
