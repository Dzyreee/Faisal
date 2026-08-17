import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function Index() {
  const [body, setBody] = useState('loading…');

  useEffect(() => {
    // Relative URL on purpose. Expo resolves this to the dev server origin
    // on native — that resolution is the thing Phase 0 is proving.
    fetch('/api/health')
      .then((response) => response.text())
      .then(setBody)
      .catch((error) => setBody(`ERROR: ${String(error)}`));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text selectable style={{ fontSize: 16 }}>
        {body}
      </Text>
    </View>
  );
}
