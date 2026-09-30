// Lint gate for the mobile app (R-11). Kept narrow on purpose: rules that catch real defects
// (hooks, `any`), not a broad style preset that would bury them in noise.
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["node_modules/**", "dist/**", ".expo/**", "babel.config.js", "eslint.config.mjs"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // The stale-closure and conditional-hook bugs fixed by hand in Batches 3-5 and M1/M2.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      // mobile/CLAUDE.md: no `any`.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Design tokens (UIL-007, ui-review 2.1): colours and spacing come from src/theme, not literals.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/theme/**"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message: "Colour literal: use a token from src/theme/colors.",
        },
        {
          selector: "Literal[value=/^rgba?[(]/]",
          message: "Colour literal: use a token from src/theme/colors.",
        },
        {
          selector:
            // `raw`, not `value`: esquery's regex only tests strings, so a numeric `padding: 16`
            // never matched and this rule never fired (W1).
            "Property[key.name=/^(margin|padding|gap|rowGap|columnGap)(Top|Bottom|Left|Right|Horizontal|Vertical)?$/] > Literal[raw=/^([5-9]|[1-9][0-9]+)$/]",
          message: "Spacing literal: use a token from src/theme/spacing.",
        },
        {
          selector: 'Property[key.name="fontSize"] > Literal',
          message: "Font size literal: use a style from src/theme/typography.",
        },
      ],
    },
  }
);
