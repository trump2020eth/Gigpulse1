const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');
const withNotificationListener = (config) => {
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const app = androidManifest.manifest.application[0];
    const pkg = (androidManifest.manifest.$['package']) || 'com.gigpulse.app';
    const serviceName = `${pkg}.notificationpipe.NotificationPipeService`;
    app.service = app.service || [];
    if (!app.service.find(s => s['$'] && s['$']['android:name'] === serviceName)) {
      app.service.push({
        '$': { 'android:name': serviceName, 'android:label':'GigPulse Notification Service', 'android:permission':'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE', 'android:exported':'true' },
        'intent-filter':[ { action:[ { '$': { 'android:name':'android.service.notification.NotificationListenerService' } } ] } ]
      });
    }
    androidManifest.manifest['uses-permission'] = (androidManifest.manifest['uses-permission']||[]).concat([{ '$': { 'android:name':'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE' } }]);
    return config;
  });
  return config;
};
module.exports = createRunOncePlugin(withNotificationListener, 'with-notification-listener', '1.0.0');
