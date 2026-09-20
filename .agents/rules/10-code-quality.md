# Code Quality Standards — Expenso Mobile

1. **Strict Typing**: Zero `any`. All API responses, component props, and route navigation parameters must be typed.
2. **Mobile Ergonomics**:
   - Touch targets must be minimum 44x44pt.
   - Standard button height: 54-56pt with 14px border radius.
   - Screen bottom padding: Add `paddingBottom: 140` on all scrollable list containers (`ScrollView`, `FlatList`) to clear the elevated bottom dock.
   - Key interactive elements must be thumb-reachable.
3. **Form Handling**: Wrap input screens in `KeyboardAvoidingView` with tap-outside dismiss handlers.
4. **States**: Always implement loading skeletons and clear, non-verbose empty states.
