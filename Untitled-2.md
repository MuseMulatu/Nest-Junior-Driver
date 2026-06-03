npm install -D @types/react@~19.2.14 eslint-config-expo@~56.0.4 jest-expo@~56.0.4 typescript@~6.0.3 --legacy-peer-deps

Once that finishes, your project is completely and successfully upgraded to Expo SDK 56.



You can now move on to installing your Firebase and 100ms packages with the command you originally tried:




npm install @100mslive/react-native-hms@latest react-native-maps@latest react-native-vision-camera@latest react-native-worklets-core@latest @react-native-firebase/app@latest @react-native-firebase/auth@latest @react-native-firebase/crashlytics@latest @react-native-firebase/firestore@latest @react-native-firebase/storage@latest @gorhom/bottom-sheet@latest --legacy-peer-deps            


npm uninstall @react-navigation/native @react-native-community/checkbox expo-drizzle-studio-plugin

DELETE THE OVERRIDES BLOCK ON PACKAGE.JSON IF THIS FAILS

run this too if it fails again: npm install @react-native-firebase/functions@latest react-test-renderer@latest --no-audit --no-fund 

run this if failure again: npm uninstall react-test-renderer

run this: 'npm uninstall @react-navigation/native @react-native-community/checkbox expo-drizzle-studio-plugin @react-native-clipboard/clipboard react-test-renderer --legacy-peer-deps'

---(Note: I included @react-native-clipboard/clipboard here because the logs show it is an ancient version causing conflicts. If you need clipboard functionality, you should install expo-clipboard later).---

npx expo config

npm install @react-native-firebase/functions@latest react-test-renderer@19.2.3 react-native-worklets --legacy-peer-deps

DOS
rmdir /s /q node_modules
2. Reinstall everything cleanly:
(Using --legacy-peer-deps just to be safe so NPM doesn't trip over itself again).

DOS
npm install --legacy-peer-deps






Why is this happening?
When you run Expo, it reads your app.json and sees that you want to configure react-native-vision-camera. It looks inside that package's folder for a special file called app.plugin.js.
Because the version currently locked in your project doesn't have that file where Expo expects it, Expo panics and tries to read the main camera code instead—which crashes Node.js because of how the camera's internal files are linked.

This means your package.json or package-lock.json is clinging to an old, broken, or incompatible version of the camera package.

How to kill this error for good
Let's force your project to grab the absolute latest, fixed version of the camera, and delete the lock file so NPM can't secretly install the old one again.

Run these exact commands in order:

1. Delete the lock file (Crucial!)
(This file is likely remembering the broken version)

DOS
del package-lock.json
2. Force-update the Vision Camera package

DOS
npm install react-native-vision-camera@latest --legacy-peer-deps
3. Delete the Splash block from your app.json
I can see in the app.json you pasted earlier that the old "splash" block is still sitting on lines 10 through 14.
Open app.json and completely delete these lines so Expo 56 doesn't choke on them:

JSON
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2a2a2a"
    },
4. Run the final test
Once the camera finishes installing and the splash block is deleted, check it again:

DOS
npx expo config
If it successfully spits out a wall of JSON code without throwing that PluginError, you have officially survived dependency hell! You can then safely run npx expo start to get back to actually building your app.









npx expo install react-native-worklets expo-checkbox

      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "Nest Junior requires camera access to capture student boarding snapshots and provide secure live look-ins.",
          "enableMicrophonePermission": true,
          "microphonePermissionText": "Nest Junior requires microphone access to transmit cabin audio during live look-ins."
        }
      ],