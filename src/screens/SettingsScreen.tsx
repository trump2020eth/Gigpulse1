import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, TextInput, Chip } from 'react-native-paper';
import { getJSON } from '../lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen(){
  const [gas,setGas]=useState(''),[mpg,setMpg]=useState('');
  const [weights,setWeights]=useState({ rest:1.0, market:0.7, anchor:0.5, cellKm:1.0, bandMin:0.8, bandMax:1.4 });
  const [navPref,setNavPref]=useState<'auto'|'google'|'waze'>('auto');
  const [reminders,setReminders]=useState<any[]>([]);

  useEffect(()=>{(async()=>{
    setGas(String(await getJSON('gasPerGallon',4.5)));
    setMpg(String(await getJSON('mpg',25)));
    setWeights(await getJSON('hz_weights', weights));
    setNavPref(await getJSON('nav_pref','auto'));
    setReminders(await getJSON('hz_reminders', []));
  })();},[]);

  async function saveVehicle(){ await AsyncStorage.setItem('gasPerGallon',gas); await AsyncStorage.setItem('mpg',mpg); }
  async function saveWeights(){ await AsyncStorage.setItem('hz_weights', JSON.stringify(weights)); }
  async function saveNav(pref:any){ setNavPref(pref); await AsyncStorage.setItem('nav_pref', pref); }

  async function importCSV(){ const res=await DocumentPicker.getDocumentAsync({type:'text/csv'}); if(res.canceled||!res.assets?.[0])return; const raw=await (await fetch(res.assets[0].uri)).text(); const lines=raw.trim().split(/\r?\n/); const rows=lines.slice(1).map(l=>{ const [date,platform,amount,note]=l.split(','); return { id:String(Date.now())+Math.random(), date:Date.parse(date)||Date.now(), platform:platform||'DoorDash', amount:parseFloat(amount)||0, note }; }); const existing=JSON.parse(await AsyncStorage.getItem('earnings')||'[]'); await AsyncStorage.setItem('earnings', JSON.stringify([...rows,...existing])); }

  async function cancelAllReminders(){ const ids = (await getJSON('hz_reminders', [])).map((x:any)=>x.id); for(const id of ids){ try{ await Notifications.cancelScheduledNotificationAsync(id); } catch{} } await AsyncStorage.setItem('hz_reminders','[]'); setReminders([]); }

  return (
    <View style={styles.wrap}>
      <Text variant="headlineSmall" style={styles.title}>Settings</Text>

      <Text style={styles.section}>Vehicle</Text>
      <View style={{flexDirection:'row', gap:8}}>
        <TextInput mode="outlined" style={{flex:1}} label="Gas $/gal" keyboardType="decimal-pad" value={gas} onChangeText={setGas}/>
        <TextInput mode="outlined" style={{flex:1}} label="MPG" keyboardType="decimal-pad" value={mpg} onChangeText={setMpg}/>
        <Button mode="contained" onPress={saveVehicle}>Save</Button>
      </View>

      <Text style={styles.section}>Hotzones Weights</Text>
      <View style={{flexDirection:'row', gap:8}}>
        <TextInput mode="outlined" style={{flex:1}} label="Restaurants/Cafes" keyboardType="decimal-pad" value={String(weights.rest)} onChangeText={(v)=>setWeights(x=>({...x, rest:parseFloat(v)||x.rest}))}/>
        <TextInput mode="outlined" style={{flex:1}} label="Supermarkets/Malls" keyboardType="decimal-pad" value={String(weights.market)} onChangeText={(v)=>setWeights(x=>({...x, market:parseFloat(v)||x.market}))}/>
        <TextInput mode="outlined" style={{flex:1}} label="Hospitals/Campuses" keyboardType="decimal-pad" value={String(weights.anchor)} onChangeText={(v)=>setWeights(x=>({...x, anchor:parseFloat(v)||x.anchor}))}/>
      </View>
      <View style={{flexDirection:'row', gap:8, marginTop:8}}>
        <TextInput mode="outlined" style={{flex:1}} label="Cell size (km)" keyboardType="decimal-pad" value={String(weights.cellKm)} onChangeText={(v)=>setWeights(x=>({...x, cellKm:parseFloat(v)||x.cellKm}))}/>
        <TextInput mode="outlined" style={{flex:1}} label="Hour band min" keyboardType="decimal-pad" value={String(weights.bandMin)} onChangeText={(v)=>setWeights(x=>({
          ...x, bandMin:parseFloat(v)||x.bandMin
        }))}/>
        <TextInput mode="outlined" style={{flex:1}} label="Hour band max" keyboardType="decimal-pad" value={String(weights.bandMax)} onChangeText={(v)=>setWeights(x=>({
          ...x, bandMax:parseFloat(v)||x.bandMax
        }))}/>
      </View>
      <Button mode="contained-tonal" style={{marginTop:8}} onPress={saveWeights}>Save Weights</Button>

      <Text style={styles.section}>Navigation</Text>
      <View style={{flexDirection:'row', gap:8}}>
        <Chip selected={navPref==='auto'} onPress={()=>saveNav('auto')}>Auto</Chip>
        <Chip selected={navPref==='google'} onPress={()=>saveNav('google')}>Google Maps</Chip>
        <Chip selected={navPref==='waze'} onPress={()=>saveNav('waze')}>Waze</Chip>
      </View>

      <Text style={styles.section}>Reminders</Text>
      <View style={{gap:6}}>
        {reminders.length===0 ? <Text style={{color:'#9aa'}}>No scheduled reminders.</Text> :
          reminders.map((r:any)=>(<Text key={r.id} style={{color:'#fff'}}>Daily {r.time} • {r.zone?.lat?.toFixed(3)},{r.zone?.lon?.toFixed(3)} (Score {r.zone?.score?.toFixed(1)})</Text>))
        }
        <Button mode="contained-tonal" onPress={cancelAllReminders}>Cancel all</Button>
      </View>

      <Text style={styles.section}>Data</Text>
      <View style={{flexDirection:'row', gap:8}}>
        <Button mode="contained-tonal" onPress={importCSV}>Import CSV</Button>
        <Button mode="contained-tonal" onPress={async()=>{ await AsyncStorage.clear(); }}>Reset all</Button>
      </View>

      <Text style={{color:'#9aa', fontSize:12, marginTop:16}}>Hotzones+: heatmap fades with time; recent earnings add a short-term boost. You can pin favorites and schedule daily “when to go” reminders.</Text>
    </View>
  );
}

const styles=StyleSheet.create({
  wrap:{flex:1,backgroundColor:'#0b0b0b',padding:14,paddingTop:20},
  title:{color:'#fff',marginBottom:10},
  section:{color:'#9aa',marginTop:16,marginBottom:6}
});
