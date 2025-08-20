import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { getJSON } from '../lib/storage';
export default function InsightsScreen(){ const [tips,setTips]=useState<any[]>([]); useEffect(()=>{ (async()=>{ const list=await getJSON('earnings',[]); const byHour=new Array(24).fill(0); list.forEach(e=>{ const h=new Date(e.date).getHours(); byHour[h]+=(e.amount||0);}); const top=byHour.map((amt,hr)=>({hr,amt})).sort((a,b)=>b.amt-a.amt).slice(0,5); setTips(top); })(); },[]);
  return (<View style={styles.wrap}><Text variant="headlineSmall" style={styles.title}>Insights</Text><Card style={styles.card}><Card.Content><Text variant="titleMedium">Your top hours</Text>{tips.map(t=><Text key={t.hr} style={{color:'#fff'}}>{t.hr}:00–{t.hr+1}:00 • ${t.amt.toFixed(2)}</Text>)}<Text style={{color:'#9aa',marginTop:6}}>Keep logging payouts to improve suggestions.</Text></Card.Content></Card></View>); }
const styles=StyleSheet.create({ wrap:{flex:1,backgroundColor:'#0b0b0b',padding:14,paddingTop:20}, title:{color:'#fff',marginBottom:10}, card:{backgroundColor:'#141414'} });
