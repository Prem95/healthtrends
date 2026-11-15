import { Redirect } from 'expo-router';

// Google sign-in returns to bbiom://auth/callback. The auth sheet hands that
// URL back to signInWithGoogle(), which exchanges the code. If iOS ever routes
// the link here instead, there is nothing to render: go to the start.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
