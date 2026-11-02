import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Goal = 'Muscle' | 'Forme' | 'Perte de poids';
type Level = 'Débutant' | 'Intermédiaire';
type Mode = 'home' | 'gym';
type Profile = { goal: Goal; level: Level };
type Exercise = { name: string; sets: number; reps: string; rest: number; tip: string; startImage?: string; endImage?: string };
type Workout = { id: string; name: string; subtitle: string; exercises: Exercise[] };
type RecordItem = { id: string; date: string; workout: string; sets: number };
type Store = { profile: Profile | null; history: RecordItem[] };
const KEY = 'fitstudio:v1';
const plans: Workout[] = [
  { id:'upper',name:'Haut du corps',subtitle:'Pectoraux, dos et bras',exercises:[
    {name:'Pompes inclinées',sets:3,reps:'8–12',rest:75,tip:'Mains sur un support stable, dos droit.'},
    {name:'Rowing avec sac à dos',sets:3,reps:'10–12',rest:75,tip:'Garde le dos neutre et contrôle la descente.'},
    {name:'Développé épaules avec bouteilles',sets:2,reps:'10–12',rest:60,tip:'Ne cambre pas le bas du dos.'},
    {name:'Curl avec bouteilles',sets:2,reps:'12–15',rest:45,tip:'Coudes près du corps.'}
  ]},
  { id:'lower',name:'Bas du corps',subtitle:'Jambes et fessiers',exercises:[
    {name:'Squats au poids du corps',sets:3,reps:'10–15',rest:75,tip:'Genoux dans l’axe des pieds.'},
    {name:'Fentes arrière',sets:3,reps:'8 / jambe',rest:75,tip:'Pose le pied arrière doucement.'},
    {name:'Pont fessier',sets:3,reps:'12–15',rest:60,tip:'Contracte les fessiers en haut.'},
    {name:'Mollets debout',sets:2,reps:'15–20',rest:45,tip:'Monte et redescends lentement.'}
  ]},
  { id:'full',name:'Corps entier',subtitle:'Renforcement général',exercises:[
    {name:'Squats',sets:3,reps:'12',rest:60,tip:'Amplitude confortable.'},
    {name:'Pompes contre un mur',sets:3,reps:'10–12',rest:60,tip:'Corps gainé.'},
    {name:'Rowing avec sac à dos',sets:3,reps:'12',rest:60,tip:'Épaules basses.'},
    {name:'Planche',sets:3,reps:'20–30 sec',rest:60,tip:'Respire normalement, sans creuser le dos.'}
  ]}
];
const gymPlans: Workout[] = [
 {id:'gym-upper',name:'Haut du corps',subtitle:'Machines · Pectoraux, dos et bras',exercises:[
 {name:'Développé assis à la machine (chest press)',sets:3,reps:'10–12',rest:75,tip:'Règle le siège : poignées à hauteur de poitrine. Pousse sans verrouiller les coudes.'},
 {name:'Tirage vertical à la poulie',sets:3,reps:'10–12',rest:75,tip:'Tire la barre vers le haut de la poitrine, sans balancer le buste.'},
 {name:'Développé épaules guidé',sets:3,reps:'10–12',rest:75,tip:'Dos contre le dossier, pousse sans cambrer.'},
 {name:'Curl biceps à la poulie',sets:2,reps:'12–15',rest:60,tip:'Garde les coudes proches du corps.'}]},
 {id:'gym-lower',name:'Bas du corps',subtitle:'Machines · Jambes et fessiers',exercises:[
 {name:'Presse à cuisses',sets:3,reps:'10–12',rest:90,tip:'Garde les pieds à plat et ne verrouille pas les genoux.'},
 {name:'Leg curl assis',sets:3,reps:'10–12',rest:75,tip:'Ajuste le siège et le rouleau à ta taille.'},
 {name:'Leg extension',sets:3,reps:'10–12',rest:75,tip:'Soulève sans élan et contrôle la descente.'},
 {name:'Mollets à la machine',sets:3,reps:'12–15',rest:60,tip:'Monte puis descends lentement.'}]},
 {id:'gym-full',name:'Corps entier',subtitle:'Machines · Renforcement général',exercises:[
 {name:'Presse à cuisses',sets:3,reps:'12',rest:90,tip:'Pieds à plat et dos contre le dossier.'},
 {name:'Développé assis à la machine',sets:3,reps:'12',rest:75,tip:'Garde les épaules basses.'},
 {name:'Rowing assis à la poulie',sets:3,reps:'12',rest:75,tip:'Tire vers le ventre sans te pencher en arrière.'},
 {name:'Crunch à la machine',sets:3,reps:'12–15',rest:60,tip:'Contracte les abdos sans tirer avec les bras.'}]}
];
const initial: Store = {profile:null,history:[]};
function Button({label,onPress,secondary=false,disabled=false}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean}) {
 return <Pressable disabled={disabled} onPress={onPress} style={[styles.button,secondary&&styles.secondary,disabled&&{opacity:.4}]}><Text style={[styles.buttonText,secondary&&{color:'#e5edf4'}]}>{label}</Text></Pressable>;
}
export default function App() {
 const [data,setData]=useState<Store>(initial);
 const [mode,setMode]=useState<Mode>('home');
 const [loaded,setLoaded]=useState(false);
 const [screen,setScreen]=useState<'home'|'profile'|'history'|'session'>('home');
 const [selected,setSelected]=useState<Workout>(plans[0]);
 const availablePlans=mode==='home'?plans:gymPlans;
 const [done,setDone]=useState<Record<string,boolean>>({});
 const [remaining,setRemaining]=useState(0);
 const [goal,setGoal]=useState<Goal>('Forme');
 const [level,setLevel]=useState<Level>('Débutant');
 useEffect(()=>{AsyncStorage.getItem(KEY).then(raw=>{if(raw){try{const parsed=JSON.parse(raw) as Store;if(Array.isArray(parsed.history))setData(parsed);}catch{}}}).catch(()=>Alert.alert('Stockage','Impossible de charger les données locales.')).finally(()=>setLoaded(true));},[]);
 useEffect(()=>{if(!loaded)return;AsyncStorage.setItem(KEY,JSON.stringify(data)).catch(()=>Alert.alert('Stockage','Impossible de sauvegarder les données.'));},[data,loaded]);
 useEffect(()=>{if(remaining<=0)return;const timer=setInterval(()=>setRemaining(v=>Math.max(0,v-1)),1000);return()=>clearInterval(timer);},[remaining]);
 const start=(workout:Workout)=>{setSelected(workout);setDone({});setRemaining(0);setScreen('session');};
 const total=selected.exercises.reduce((n,e)=>n+e.sets,0);
 const completed=Object.values(done).filter(Boolean).length;
 const finish=()=>{if(completed===0){Alert.alert('Séance vide','Valide au moins une série.');return;}setData(s=>({...s,history:[{id:Date.now().toString(),date:new Date().toISOString(),workout:(mode==='home'?'Maison · ':'Salle · ')+selected.name,sets:completed},...s.history]}));setRemaining(0);setScreen('home');Alert.alert('Bravo !','Ta séance est enregistrée sur ce téléphone.');};
 const saveProfile=()=>{setData(s=>({...s,profile:{goal,level}}));setScreen('home');};
 if(!loaded)return <SafeAreaView style={styles.root}><ActivityIndicator size="large" color="#6ee7b7"/></SafeAreaView>;
 return <SafeAreaView style={styles.root}><StatusBar barStyle="light-content"/><ScrollView contentContainerStyle={styles.container}>
 <Text style={styles.brand}>FIT STUDIO</Text>
 {screen==='home' && <><Text style={styles.heading}>{data.profile?'Ton entraînement':'Bienvenue 👋'}</Text><Text style={styles.muted}>{data.profile?`Objectif : ${data.profile.goal} · ${data.profile.level}`:'Commence par choisir ton objectif.'}</Text>
 {!data.profile ? <Button label="Configurer mon profil" onPress={()=>setScreen('profile')}/> : <>
 <View style={styles.stats}><Text style={styles.stat}>{data.history.length}</Text><Text style={styles.muted}>séances enregistrées</Text></View>
 <Text style={styles.section}>Où veux-tu t'entraîner ?</Text><View style={styles.choices}><Pressable onPress={()=>setMode('home')} style={[styles.choice,mode==='home'&&styles.active]}><Text style={styles.text}>🏠 Maison</Text></Pressable><Pressable onPress={()=>setMode('gym')} style={[styles.choice,mode==='gym'&&styles.active]}><Text style={styles.text}>🏋️ Salle · machines</Text></Pressable></View><Text style={styles.section}>Programme découverte · 3 séances</Text>
 {availablePlans.map(p=><Pressable key={p.id} onPress={()=>start(p)} style={styles.card}><Text style={styles.cardTitle}>{p.name}</Text><Text style={styles.muted}>{p.subtitle} · {p.exercises.length} exercices</Text><Text style={styles.action}>Démarrer →</Text></Pressable>)}
 <Button label="Mon historique" secondary onPress={()=>setScreen('history')}/><Button label="Modifier mon profil" secondary onPress={()=>{setGoal(data.profile!.goal);setLevel(data.profile!.level);setScreen('profile');}}/>
 </>}</>}
 {screen==='profile'&&<><Text style={styles.heading}>Mon profil</Text><Text style={styles.section}>Mon objectif</Text><View style={styles.choices}>{(['Muscle','Forme','Perte de poids'] as Goal[]).map(x=><Pressable key={x} style={[styles.choice,goal===x&&styles.active]} onPress={()=>setGoal(x)}><Text style={styles.text}>{x}</Text></Pressable>)}</View><Text style={styles.section}>Mon niveau</Text><View style={styles.choices}>{(['Débutant','Intermédiaire'] as Level[]).map(x=><Pressable key={x} style={[styles.choice,level===x&&styles.active]} onPress={()=>setLevel(x)}><Text style={styles.text}>{x}</Text></Pressable>)}</View><Text style={styles.muted}>Programme découverte général. Adapte l'effort à tes capacités et arrête en cas de douleur.</Text><Button label="Enregistrer mon profil" onPress={saveProfile}/>{data.profile&&<Button label="Retour" secondary onPress={()=>setScreen('home')}/>}</>}
 {screen==='session'&&<><Text style={styles.heading}>{selected.name}</Text><Text style={styles.muted}>{mode==='home'?'🏠 À la maison':'🏋️ À la salle · machines'}</Text><Text style={styles.muted}>{completed}/{total} séries validées</Text>{remaining>0&&<View style={styles.timer}><Text style={styles.cardTitle}>Repos : {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</Text><Button label="Passer le repos" secondary onPress={()=>setRemaining(0)}/></View>}
 {selected.exercises.map((ex,i)=><View key={i} style={styles.card}><Text style={styles.cardTitle}>{ex.name}</Text>{ex.startImage&&ex.endImage?<View style={styles.choices}><Image source={{uri:ex.startImage}} style={styles.exerciseImage}/><Image source={{uri:ex.endImage}} style={styles.exerciseImage}/></View>:<View style={styles.visualPending}><Text style={styles.visualPendingText}>📷 Démonstration photo à venir</Text><Text style={styles.muted}>Photos de départ et d'arrivée en cours de sélection et de vérification.</Text></View>}<Text style={styles.muted}>{ex.sets} séries · {ex.reps} répétitions · repos {ex.rest}s</Text><Text style={styles.tip}>{ex.tip}</Text><View style={styles.choices}>{Array.from({length:ex.sets},(_,j)=>{const key=`${i}-${j}`;return <Pressable key={key} style={[styles.choice,done[key]&&styles.active]} onPress={()=>{setDone(s=>({...s,[key]:!s[key]}));if(!done[key])setRemaining(ex.rest);}}><Text style={styles.text}>{done[key]?'✓ ':''}S{j+1}</Text></Pressable>;})}</View></View>)}
 <Button label="Terminer et enregistrer" onPress={finish}/><Button label="Quitter sans enregistrer" secondary onPress={()=>Alert.alert('Quitter ?','Les séries non enregistrées seront perdues.',[{text:'Annuler'},{text:'Quitter',style:'destructive',onPress:()=>{setRemaining(0);setScreen('home');}}])}/></>}
 {screen==='history'&&<><Text style={styles.heading}>Historique</Text>{data.history.length===0?<Text style={styles.muted}>Aucune séance enregistrée.</Text>:data.history.map(item=><View key={item.id} style={styles.card}><Text style={styles.cardTitle}>{item.workout}</Text><Text style={styles.muted}>{new Date(item.date).toLocaleDateString('fr-FR')} · {item.sets} séries validées</Text></View>)}<Button label="Retour" secondary onPress={()=>setScreen('home')}/><Button label="Effacer mon historique" secondary onPress={()=>Alert.alert('Supprimer l’historique ?','Cette action est irréversible.',[{text:'Annuler'},{text:'Supprimer',style:'destructive',onPress:()=>setData(s=>({...s,history:[]}))}])}/></>}
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#0c1420'},container:{padding:22,paddingBottom:55,gap:14},brand:{fontSize:15,fontWeight:'900',color:'#6ee7b7',letterSpacing:3,marginTop:12},heading:{fontSize:30,fontWeight:'800',color:'#f7fafc',marginTop:14},section:{fontSize:18,fontWeight:'700',color:'#f7fafc',marginTop:14},text:{color:'#edf5fa',fontWeight:'600'},muted:{color:'#a9bac8',lineHeight:22},card:{backgroundColor:'#172333',borderColor:'#2b3d4f',borderWidth:1,padding:18,borderRadius:18,gap:8},cardTitle:{fontSize:19,fontWeight:'700',color:'#f8fafc'},tip:{color:'#c8d6df',fontSize:13},action:{color:'#6ee7b7',fontWeight:'800',marginTop:4},button:{backgroundColor:'#34d399',borderRadius:14,padding:16,alignItems:'center',marginTop:5},secondary:{backgroundColor:'#233346'},buttonText:{fontWeight:'800',color:'#06281f',fontSize:15},choices:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8},choice:{borderRadius:12,borderWidth:1,borderColor:'#3b5165',paddingVertical:11,paddingHorizontal:14,backgroundColor:'#233346'},active:{backgroundColor:'#12634f',borderColor:'#6ee7b7'},stats:{borderRadius:18,backgroundColor:'#172333',padding:20,marginTop:10},stat:{color:'#6ee7b7',fontSize:36,fontWeight:'800'},exerciseImage:{width:140,height:140,borderRadius:12},visualPending:{padding:14,borderRadius:12,backgroundColor:'#223244',gap:6},visualPendingText:{color:'#6ee7b7',fontWeight:'700'},timer:{padding:16,borderRadius:16,backgroundColor:'#164735',gap:10}});
