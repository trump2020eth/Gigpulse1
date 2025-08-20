import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJSON, setJSON } from '../lib/storage';
import { openNav } from '../lib/utils';

type Zone = { id:string; lat:number; lon:number; score:number; count:number };

export default function HotzonesScreen(){
  const [region,setRegion]=useState({latitude:36.2077,longitude:-119.3473,latitudeDelta:0.12,longitudeDelta:0.12});
  const [zones,setZones]=useState<Zone[]>([]);
  const [pins,setPins]=useState<string[]>([]);
  const [loading,setLoading]=useState(false);
  const [lastUpdated,setLastUpdated]=useState<number|null>(null);
  const [radius,setRadius]=useState<'near'|'city'>('near');
  const [navPref,setNavPref]=useState<'auto'|'google'|'waze'>('auto');
  const [remindAt,setRemindAt]=useState('17:00');

  const [weights,setWeights] = useState({ rest:1.0, market:0.7, anchor:0.5, cellKm:1.0, bandMin:0.8, bandMax:1.4 });

  useEffect(()=>{(async()=>{
    const { status } = await Location.requestForegroundPermissionsAsync();
    if(status==='granted'){ const loc=await Location.getCurrentPositionAsync({}); setRegion(x=>({...x,latitude:loc.coords.latitude,longitude:loc.coords.longitude})); }
    const cache=await getJSON('hz_cache',null); if(cache&&Date.now()-cache.ts<3600000){ setZones(cache.zones); setLastUpdated(cache.ts); }
    const storedPins = await getJSON('hz_pins', []); setPins(storedPins);
    const wp = await getJSON('hz_weights', weights); setWeights(wp);
    const pref = await getJSON('nav_pref','auto'); setNavPref(pref);
  })();},[]);

  function norm(n:number,min:number,max:number){ return min + (max-min) * n; }

  async function fetchPOIs(lat:number,lon:number,delta:number){
    const d = Math.max(0.08, delta);
    const south=lat-d, north=lat+d, west=lon-d, east=lon+d;
    const q=`[out:json][timeout:25];
      (node["amenity"~"fast_food|restaurant|cafe|food_court"](${south},${west},${north},${east});
       node["shop"~"supermarket|mall"](${south},${west},${north},${east});
       node["amenity"~"hospital|university|college"](${south},${west},${north},${east});); out center;`;
    const res = await fetch("https://overpass-api.de/api/interpreter",{ method:'POST', body:q });
    const data = await res.json();
    return (data.elements||[]).map((e:any)=>({ lat:e.lat||e.center?.lat, lon:e.lon||e.center?.lon, cat:(e.tags?.amenity||e.tags?.shop||'poi') }));
  }

  function compute(zPlaces:any[], histWeight:number[]){
    const cellDeg = weights.cellKm * 0.009; // 1km ~ 0.009 deg
    const map: Record<string,{lat:number,lon:number,count:number,score:number}> = {};
    const wt = (cat:string)=> /fast_food|restaurant|food_court|cafe/.test(cat) ? weights.rest
                     : /supermarket|mall/.test(cat) ? weights.market
                     : /hospital|university|college/.test(cat) ? weights.anchor
                     : 0.4;
    for(const p of zPlaces){
      if(!p.lat||!p.lon) continue;
      const gx=Math.round(p.lat/cellDeg), gy=Math.round(p.lon/cellDeg);
      const key=gx+','+gy;
      if(!map[key]) map[key]={lat:gx*cellDeg, lon:gy*cellDeg, count:0, score:0};
      map[key].count++;
      map[key].score += wt(p.cat);
    }
    const hour = new Date().getHours();
    const mul = histWeight[hour]||1;
    const arr = Object.values(map).map(v=>({ id:`${v.lat},${v.lon}`, lat:v.lat, lon:v.lon, count:v.count, score:v.score*mul }));
    arr.sort((a,b)=>b.score-a.score);
    return arr.slice(0, 12);
  }

  async function refresh(){
    setLoading(true);
    try {
      const list = await getJSON<any[]>('earnings', []);
      const byHour = new Array(24).fill(0);
      const now = Date.now();
      let recentBoost = 1;
      let recentTotal = 0;
      list.forEach(e=>{
        const h = new Date(e.date).getHours();
        byHour[h] += (e.amount||0);
        if (now - e.date < 2*60*60*1000) recentTotal += (e.amount||0);
      });
      if (recentTotal>0){ recentBoost = 1 + Math.min(0.3, recentTotal/50*0.1); }

      const max = Math.max(1, ...byHour);
      const hist = byHour.map(x => norm(x/max, weights.bandMin, weights.bandMax) * recentBoost);

      const del = (radius==='near')? 0.10 : 0.18;
      const pois = await fetchPOIs(region.latitude, region.longitude, del);
      const zs = compute(pois, hist);
      setZones(zs); setLastUpdated(Date.now());
      await setJSON('hz_cache', { ts: Date.now(), zones: zs });
    } catch(e){ console.log('hz+', e); } finally { setLoading(false); }
  }

  useEffect(()=>{ refresh(); },[radius]);

  async function togglePin(id:string){
    const next = pins.includes(id) ? pins.filter(x=>x!==id) : [id, ...pins];
    setPins(next); await setJSON('hz_pins', next);
  }

  async function scheduleReminder(z:Zone){
    let [h,m] = remindAt.split(':').map(x=>parseInt(x,10));
    if (isNaN(h)||isNaN(m)) { h=17; m=0; }
    const id = await Notifications.scheduleNotificationAsync({
      content:{ title:'Hotzone reminder', body:`Try Hotzone near ${z.lat.toFixed(3)},${z.lon.toFixed(3)} • Score ${z.score.toFixed(1)}` },
      trigger:{ hour:h, minute:m, repeats:true }
    });
    const existing = await getJSON<any[]>('hz_reminders', []);
    await setJSON('hz_reminders', [{ id, zone:z, time:remindAt, created:Date.now() }, ...existing]);
  }

  function HeatLayer(){
    const pts:any[] = [];
    const r = 250;
    const maxScore = Math.max(1, ...zones.map(z=>z.score));
    zones.forEach(z=>{
      const intensity = Math.min(1, z.score / maxScore);
      const offsets = [[0,0],[0.002,0],[0,-0.002],[0.002,0.002],[-0.002,-0.002]];
      offsets.forEach(([dx,dy])=>{
        pts.push({ lat:z.lat+dx, lon:z.lon+dy, alpha: 0.10 + 0.30*intensity });
      });
    });
    return (<>{pts.map((p,i)=>(<Circle key={i} center={{latitude:p.lat,longitude:p.lon}} radius={r} fillColor={`rgba(255, 100, 0, ${p.alpha})`} strokeColor="rgba(255,120,0,0.0)" />))}</>);
  }

  return (
    <View style={styles.wrap}>
      <Text variant="headlineSmall" style={styles.title}>Hotzones+ (heatmap, pins, reminders)</Text>
      <View style={{flexDirection:'row', gap:8, alignItems:'center'}}>
        <Chip selected={radius==='near'} onPress={()=>setRadius('near')}>Near me</Chip>
        <Chip selected={radius==='city'} onPress={()=>setRadius('city')}>Wider city</Chip>
        <Button mode="contained" onPress={refresh} loading={loading}>Refresh</Button>
      </View>
      <MapView style={{flex:1, borderRadius:16, marginTop:8}} region={region} onRegionChangeComplete={setRegion}>
        <HeatLayer />
        {zones.map((z,i)=>(
          <React.Fragment key={z.id}>
            <Marker coordinate={{latitude:z.lat, longitude:z.lon}} title={`Hotzone #${i+1}${pins.includes(z.id)?' ★':''}`} description={`Score ${z.score.toFixed(1)} • POIs ${z.count}`} />
            <Circle center={{latitude:z.lat, longitude:z.lon}} radius={500} fillColor="rgba(255,80,0,0.12)" strokeColor={pins.includes(z.id)?'rgba(255,215,0,0.9)':'rgba(255,120,0,0.5)'} />
          </React.Fragment>
        ))}
      </MapView>

      <View style={{marginTop:8}}>
        {zones.slice(0,5).map((z,i)=>(
          <Card key={z.id} style={{backgroundColor:'#141414', marginBottom:8}}>
            <Card.Title title={`Hotzone #${i+1}${pins.includes(z.id)?' ★':''}`} titleStyle={{color:'#fff'}} subtitle={`Score ${z.score.toFixed(1)} • POIs ${z.count}`} subtitleStyle={{color:'#9aa'}} />
            <Card.Content style={{gap:8}}>
              <View style={{flexDirection:'row', gap:8}}>
                <Button mode="contained" onPress={()=>openNav(z.lat,z.lon,`Hotzone ${i+1}`, navPref)}>Navigate</Button>
                <Button mode="contained-tonal" onPress={()=>togglePin(z.id)}>{pins.includes(z.id)?'Unpin':'Pin'}</Button>
              </View>
              <View style={{flexDirection:'row', gap:8, alignItems:'center'}}>
                <Text style={{color:'#9aa'}}>Remind @</Text>
                <TextInput value={remindAt} onChangeText={setRemindAt} placeholder="HH:MM" style={{backgroundColor:'#1a1a1a', color:'#fff', padding:8, borderRadius:8, minWidth:80}}/>
                <Button mode="contained-tonal" onPress={()=>scheduleReminder(z)}>Daily</Button>
              </View>
            </Card.Content>
          </Card>
        ))}
        {lastUpdated && <Text style={{color:'#9aa', fontSize:12}}>Updated {new Date(lastUpdated).toLocaleTimeString()} • Blends POI density with your peak hours; recent earnings boost current time.</Text>}
      </View>
    </View>
  );
}

const styles=StyleSheet.create({ wrap:{flex:1,backgroundColor:'#0b0b0b',padding:14,paddingTop:20}, title:{color:'#fff',marginBottom:10} });
