// Web entry: CanvasKit (Skia WASM) must be loaded before any Skia component renders.
// `@expo/metro-runtime` MUST be the first import to keep Fast Refresh working on web.
import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  renderRootComponent(App);
});
