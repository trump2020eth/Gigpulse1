import { Linking, Platform } from 'react-native';

export function haversine(a,b){const toRad=d=>d*Math.PI/180;const R=6371000;const dLat=toRad(b.latitude-a.latitude);const dLon=toRad(b.longitude-a.longitude);const lat1=toRad(a.latitude),lat2=toRad(b.latitude);const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
export const fmt=(n,u='')=>`${n.toFixed(2)}${u}`;

export async function openNav(lat, lon, label='Hotzone', pref='auto'){
  const waze = `waze://?ll=${lat},${lon}&navigate=yes`;
  const wazeWeb = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
  const gNav = `google.navigation:q=${lat},${lon}`; // Android turn-by-turn
  const gWeb = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  if (pref==='waze'){
    const can = await Linking.canOpenURL('waze://');
    if (can) return Linking.openURL(waze);
    return Linking.openURL(wazeWeb);
  }
  if (pref==='google'){
    if (Platform.OS==='android') return Linking.openURL(gNav);
    return Linking.openURL(gWeb);
  }
  try {
    const canWaze = await Linking.canOpenURL('waze://');
    if (canWaze) return Linking.openURL(waze);
  } catch {}
  if (Platform.OS==='android') return Linking.openURL(gNav);
  return Linking.openURL(gWeb);
}
