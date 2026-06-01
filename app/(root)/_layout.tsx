import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="rideshare/ride-screen" options={{ headerShown: false }} />
      <Stack.Screen name="rideshare/begin-ride" options={{ headerShown: false }} />
      <Stack.Screen
        name="ride-screen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="begin-ride"
        options={{
          headerShown: false,
        }}
      />
        <Stack.Screen
        name="end-ride"
        options={{
          headerShown: false,
        }}
      />
      
      <Stack.Screen
        name="post-detail"
        options={{
          headerShown: false,
        }}
      />   
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
        }}
      />  
    </Stack>
  );
};

export default Layout;
