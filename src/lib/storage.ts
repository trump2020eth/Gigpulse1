import AsyncStorage from '@react-native-async-storage/async-storage';
export async function getJSON(key, fallback){try{const raw=await AsyncStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
export async function setJSON(key,val){await AsyncStorage.setItem(key,JSON.stringify(val));}
