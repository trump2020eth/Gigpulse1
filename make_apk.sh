#!/usr/bin/env bash
set -e
# keep required imports
if [ -f App.tsx ]; then
  grep -q 'react-native-gesture-handler' App.tsx || sed -i '1i import "react-native-gesture-handler";' App.tsx
  grep -q 'react-native-reanimated' App.tsx || sed -i '1i import "react-native-reanimated";' App.tsx
fi
rm -rf node_modules package-lock.json
npm i
npx expo install react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context
npx expo install expo-notifications expo-device expo-constants
npm i @react-navigation/native @react-navigation/bottom-tabs react-native-paper
EXPO_DEBUG=1 eas build -p android --profile preview --clear-cache --non-interactive
./get_apk.sh
