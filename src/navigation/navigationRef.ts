import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "../types/navigation";

/**
 * For navigation that outlives the screen that started it, such as a snackbar action shown after a
 * form has closed. Screens should keep using `useNavigation()`.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
