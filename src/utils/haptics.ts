import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Trigger a light haptic feedback.
 * Use for minor interactions: pressing buttons, toggling switches, expanding items.
 */
export const hapticLight = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/**
 * Trigger a medium haptic feedback.
 * Use for more significant interactions or drawing attention.
 */
export const hapticMedium = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/**
 * Trigger a heavy haptic feedback.
 * Use for destructive actions or major state changes (e.g. deleting an item).
 */
export const hapticHeavy = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/**
 * Trigger a success haptic notification.
 * Use when a task completes successfully (e.g. saving an expense).
 */
export const hapticSuccess = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/**
 * Trigger a warning haptic notification.
 * Use for errors or important warnings (e.g. exceeding a budget).
 */
export const hapticWarning = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/**
 * Trigger an error haptic notification.
 * Use for critical failures.
 */
export const hapticError = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};
