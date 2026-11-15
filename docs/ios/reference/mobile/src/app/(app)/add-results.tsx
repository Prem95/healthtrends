import { StyleSheet, Text } from 'react-native';

import { Card, Screen } from '@/components/ui/primitives';
import { colors, type } from '@/theme/tokens';

// ROUTE STUB. Build this screen from docs/ios/02-ux.md (§6 Add results). The
// logic to port is the web's src/components/sessions/new-session-form.tsx and
// the createSession action in src/app/app/actions.ts; saving goes through
// api.createSession().
export default function AddResults() {
  return (
    <Screen>
      <Card>
        <Text style={styles.body}>This screen is specified in docs/ios/02-ux.md and not built yet.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.ink2 },
});
