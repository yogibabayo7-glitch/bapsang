import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'bapsang-price',
  brand: { primaryColor: '#3182F6' },
  permissions: [],
  webBundleDir: 'dist',
  webView: {
    mediaPlaybackRequiresUserAction: true,
    allowsInlineMediaPlayback: false,
    bounces: true,
    allowsBackForwardNavigationGestures: true,
    pullToRefreshEnabled: false,
    overScrollMode: 'always',
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
    withTitle: true,
    transparentBackground: false,
  },
});
