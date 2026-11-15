import { StyleSheet, Text } from 'react-native';

import { Card, Screen } from '@/components/ui/primitives';
import { colors, type } from '@/theme/tokens';

// ROUTE STUB. Build this screen from docs/ios/02-ux.md (§7 Timeline), using
// (tabs)/index.tsx as the pattern for data loading, states and components.
export default function Timeline() {
  return (
    <Screen>
      <Text style={styles.title} accessibilityRole="header">
        Timeline
      </Text>
      <Card>
        <Text style={styles.body}>This screen is specified in docs/ios/02-ux.md and not built yet.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.largeTitle, color: colors.ink },
  body: { ...type.body, color: colors.ink2 },
});
