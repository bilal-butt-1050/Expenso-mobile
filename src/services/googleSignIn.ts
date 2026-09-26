import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

let configured = false;

/** Configures Google sign-in once per process. Safe to call from any screen that needs it. */
export function configureGoogleSignIn(): void {
  if (configured) return;
  try {
    GoogleSignin.configure({
      webClientId: "166423632403-eah00rst0smqrkre0phm0i2s5uripqe6.apps.googleusercontent.com",
      offlineAccess: true,
    });
    configured = true;
  } catch {
    console.warn("GoogleSignin is not supported in Expo Go. Please use a development build.");
  }
}

/**
 * Asks the user to pick their Google account and returns a freshly issued ID token, or null if they
 * cancelled. Signing out first forces the account picker, so the token is new, not a cached one.
 */
export async function getFreshGoogleIdToken(): Promise<string | null> {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices();
  try {
    await GoogleSignin.signOut();
  } catch {
    // Already signed out.
  }
  try {
    const result = await GoogleSignin.signIn();
    return result.data?.idToken ?? null;
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return null;
    throw err;
  }
}
