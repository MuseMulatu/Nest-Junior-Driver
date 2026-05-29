import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
     <Stack.Screen name="form" options={{ headerShown: false }} />
    </Stack>
  );
};

export default Layout;
