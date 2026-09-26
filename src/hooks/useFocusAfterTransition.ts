import { RefObject, useEffect } from "react";
import { TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

/**
 * Focuses a field once the screen's push animation has finished (DESIGN §S7). A bare `autoFocus`
 * during an Android native-stack push is often dropped, leaving no keyboard.
 */
export function useFocusAfterTransition(ref: RefObject<TextInput | null>, enabled: boolean) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!enabled) return;
    return navigation.addListener("transitionEnd", (e) => {
      if (!e.data.closing) ref.current?.focus();
    });
  }, [navigation, ref, enabled]);
}
