import "react-native-gesture-handler";
import "react-native-reanimated";
import * as React from 'react';
import { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import { theme } from './src/lib/theme';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import DriveScreen from './src/screens/DriveScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import OrderWorthScreen from './src/screens/OrderWorthScreen';
import HotzonesScreen from './src/screens/HotzonesScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
Notifications.setNotificationHandler({ handleNotification: async ()=>({ shouldShowAlert:true, shouldPlaySound:false, shouldSetBadge:false }) });

export default function App(){
  useEffect(()=>{ (async()=>{ await Notifications.requestPermissionsAsync(); })(); },[]);
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown:false, tabBarStyle:{ backgroundColor:'#0b0b0b', borderTopColor:'#222' }, tabBarActiveTintColor:'#2ECC71', tabBarInactiveTintColor:'#888' }}>
          <Tab.Screen name="Home" component={HomeScreen}/>
          <Tab.Screen name="Hotzones" component={HotzonesScreen}/>
          <Tab.Screen name="Map" component={MapScreen}/>
          <Tab.Screen name="Drive" component={DriveScreen}/>
          <Tab.Screen name="Orders" component={OrderWorthScreen}/>
          <Tab.Screen name="Earnings" component={EarningsScreen}/>
          <Tab.Screen name="Insights" component={InsightsScreen}/>
          <Tab.Screen name="Settings" component={SettingsScreen}/>
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
