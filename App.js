import { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Animated, Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SW } = Dimensions.get("window");

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Premium Dark Finance
// ══════════════════════════════════════════════════════════════════════════════
const T = {
  // Backgrounds
  bg0: "#040406",
  bg1: "#08080C",
  bg2: "#0E0E14",
  bg3: "#14141C",
  bg4: "#1A1A24",
  // Borders
  b1: "#1E1E2A",
  b2: "#28283A",
  b3: "#32324A",
  // Brand
  mint:    "#00E5B0",
  mintDim: "#00E5B012",
  mintMid: "#00E5B035",
  mintGlow:"#00E5B060",
  // Accents
  gold:    "#F5B800",
  goldDim: "#F5B80012",
  rose:    "#FF4D6D",
  roseDim: "#FF4D6D12",
  sky:     "#38BDF8",
  skyDim:  "#38BDF812",
  violet:  "#8B5CF6",
  violetDim:"#8B5CF612",
  emerald: "#10B981",
  emeraldDim:"#10B98112",
  orange:  "#F97316",
  // Text
  t1: "#F8F8FC",
  t2: "#A0A0B8",
  t3: "#606078",
  t4: "#30303C",
};

const CATS = {
  "Alimentación": { icon:"🛒", color:T.mint,    bg:T.mintDim },
  "Transporte":   { icon:"⛽", color:T.sky,     bg:T.skyDim },
  "Ocio":         { icon:"🎮", color:"#EC4899",  bg:"#EC489912" },
  "Salud":        { icon:"💊", color:T.emerald,  bg:T.emeraldDim },
  "Suscripciones":{ icon:"📱", color:T.violet,   bg:T.violetDim },
  "Hogar":        { icon:"🏠", color:T.orange,   bg:"#F9731612" },
  "Educación":    { icon:"📚", color:T.gold,     bg:T.goldDim },
  "Otro":         { icon:"💸", color:T.t3,       bg:T.bg3 },
};

const TODAY         = new Date();
const DAY           = TODAY.getDate();
const DAYS_IN_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth()+1, 0).getDate();
const MONTH_STR     = TODAY.toLocaleString("es-DO",{month:"long"}).toUpperCase();

// ══════════════════════════════════════════════════════════════════════════════
// PERSISTENCIA
// ══════════════════════════════════════════════════════════════════════════════
const K = { user:"mf2_user", onboarded:"mf2_onboarded", expenses:"mf2_expenses", goals:"mf2_goals", debts:"mf2_debts", income:"mf2_income", reminders:"mf2_reminders", budgets:"mf2_budgets" };

async function save(key, val) {
  try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch{}
}
async function load(key) {
  try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : null; } catch{ return null; }
}

function usePersist(key, def) {
  const [state, _set] = useState(def);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    load(key).then(v => { if(v !== null) _set(v); setReady(true); });
  }, []);
  const set = useCallback((v) => {
    _set(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      save(key, next);
      return next;
    });
  }, [key]);
  return [state, set, ready];
}

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════════════════════
const S_EXPENSES = [
  {id:1,desc:"Supermercados Nacional",amount:2800,cat:"Alimentación",date:"2025-06-10"},
  {id:2,desc:"Gasolina Shell",        amount:1500,cat:"Transporte",   date:"2025-06-09"},
  {id:3,desc:"Netflix",               amount:580, cat:"Suscripciones",date:"2025-06-08"},
  {id:4,desc:"Farmacia Carol",        amount:900, cat:"Salud",        date:"2025-06-07"},
  {id:5,desc:"Restaurante El Mesón",  amount:1200,cat:"Ocio",         date:"2025-06-06"},
  {id:6,desc:"Spotify",               amount:290, cat:"Suscripciones",date:"2025-06-05"},
  {id:7,desc:"Bravo Supermercado",    amount:3100,cat:"Alimentación", date:"2025-06-04"},
];
const S_GOALS = [
  {id:1,name:"PC Gaming",    emoji:"🖥️",target:50000,saved:18500,weeks:24},
  {id:2,name:"Viaje México", emoji:"✈️",target:80000,saved:12000,weeks:40},
];
const S_DEBTS = [
  {id:1,type:"tarjeta", name:"Tarjeta BHD",   balance:35000, rate:24,minPay:1200,limit:50000, color:T.rose},
  {id:2,type:"prestamo",name:"Préstamo Banco", balance:120000,rate:18,minPay:4500,limit:120000,color:T.gold},
  {id:3,type:"tarjeta", name:"Tarjeta Popular",balance:15000, rate:28,minPay:600, limit:30000, color:T.violet},
];
const S_INCOME    = [{id:1,source:"Salario",amount:45000,date:"2025-06-01",type:"fijo"},{id:2,source:"Freelance",amount:12000,date:"2025-06-15",type:"variable"}];
const S_REMINDERS = [{id:1,name:"Netflix",amount:580,day:8,active:true},{id:2,name:"Préstamo BHD",amount:4500,day:15,active:true},{id:3,name:"Internet Claro",amount:1800,day:20,active:true}];
const S_BUDGETS   = {Alimentación:8000,Transporte:4000,Ocio:3000,Suscripciones:1500};

// ══════════════════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════════════════
function parseNLP(text) {
  const lower = text.toLowerCase();
  const m = text.match(/[\d,]+(\.\d+)?/);
  const amount = m ? parseFloat(m[0].replace(",","")) : null;
  let cat = "Otro";
  if(/gasolina|uber|combustible|transport/.test(lower)) cat="Transporte";
  else if(/comida|supermercado|nacional|bravo|restaurante|almuerzo|cena/.test(lower)) cat="Alimentación";
  else if(/netflix|spotify|suscripci|disney|amazon/.test(lower)) cat="Suscripciones";
  else if(/farmacia|medic|doctor|salud|pastilla/.test(lower)) cat="Salud";
  else if(/ocio|fiesta|cine|bar|juego/.test(lower)) cat="Ocio";
  else if(/casa|hogar|alquiler|luz|agua/.test(lower)) cat="Hogar";
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now()-86400000).toISOString().split("T")[0];
  const date = /ayer/.test(lower)?yesterday:today;
  const descM = text.match(/en\s+(.+?)(\s+hoy|\s+ayer|$)/i);
  const raw = descM ? descM[1].trim() : cat;
  return {amount,cat,date,desc:raw.charAt(0).toUpperCase()+raw.slice(1)};
}

function calcScore(expenses, income, budgets) {
  const totalExp = expenses.reduce((a,e)=>a+e.amount,0);
  const savePct  = income>0 ? ((income-totalExp)/income)*100 : 0;
  const catTotals={};
  expenses.forEach(e=>{catTotals[e.cat]=(catTotals[e.cat]||0)+e.amount;});
  const s = {
    ahorro:      Math.min(100,Math.max(0,savePct*2.5)),
    presupuesto: (()=>{const c=Object.entries(budgets);if(!c.length)return 80;const o=c.filter(([k,l])=>(catTotals[k]||0)>l).length;return Math.max(0,100-(o/c.length)*100);})(),
    consistencia:Math.min(100,(expenses.length/15)*100),
    deuda:       85,
  };
  const total = Math.round(s.ahorro*.4+s.presupuesto*.3+s.consistencia*.2+s.deuda*.1);
  const grade = total>=85?{label:"Excelente",color:T.emerald,emoji:"🏆"}:total>=70?{label:"Bueno",color:T.mint,emoji:"✅"}:total>=50?{label:"Regular",color:T.gold,emoji:"⚠️"}:{label:"Crítico",color:T.rose,emoji:"🚨"};
  return {total,scores:s,grade};
}

function moPay(balance,rate,payment) {
  const r=rate/100/12;
  if(payment<=r*balance) return Infinity;
  if(r===0) return Math.ceil(balance/payment);
  return Math.ceil(Math.log(payment/(payment-r*balance))/Math.log(1+r));
}

function fmt(n, cur="RD$") { return `${cur}${Math.abs(n).toLocaleString("es-DO")}`; }

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// Premium card with optional glow
function PCard({children, glow, danger, style}) {
  return (
    <View style={[
      st.card,
      glow  && {borderColor:T.mintMid, backgroundColor:"#00100A"},
      danger && {borderColor:T.rose+"40", backgroundColor:T.roseDim},
      style
    ]}>
      {children}
    </View>
  );
}

// Section label
function Label({text, style}) {
  return <Text style={[st.label, style]}>{text}</Text>;
}

// Premium button
function PBtn({label, onPress, variant="primary", style, disabled}) {
  const bg = disabled ? T.bg3 :
    variant==="primary" ? T.mint :
    variant==="danger"  ? T.rose :
    variant==="ghost"   ? "transparent" : T.bg3;
  const tx = disabled ? T.t3 :
    variant==="ghost" ? T.t2 : "#000";
  return (
    <TouchableOpacity
      onPress={disabled ? null : onPress}
      activeOpacity={0.75}
      style={[st.btn, {backgroundColor:bg, borderWidth:variant==="ghost"?1:0, borderColor:T.b2}, style]}
    >
      <Text style={[st.btnTx, {color:tx}]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Input field
function PInput({placeholder, value, onChange, keyboard, style, secure, autoFocus}) {
  return (
    <TextInput
      style={[st.input, style]}
      placeholder={placeholder}
      placeholderTextColor={T.t4}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboard||"default"}
      secureTextEntry={secure}
      autoFocus={autoFocus}
    />
  );
}

// Tag/badge
function Tag({label, color}) {
  return (
    <View style={{backgroundColor:color+"20", borderRadius:6, paddingHorizontal:8, paddingVertical:3}}>
      <Text style={{fontSize:10, fontWeight:"700", color, letterSpacing:.5}}>{label}</Text>
    </View>
  );
}

// Progress bar
function PBar({pct, color, height=4, style}) {
  const clampedPct = Math.min(pct, 100);
  const barColor = pct>90 ? T.rose : pct>70 ? T.gold : color;
  return (
    <View style={[{height, borderRadius:99, backgroundColor:T.b1, overflow:"hidden"}, style]}>
      <View style={{height:"100%", width:`${clampedPct}%`, borderRadius:99, backgroundColor:barColor}}/>
    </View>
  );
}

// Row with icon
function IconRow({icon, title, subtitle, right, rightColor, onPress, style}) {
  const Inner = (
    <View style={[{flexDirection:"row", alignItems:"center", gap:12}, style]}>
      <View style={{width:42,height:42,borderRadius:13,backgroundColor:T.bg3,alignItems:"center",justifyContent:"center"}}>
        <Text style={{fontSize:19}}>{icon}</Text>
      </View>
      <View style={{flex:1}}>
        <Text style={{fontSize:13,fontWeight:"600",color:T.t1}} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={{fontSize:11,color:T.t3,marginTop:1}}>{subtitle}</Text>}
      </View>
      {!!right && <Text style={{fontSize:14,fontWeight:"700",color:rightColor||T.t1}}>{right}</Text>}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity> : Inner;
}

// Screen header
function Header({title, subtitle}) {
  return (
    <View style={{paddingHorizontal:20, paddingTop:8, paddingBottom:12}}>
      {!!subtitle && <Text style={{fontSize:11,color:T.t3,letterSpacing:2,marginBottom:2}}>{subtitle}</Text>}
      <Text style={{fontSize:24,fontWeight:"800",color:T.t1,letterSpacing:-.5}}>{title}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOADING SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function LoadingScreen() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, {toValue:1, duration:1000, useNativeDriver:true}),
      Animated.timing(anim, {toValue:0, duration:1000, useNativeDriver:true}),
    ])).start();
  }, []);
  return (
    <View style={{flex:1,backgroundColor:T.bg0,alignItems:"center",justifyContent:"center"}}>
      <Animated.Text style={{fontSize:52,opacity:anim}}>💰</Animated.Text>
      <Text style={{fontSize:26,fontWeight:"800",color:T.mint,marginTop:16,letterSpacing:-1}}>MiFinanzas</Text>
      <Text style={{fontSize:12,color:T.t3,marginTop:6}}>Cargando tu información...</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════════════════════════
function Onboarding({onComplete}) {
  const [step,     setStep]    = useState(0);
  const [name,     setName]    = useState("");
  const [currency, setCur]     = useState("RD$");
  const [income,   setIncome]  = useState("");
  const [extra,    setExtra]   = useState("");
  const [budgets,  setBudgets] = useState({Alimentación:"",Transporte:"",Ocio:"",Suscripciones:""});
  const [gName,    setGName]   = useState("");
  const [gEmoji,   setGEmoji]  = useState("🎯");
  const [gTarget,  setGTarget] = useState("");
  const [gWeeks,   setGWeeks]  = useState("24");

  const finish = () => {
    const bud = {};
    Object.entries(budgets).forEach(([k,v]) => { if(v) bud[k]=+v; });
    const goals = gName&&gTarget ? [{id:1,name:gName,emoji:gEmoji,target:+gTarget,saved:0,weeks:+gWeeks}] : [];
    const inc = [];
    if(income) inc.push({id:1,source:"Salario",amount:+income,date:new Date().toISOString().split("T")[0],type:"fijo"});
    if(extra)  inc.push({id:2,source:"Variable",amount:+extra,date:new Date().toISOString().split("T")[0],type:"variable"});
    onComplete({name, currency, budgets:Object.keys(bud).length?bud:S_BUDGETS, goals, income:inc.length?inc:S_INCOME});
  };

  const DOTS = Array(5).fill(0);

  const Dots = ({current}) => (
    <View style={{flexDirection:"row",gap:5,justifyContent:"center",marginBottom:32}}>
      {DOTS.map((_,i) => (
        <View key={i} style={{height:3,borderRadius:99,backgroundColor:i<=current?T.mint:T.b2,width:i===current?22:6}}/>
      ))}
    </View>
  );

  // STEP 0 — Welcome
  if(step===0) return (
    <View style={{flex:1,backgroundColor:T.bg0}}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg0}/>
      <SafeAreaView style={{flex:1,justifyContent:"space-between",padding:24}}>
        <View style={{flex:1,alignItems:"center",justifyContent:"center"}}>
          {/* Hero */}
          <View style={{width:96,height:96,borderRadius:28,backgroundColor:T.mintDim,borderWidth:1.5,borderColor:T.mintMid,alignItems:"center",justifyContent:"center",marginBottom:24}}>
            <Text style={{fontSize:44}}>💰</Text>
          </View>
          <Text style={{fontSize:30,fontWeight:"800",color:T.t1,textAlign:"center",letterSpacing:-.5,marginBottom:10}}>
            Tu dinero,{"\n"}<Text style={{color:T.mint}}>bajo control.</Text>
          </Text>
          <Text style={{fontSize:14,color:T.t2,textAlign:"center",lineHeight:22,marginBottom:32}}>
            Finanzas personales con IA para República Dominicana.
          </Text>
          {/* Features */}
          {[["⚡","Registra gastos con voz o texto"],["📊","Alertas inteligentes de presupuesto"],["🎯","Metas de ahorro con progreso visual"],["💾","Tus datos siempre guardados"]].map(([ic,txt]) => (
            <View key={txt} style={{flexDirection:"row",alignItems:"center",gap:14,marginBottom:10,width:"100%",padding:14,backgroundColor:T.bg2,borderRadius:14,borderWidth:1,borderColor:T.b1}}>
              <Text style={{fontSize:18}}>{ic}</Text>
              <Text style={{fontSize:13,color:T.t2,flex:1}}>{txt}</Text>
            </View>
          ))}
        </View>
        <PBtn label="Comenzar →" onPress={()=>setStep(1)} style={{marginTop:16}}/>
      </SafeAreaView>
    </View>
  );

  // STEP 1 — Nombre
  if(step===1) return (
    <SafeAreaView style={[st.obWrap]}>
      <Dots current={1}/>
      <Text style={st.obTitle}>¿Cómo te llamamos? 👋</Text>
      <Text style={st.obSub}>Personaliza tu experiencia.</Text>
      <View style={{flex:1}}>
        <Label text="TU NOMBRE" style={{marginBottom:8}}/>
        <PInput placeholder="ej: Carlos, María..." value={name} onChange={setName} autoFocus/>
        <Label text="MONEDA" style={{marginTop:16,marginBottom:10}}/>
        <View style={{flexDirection:"row",gap:8}}>
          {["RD$","$","€","Q"].map(c => (
            <TouchableOpacity key={c} onPress={()=>setCur(c)} style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:currency===c?T.mint:T.b2,backgroundColor:currency===c?T.mintDim:T.bg2,alignItems:"center"}}>
              <Text style={{fontWeight:"800",fontSize:15,color:currency===c?T.mint:T.t3}}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atrás" onPress={()=>setStep(0)} variant="ghost" style={{flex:1}}/>
        <PBtn label="Continuar →" onPress={()=>name&&setStep(2)} disabled={!name} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );

  // STEP 2 — Ingresos
  if(step===2) return (
    <SafeAreaView style={st.obWrap}>
      <Dots current={2}/>
      <Text style={st.obTitle}>Tus ingresos 💼</Text>
      <Text style={st.obSub}>Aproximado está bien, puedes editarlo después.</Text>
      <View style={{flex:1}}>
        <PCard glow style={{marginBottom:14,marginHorizontal:0}}>
          <Text style={{fontSize:11,color:T.mint,fontWeight:"700",marginBottom:3}}>💡 ¿Para qué sirve esto?</Text>
          <Text style={{fontSize:12,color:T.t2,lineHeight:18}}>Calculamos tu tasa de ahorro, alertas de presupuesto y proyecciones personalizadas.</Text>
        </PCard>
        <Label text={`INGRESO FIJO MENSUAL (${currency})`} style={{marginBottom:8}}/>
        <PInput placeholder="ej: 45,000" value={income} onChange={setIncome} keyboard="numeric"/>
        <Label text={`INGRESOS VARIABLES (${currency})`} style={{marginTop:12,marginBottom:4}}/>
        <Text style={{fontSize:11,color:T.t3,marginBottom:8}}>Freelance, negocio propio, bonos... (opcional)</Text>
        <PInput placeholder="ej: 10,000" value={extra} onChange={setExtra} keyboard="numeric"/>
        {!!income && (
          <View style={{backgroundColor:T.bg3,borderRadius:12,padding:14,marginTop:4}}>
            <Text style={{fontSize:11,color:T.t3}}>Total mensual estimado</Text>
            <Text style={{fontSize:22,fontWeight:"800",color:T.mint}}>{currency}{(+income+(+extra||0)).toLocaleString()}</Text>
          </View>
        )}
      </View>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atrás" onPress={()=>setStep(1)} variant="ghost" style={{flex:1}}/>
        <PBtn label="Continuar →" onPress={()=>setStep(3)} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );

  // STEP 3 — Presupuestos
  if(step===3) return (
    <SafeAreaView style={st.obWrap}>
      <Dots current={3}/>
      <Text style={st.obTitle}>Tus límites 📊</Text>
      <Text style={st.obSub}>Cuánto quieres gastar por categoría al mes.</Text>
      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
        {Object.keys(budgets).map(cat => (
          <View key={cat} style={{marginBottom:14}}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:8}}>
              <View style={{width:32,height:32,borderRadius:9,backgroundColor:CATS[cat]?.bg||T.bg3,alignItems:"center",justifyContent:"center"}}>
                <Text style={{fontSize:15}}>{CATS[cat]?.icon}</Text>
              </View>
              <Text style={{fontSize:14,fontWeight:"600",color:T.t1}}>{cat}</Text>
            </View>
            <PInput placeholder={`Límite en ${currency} (opcional)`} value={budgets[cat]} onChange={v=>setBudgets({...budgets,[cat]:v})} keyboard="numeric"/>
          </View>
        ))}
        <View style={{backgroundColor:T.goldDim,borderRadius:12,borderWidth:1,borderColor:T.gold+"30",padding:12,marginBottom:20}}>
          <Text style={{fontSize:11,color:T.t2,lineHeight:18}}>💡 Puedes dejarlo en blanco y ajustarlo después desde la app.</Text>
        </View>
      </ScrollView>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atrás" onPress={()=>setStep(2)} variant="ghost" style={{flex:1}}/>
        <PBtn label="Continuar →" onPress={()=>setStep(4)} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );

  // STEP 4 — Primera Meta
  if(step===4) return (
    <SafeAreaView style={st.obWrap}>
      <Dots current={4}/>
      <Text style={st.obTitle}>Tu primera meta 🎯</Text>
      <Text style={st.obSub}>¿Qué estás ahorrando? (opcional, puedes saltarte)</Text>
      <View style={{flex:1}}>
        <Label text="¿QUÉ QUIERES LOGRAR?" style={{marginBottom:8}}/>
        <PInput placeholder="ej: Laptop, Viaje, Fondo de emergencia..." value={gName} onChange={setGName}/>
        <View style={{flexDirection:"row",gap:10}}>
          <View style={{flex:1}}>
            <Label text="EMOJI" style={{marginBottom:8}}/>
            <PInput value={gEmoji} onChange={setGEmoji} style={{textAlign:"center",fontSize:24}}/>
          </View>
          <View style={{flex:2.5}}>
            <Label text={`CUÁNTO CUESTA (${currency})`} style={{marginBottom:8}}/>
            <PInput placeholder="ej: 50,000" value={gTarget} onChange={setGTarget} keyboard="numeric"/>
          </View>
        </View>
        <Label text="PLAZO" style={{marginBottom:10}}/>
        <View style={{flexDirection:"row",gap:8,marginBottom:16}}>
          {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 año"]].map(([w,l]) => (
            <TouchableOpacity key={w} onPress={()=>setGWeeks(w)} style={{flex:1,paddingVertical:10,borderRadius:11,borderWidth:1.5,borderColor:gWeeks===w?T.mint:T.b2,backgroundColor:gWeeks===w?T.mintDim:T.bg2,alignItems:"center"}}>
              <Text style={{fontSize:11,fontWeight:"700",color:gWeeks===w?T.mint:T.t3}}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {gName&&gTarget&&(
          <PCard glow style={{marginHorizontal:0}}>
            <Text style={{fontSize:11,color:T.t3,marginBottom:4}}>Para lograrlo necesitas apartar:</Text>
            <Text style={{fontSize:24,fontWeight:"800",color:T.mint}}>{currency}{Math.ceil(+gTarget/+gWeeks).toLocaleString()}</Text>
            <Text style={{fontSize:11,color:T.t3,marginTop:2}}>por semana durante {gWeeks} semanas</Text>
          </PCard>
        )}
      </View>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atrás" onPress={()=>setStep(3)} variant="ghost" style={{flex:1}}/>
        <PBtn label="¡Empezar! 🚀" onPress={finish} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function HomeScreen({expenses, income, budgets, user}) {
  const cur = user.currency;
  const totalExp = expenses.reduce((a,e)=>a+e.amount,0);
  const totalInc = income.reduce((a,i)=>a+i.amount,0);
  const balance  = totalInc - totalExp;
  const savePct  = totalInc>0 ? Math.round((balance/totalInc)*100) : 0;
  const catTotals = {};
  expenses.forEach(e=>{catTotals[e.cat]=(catTotals[e.cat]||0)+e.amount;});
  const maxCat = Math.max(...Object.values(catTotals),1);
  const {total:score,grade} = calcScore(expenses,totalInc,budgets);
  const alerts = Object.entries(budgets)
    .map(([cat,lim])=>({cat,pct:((catTotals[cat]||0)/lim)*100}))
    .filter(a=>a.pct>=70).sort((a,b)=>b.pct-a.pct);

  return (
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
        {/* Top bar */}
        <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:20,paddingTop:8,paddingBottom:16}}>
          <View>
            <Text style={{fontSize:12,color:T.t3,letterSpacing:.5}}>{MONTH_STR} 2025</Text>
            <Text style={{fontSize:20,fontWeight:"800",color:T.t1,letterSpacing:-.3}}>Mi<Text style={{color:T.mint}}>Finanzas</Text></Text>
          </View>
          <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
            <View style={{backgroundColor:grade.color+"25",borderRadius:10,paddingHorizontal:10,paddingVertical:6,flexDirection:"row",alignItems:"center",gap:5}}>
              <Text style={{fontSize:12}}>{grade.emoji}</Text>
              <Text style={{fontSize:12,fontWeight:"700",color:grade.color}}>{score}pts</Text>
            </View>
            <View style={{width:38,height:38,borderRadius:12,backgroundColor:T.mintDim,borderWidth:1,borderColor:T.mintMid,alignItems:"center",justifyContent:"center"}}>
              <Text style={{fontSize:18}}>👤</Text>
            </View>
          </View>
        </View>

        {/* Balance Hero */}
        <View style={{marginHorizontal:16,marginBottom:14,backgroundColor:"#00100A",borderRadius:24,borderWidth:1,borderColor:T.mintMid,padding:22,overflow:"hidden"}}>
          <Text style={{fontSize:11,color:T.mint,letterSpacing:2,marginBottom:6}}>BALANCE DISPONIBLE</Text>
          <Text style={{fontSize:42,fontWeight:"800",color:T.mint,letterSpacing:-1.5,lineHeight:48}}>
            {cur}{balance.toLocaleString("es-DO")}
          </Text>
          <View style={{flexDirection:"row",gap:0,marginTop:18,borderTopWidth:1,borderTopColor:T.mintMid+"50",paddingTop:14}}>
            {[
              [fmt(totalInc,cur),"Ingresos",T.mint],
              [fmt(totalExp,cur),"Gastos",T.rose],
              [`${savePct}%`,"Ahorro",T.gold],
            ].map(([v,l,c],i)=>(
              <View key={l} style={{flex:1,borderRightWidth:i<2?1:0,borderRightColor:T.mintMid+"40",paddingHorizontal:i>0?14:0}}>
                <Text style={{fontSize:11,color:T.t3,marginBottom:3}}>{l}</Text>
                <Text style={{fontSize:14,fontWeight:"700",color:c}}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Alerts */}
        {alerts.length>0 && (
          <PCard style={{marginBottom:14}}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:12}}>
              <View style={{width:28,height:28,borderRadius:8,backgroundColor:T.goldDim,alignItems:"center",justifyContent:"center"}}>
                <Text style={{fontSize:14}}>⚡</Text>
              </View>
              <Text style={{fontSize:13,fontWeight:"700",color:T.gold}}>Alertas de Presupuesto</Text>
            </View>
            {alerts.map(({cat,pct}) => (
              <View key={cat} style={{marginBottom:12}}>
                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                    <Text style={{fontSize:16}}>{CATS[cat]?.icon}</Text>
                    <Text style={{fontSize:13,color:T.t1}}>{cat}</Text>
                  </View>
                  <Tag label={`${Math.round(pct)}%`} color={pct>100?T.rose:T.gold}/>
                </View>
                <PBar pct={pct} color={CATS[cat]?.color||T.mint}/>
              </View>
            ))}
          </PCard>
        )}

        {/* Spending chart */}
        {Object.keys(catTotals).length>0 && (
          <PCard style={{marginBottom:14}}>
            <Text style={{fontSize:13,fontWeight:"700",color:T.t1,marginBottom:14}}>Gastos del mes</Text>
            {Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt]) => (
              <View key={cat} style={{marginBottom:12}}>
                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                    <View style={{width:28,height:28,borderRadius:8,backgroundColor:CATS[cat]?.bg||T.bg3,alignItems:"center",justifyContent:"center"}}>
                      <Text style={{fontSize:14}}>{CATS[cat]?.icon}</Text>
                    </View>
                    <Text style={{fontSize:13,color:T.t2}}>{cat}</Text>
                  </View>
                  <Text style={{fontSize:13,fontWeight:"700",color:T.t1}}>{fmt(amt,cur)}</Text>
                </View>
                <PBar pct={(amt/maxCat)*100} color={CATS[cat]?.color||T.mint} height={3}/>
              </View>
            ))}
          </PCard>
        )}

        {/* Recent transactions */}
        <PCard>
          <Text style={{fontSize:13,fontWeight:"700",color:T.t1,marginBottom:14}}>Últimos movimientos</Text>
          {expenses.length===0
            ? <Text style={{fontSize:13,color:T.t3,textAlign:"center",paddingVertical:20}}>Sin movimientos — usa el Asistente IA para registrar 🤖</Text>
            : expenses.slice(0,6).map((e,i) => (
              <View key={e.id}>
                <IconRow
                  icon={CATS[e.cat]?.icon||"💸"}
                  title={e.desc}
                  subtitle={e.date}
                  right={`-${fmt(e.amount,cur)}`}
                  rightColor={T.rose}
                />
                {i<Math.min(expenses.length,6)-1 && <View style={{height:1,backgroundColor:T.b1,marginVertical:10,marginLeft:54}}/>}
              </View>
            ))
          }
        </PCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAT SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function ChatScreen({expenses, setExpenses, goals, income, debts, user, budgets}) {
  const cur = user.currency;
  const totalInc = income.reduce((a,i)=>a+i.amount,0);
  const [msgs, setMsgs] = useState([{
    role:"bot",
    text:`¡Hola ${user.name}! 👋\n\nSoy tu asistente financiero IA. Puedo ayudarte:\n\n• "Gasté 800 en gasolina hoy"\n• "¿Cuánto llevo en alimentación?"\n• "Consejos para ahorrar más"\n• "¿Cómo están mis deudas?"`
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();

  const send = async () => {
    if(!input.trim()||loading) return;
    const msg = input.trim(); setInput("");
    setMsgs(m=>[...m,{role:"user",text:msg}]);
    setLoading(true);
    const lower = msg.toLowerCase();
    const isEntry = /gast[eé]|pagu[eé]|compr[eé]/.test(lower);
    const parsed = parseNLP(msg);
    if(isEntry && parsed.amount) {
      const newE = {id:Date.now(),desc:parsed.desc,amount:parsed.amount,cat:parsed.cat,date:parsed.date};
      setExpenses(p=>[newE,...p]);
      setLoading(false);
      setMsgs(m=>[...m,{role:"bot",text:`✅ ¡Guardado!\n\n${CATS[parsed.cat]?.icon} ${parsed.desc}\n${cur}${parsed.amount.toLocaleString()} · ${parsed.cat}\n${parsed.date}`}]);
      return;
    }
    const catTotals={};
    expenses.forEach(e=>{catTotals[e.cat]=(catTotals[e.cat]||0)+e.amount;});
    const totalExp = expenses.reduce((a,e)=>a+e.amount,0);
    const ctx = `Eres un asistente financiero personal. Usuario: ${user.name}. Moneda: ${cur}. Balance: ${cur}${(totalInc-totalExp).toLocaleString()}, Ingresos: ${cur}${totalInc.toLocaleString()}, Gastos por categoría: ${JSON.stringify(catTotals)}, Presupuestos: ${JSON.stringify(budgets)}, Deudas: ${debts.map(d=>`${d.name}: ${cur}${d.balance} al ${d.rate}%`).join(", ")}, Metas: ${goals.map(g=>`${g.name}: ${g.saved}/${g.target}`).join(", ")}. Responde en español dominicano, amigable, conciso, con emojis. Máximo 3 párrafos cortos.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":"TU_API_KEY_AQUI","anthropic-version":"2023-06-01"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:ctx,messages:[{role:"user",content:msg}]})
      });
      const data = await res.json();
      setMsgs(m=>[...m,{role:"bot",text:data.content?.[0]?.text||"No pude responder."}]);
    } catch {
      setMsgs(m=>[...m,{role:"bot",text:"❌ Agrega tu API key de Anthropic para activar la IA completa.\n\nPara registrar gastos escribe:\n\"Gasté [monto] en [concepto]\""}]);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <Header subtitle="ASISTENTE" title="Chat IA 🤖"/>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          style={{flex:1}}
          contentContainerStyle={{padding:16,paddingBottom:20}}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={()=>scrollRef.current?.scrollToEnd({animated:true})}
        >
          {msgs.map((m,i) => (
            <View key={i} style={{marginBottom:10,alignItems:m.role==="user"?"flex-end":"flex-start"}}>
              {m.role==="bot" && (
                <View style={{width:28,height:28,borderRadius:8,backgroundColor:T.mintDim,borderWidth:1,borderColor:T.mintMid,alignItems:"center",justifyContent:"center",marginBottom:4}}>
                  <Text style={{fontSize:14}}>🤖</Text>
                </View>
              )}
              <View style={{
                maxWidth:"82%",padding:13,
                borderRadius:16,
                backgroundColor:m.role==="user"?T.mint:T.bg2,
                borderWidth:m.role==="bot"?1:0,
                borderColor:T.b2,
                borderBottomRightRadius:m.role==="user"?4:16,
                borderBottomLeftRadius:m.role==="bot"?4:16,
              }}>
                <Text style={{fontSize:13,color:m.role==="user"?"#000":T.t1,lineHeight:20,fontWeight:m.role==="user"?"600":"400"}}>{m.text}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={{alignItems:"flex-start"}}>
              <View style={{backgroundColor:T.bg2,borderWidth:1,borderColor:T.b2,borderRadius:16,padding:14,flexDirection:"row",gap:5}}>
                {[0,1,2].map(i=><View key={i} style={{width:6,height:6,borderRadius:3,backgroundColor:T.mint,opacity:.6+i*.2}}/>)}
              </View>
            </View>
          )}
        </ScrollView>
        <View style={{flexDirection:"row",gap:10,padding:14,paddingBottom:20,backgroundColor:T.bg0,borderTopWidth:1,borderTopColor:T.b1}}>
          <TextInput
            style={[st.input,{flex:1,marginBottom:0}]}
            placeholder="Escribe un gasto o pregunta..."
            placeholderTextColor={T.t4}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={send} style={{width:48,height:48,backgroundColor:T.mint,borderRadius:14,alignItems:"center",justifyContent:"center"}} activeOpacity={0.8}>
            <Text style={{fontSize:20,color:"#000",fontWeight:"800"}}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEUDAS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function DeudasScreen({debts, setDebts, user}) {
  const cur = user.currency;
  const [view, setView]   = useState("lista");
  const [method, setMethod] = useState("avalanche");
  const [extra, setExtra]   = useState("2000");
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({type:"tarjeta",name:"",balance:"",rate:"",minPay:"",limit:""});
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const TYPES = [
    {id:"tarjeta", icon:"💳",label:"Tarjeta", color:T.rose},
    {id:"prestamo",icon:"🏦",label:"Préstamo",color:T.gold},
    {id:"hipoteca",icon:"🏠",label:"Hipoteca",color:T.sky},
    {id:"auto",    icon:"🚗",label:"Auto",    color:T.violet},
    {id:"informal",icon:"🤝",label:"Informal",color:T.emerald},
    {id:"otro",    icon:"📋",label:"Otro",    color:T.t3},
  ];

  const totalDebt = debts.reduce((a,d)=>a+d.balance,0);
  const totalMin  = debts.reduce((a,d)=>a+d.minPay,0);
  const sorted = [...debts].sort((a,b)=>method==="avalanche"?b.rate-a.rate:a.balance-b.balance);

  const addDebt = () => {
    if(!form.name||!form.balance) return;
    const t = TYPES.find(x=>x.id===form.type)||TYPES[5];
    setDebts([...debts,{id:Date.now(),...form,balance:+form.balance,rate:+form.rate||0,minPay:+form.minPay||0,limit:+(form.limit||form.balance),color:t.color}]);
    setAdding(false); setForm({type:"tarjeta",name:"",balance:"",rate:"",minPay:"",limit:""});
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <Header subtitle="GESTIÓN" title="Mis Deudas 💳"/>
      {/* Tab switcher */}
      <View style={{flexDirection:"row",marginHorizontal:16,marginBottom:12,backgroundColor:T.bg2,borderRadius:14,padding:4,borderWidth:1,borderColor:T.b1}}>
        {[["lista","📋 Lista"],["estrategia","🏆 Estrategia"]].map(([id,label]) => (
          <TouchableOpacity key={id} onPress={()=>setView(id)} style={{flex:1,paddingVertical:9,borderRadius:11,backgroundColor:view===id?T.bg4:"transparent",alignItems:"center"}}>
            <Text style={{fontSize:13,fontWeight:"700",color:view===id?T.t1:T.t3}}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
        {/* Summary */}
        {debts.length>0 && (
          <PCard danger style={{marginBottom:14}}>
            <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}>
              <View>
                <Text style={{fontSize:10,color:T.t3,letterSpacing:1.5,marginBottom:4}}>DEUDA TOTAL</Text>
                <Text style={{fontSize:32,fontWeight:"800",color:T.rose,letterSpacing:-.5}}>{fmt(totalDebt,cur)}</Text>
              </View>
              <View style={{alignItems:"flex-end"}}>
                <Text style={{fontSize:10,color:T.t3,letterSpacing:1,marginBottom:4}}>PAGO MÍNIMO/MES</Text>
                <Text style={{fontSize:20,fontWeight:"700",color:T.gold}}>{fmt(totalMin,cur)}</Text>
              </View>
            </View>
          </PCard>
        )}

        {view==="lista" && (
          <>
            {debts.length===0 && !adding && (
              <PCard style={{alignItems:"center",paddingVertical:36}}>
                <Text style={{fontSize:44,marginBottom:14}}>🎉</Text>
                <Text style={{fontSize:16,fontWeight:"700",color:T.t1,marginBottom:6}}>Sin deudas registradas</Text>
                <Text style={{fontSize:13,color:T.t3,textAlign:"center"}}>¡Eso es una excelente señal financiera!</Text>
              </PCard>
            )}
            {debts.map(d => {
              const t = TYPES.find(x=>x.id===d.type)||TYPES[5];
              const pctPaid = d.limit>0 ? Math.round(((d.limit-d.balance)/d.limit)*100) : 0;
              const mo = moPay(d.balance,d.rate,d.minPay+Number(extra||0));
              const timeLabel = mo===Infinity?"Solo intereses":mo>24?`${(mo/12).toFixed(1)} años`:`${mo} meses`;
              return (
                <PCard key={d.id} style={{marginBottom:12,borderLeftWidth:3,borderLeftColor:d.color||t.color}}>
                  <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                      <View style={{width:40,height:40,borderRadius:12,backgroundColor:(d.color||t.color)+"20",alignItems:"center",justifyContent:"center"}}>
                        <Text style={{fontSize:18}}>{t.icon}</Text>
                      </View>
                      <View>
                        <Text style={{fontSize:14,fontWeight:"700",color:T.t1}}>{d.name}</Text>
                        <Tag label={t.label} color={d.color||t.color}/>
                      </View>
                    </View>
                    <TouchableOpacity onPress={()=>setDebts(debts.filter(x=>x.id!==d.id))} style={{padding:4}}>
                      <Text style={{color:T.b3,fontSize:18}}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{flexDirection:"row",gap:0,marginBottom:14}}>
                    {[["Saldo",fmt(d.balance,cur),T.rose],["Tasa",`${d.rate}% anual`,T.gold],["Mín/mes",fmt(d.minPay,cur),T.t1]].map(([l,v,c],i)=>(
                      <View key={l} style={{flex:1,borderRightWidth:i<2?1:0,borderRightColor:T.b1,paddingRight:i<2?12:0,paddingLeft:i>0?12:0}}>
                        <Text style={{fontSize:10,color:T.t3,marginBottom:3}}>{l}</Text>
                        <Text style={{fontSize:13,fontWeight:"700",color:c}}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  {d.limit>0 && (
                    <View style={{marginBottom:12}}>
                      <View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:5}}>
                        <Text style={{fontSize:11,color:T.t3}}>Progreso de pago</Text>
                        <Text style={{fontSize:11,color:T.mint,fontWeight:"700"}}>{pctPaid}% pagado</Text>
                      </View>
                      <PBar pct={pctPaid} color={T.mint}/>
                    </View>
                  )}
                  <View style={{backgroundColor:T.bg3,borderRadius:10,padding:10,flexDirection:"row",justifyContent:"space-between"}}>
                    <Text style={{fontSize:12,color:T.t2}}>⏱ Libre en: <Text style={{color:T.mint,fontWeight:"700"}}>{timeLabel}</Text></Text>
                    {d.rate>0 && <Text style={{fontSize:12,color:T.t2}}>💸 <Text style={{color:T.rose,fontWeight:"700"}}>{fmt(Math.round(d.balance*d.rate/100),cur)}/año</Text></Text>}
                  </View>
                </PCard>
              );
            })}
            {adding ? (
              <PCard>
                <Text style={{fontSize:14,fontWeight:"700",color:T.t1,marginBottom:14}}>Nueva deuda</Text>
                <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:16}}>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t.id} onPress={()=>setF("type",t.id)} style={{paddingHorizontal:12,paddingVertical:8,borderRadius:10,borderWidth:1.5,borderColor:form.type===t.id?t.color:T.b2,backgroundColor:form.type===t.id?t.color+"20":T.bg2}}>
                      <Text style={{fontSize:12,fontWeight:"700",color:form.type===t.id?t.color:T.t3}}>{t.icon} {t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {[["name","Nombre del crédito","default"],["balance","Saldo actual","numeric"],["limit","Límite o monto original","numeric"],["rate","Tasa anual (%)","numeric"],["minPay","Pago mínimo mensual","numeric"]].map(([k,ph,kb]) => (
                  <PInput key={k} placeholder={ph} value={form[k]} onChange={v=>setF(k,v)} keyboard={kb}/>
                ))}
                <View style={{flexDirection:"row",gap:10,marginTop:4}}>
                  <PBtn label="Cancelar" onPress={()=>setAdding(false)} variant="ghost" style={{flex:1}}/>
                  <PBtn label="Guardar deuda" onPress={addDebt} style={{flex:2}}/>
                </View>
              </PCard>
            ) : (
              <View style={{marginHorizontal:16}}>
                <PBtn label="+ Agregar deuda" onPress={()=>setAdding(true)} variant="ghost"/>
              </View>
            )}
          </>
        )}

        {view==="estrategia" && (
          <>
            <View style={{flexDirection:"row",gap:10,marginHorizontal:16,marginBottom:12}}>
              {[["avalanche","🏔 Avalanche","Mayor tasa primero"],["snowball","⛄ Snowball","Menor saldo primero"]].map(([id,label,sub]) => (
                <TouchableOpacity key={id} onPress={()=>setMethod(id)} style={{flex:1,backgroundColor:method===id?T.mint:T.bg2,borderRadius:14,borderWidth:1,borderColor:method===id?T.mint:T.b2,padding:12,alignItems:"center"}}>
                  <Text style={{fontSize:13,fontWeight:"700",color:method===id?"#000":T.t1}}>{label}</Text>
                  <Text style={{fontSize:10,color:method===id?"#00000070":T.t3,marginTop:2}}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <PCard style={{marginBottom:12}}>
              <Text style={{fontSize:12,fontWeight:"700",color:T.t1,marginBottom:8}}>Abono extra mensual</Text>
              <View style={{flexDirection:"row",gap:10,alignItems:"center"}}>
                <PInput placeholder={cur} value={extra} onChange={setExtra} keyboard="numeric" style={{flex:1,marginBottom:0}}/>
                <Text style={{fontSize:12,color:T.mint,fontWeight:"700"}}>{cur}/mes</Text>
              </View>
            </PCard>
            {sorted.map((d,i) => {
              const payment = d.minPay+(i===0?+extra:0);
              const mo = moPay(d.balance,d.rate,payment);
              const timeLabel = mo===Infinity?"Solo intereses":mo>24?`${(mo/12).toFixed(1)} años`:`${mo} meses`;
              const t = TYPES.find(x=>x.id===d.type)||TYPES[5];
              return (
                <PCard key={d.id} style={{marginBottom:12,borderLeftWidth:3,borderLeftColor:d.color||t.color}}>
                  <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                      <View style={{width:28,height:28,borderRadius:8,backgroundColor:i===0?T.mint:T.bg3,alignItems:"center",justifyContent:"center"}}>
                        <Text style={{fontSize:13,fontWeight:"800",color:i===0?"#000":T.t3}}>{i+1}</Text>
                      </View>
                      <Text style={{fontSize:14,fontWeight:"700",color:T.t1}}>{d.name}</Text>
                    </View>
                    {i===0 && <Tag label="🎯 Atacar primero" color={T.mint}/>}
                  </View>
                  <View style={{flexDirection:"row",gap:0,marginBottom:12}}>
                    {[["Saldo",fmt(d.balance,cur),T.rose],["Tasa",`${d.rate}%`,T.gold],["Pago",fmt(payment,cur),T.t1]].map(([l,v,c],idx)=>(
                      <View key={l} style={{flex:1,borderRightWidth:idx<2?1:0,borderRightColor:T.b1,paddingRight:idx<2?12:0,paddingLeft:idx>0?12:0}}>
                        <Text style={{fontSize:10,color:T.t3,marginBottom:3}}>{l}</Text>
                        <Text style={{fontSize:13,fontWeight:"700",color:c}}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{backgroundColor:T.bg3,borderRadius:10,padding:10}}>
                    <Text style={{fontSize:12,color:T.t2}}>⏱ Libre en: <Text style={{color:T.mint,fontWeight:"700"}}>{timeLabel}</Text></Text>
                  </View>
                </PCard>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// METAS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function MetasScreen({goals, setGoals, user}) {
  const cur = user.currency;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({name:"",emoji:"🎯",target:"",weeks:"12"});
  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <Header subtitle="PLANIFICACIÓN" title="Metas de Ahorro 🎯"/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
        {goals.length===0 && !adding && (
          <PCard style={{alignItems:"center",paddingVertical:36}}>
            <Text style={{fontSize:44,marginBottom:14}}>🎯</Text>
            <Text style={{fontSize:16,fontWeight:"700",color:T.t1,marginBottom:6}}>Sin metas aún</Text>
            <Text style={{fontSize:13,color:T.t3,textAlign:"center"}}>Agrega tu primer objetivo y empieza a ahorrar con propósito.</Text>
          </PCard>
        )}
        {goals.map(g => {
          const pct = Math.min((g.saved/g.target)*100,100);
          const weekly = ((g.target-g.saved)/g.weeks).toFixed(0);
          const remaining = g.target - g.saved;
          return (
            <View key={g.id} style={[st.card,{marginBottom:12,backgroundColor:"#00100A",borderColor:T.mintMid}]}>
              <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
                  <View style={{width:48,height:48,borderRadius:14,backgroundColor:T.mintDim,borderWidth:1,borderColor:T.mintMid,alignItems:"center",justifyContent:"center"}}>
                    <Text style={{fontSize:22}}>{g.emoji}</Text>
                  </View>
                  <View>
                    <Text style={{fontSize:15,fontWeight:"700",color:T.t1}}>{g.name}</Text>
                    <Text style={{fontSize:11,color:T.t3,marginTop:2}}>{cur}{g.saved.toLocaleString()} de {cur}{g.target.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={{alignItems:"flex-end",gap:4}}>
                  <Tag label={`${Math.round(pct)}%`} color={T.mint}/>
                  <TouchableOpacity onPress={()=>setGoals(goals.filter(x=>x.id!==g.id))}>
                    <Text style={{fontSize:13,color:T.b3}}>× eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <PBar pct={pct} color={T.mint} height={6} style={{marginBottom:12}}/>
              <View style={{backgroundColor:T.bg2,borderRadius:10,padding:12,flexDirection:"row",justifyContent:"space-between"}}>
                <View>
                  <Text style={{fontSize:10,color:T.t3}}>Aparta por semana</Text>
                  <Text style={{fontSize:14,fontWeight:"700",color:T.mint}}>{cur}{Number(weekly).toLocaleString()}</Text>
                </View>
                <View style={{alignItems:"flex-end"}}>
                  <Text style={{fontSize:10,color:T.t3}}>Faltan</Text>
                  <Text style={{fontSize:14,fontWeight:"700",color:T.t1}}>{cur}{remaining.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          );
        })}
        {adding ? (
          <PCard>
            <Text style={{fontSize:14,fontWeight:"700",color:T.t1,marginBottom:16}}>Nueva meta</Text>
            <PInput placeholder="¿Qué quieres lograr?" value={form.name} onChange={v=>setF("name",v)}/>
            <View style={{flexDirection:"row",gap:10}}>
              <View style={{flex:1}}>
                <Label text="EMOJI" style={{marginBottom:8}}/>
                <PInput value={form.emoji} onChange={v=>setF("emoji",v)} style={{textAlign:"center",fontSize:24}}/>
              </View>
              <View style={{flex:2.5}}>
                <Label text={`COSTO (${cur})`} style={{marginBottom:8}}/>
                <PInput placeholder="ej: 50,000" value={form.target} onChange={v=>setF("target",v)} keyboard="numeric"/>
              </View>
            </View>
            <Label text="PLAZO" style={{marginBottom:10}}/>
            <View style={{flexDirection:"row",gap:8,marginBottom:14}}>
              {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 año"]].map(([w,l]) => (
                <TouchableOpacity key={w} onPress={()=>setF("weeks",w)} style={{flex:1,paddingVertical:10,borderRadius:11,borderWidth:1.5,borderColor:form.weeks===w?T.mint:T.b2,backgroundColor:form.weeks===w?T.mintDim:T.bg2,alignItems:"center"}}>
                  <Text style={{fontSize:11,fontWeight:"700",color:form.weeks===w?T.mint:T.t3}}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.name&&form.target && (
              <View style={{backgroundColor:T.mintDim,borderRadius:12,borderWidth:1,borderColor:T.mintMid,padding:12,marginBottom:14}}>
                <Text style={{fontSize:12,color:T.t2}}>Aparta <Text style={{color:T.mint,fontWeight:"700"}}>{cur}{Math.ceil(+form.target/+form.weeks).toLocaleString()}/semana</Text> durante {form.weeks} semanas.</Text>
              </View>
            )}
            <View style={{flexDirection:"row",gap:10}}>
              <PBtn label="Cancelar" onPress={()=>setAdding(false)} variant="ghost" style={{flex:1}}/>
              <PBtn label="Guardar meta" onPress={()=>{if(!form.name||!form.target)return;setGoals([...goals,{id:Date.now(),...form,target:+form.target,saved:0,weeks:+form.weeks}]);setAdding(false);setForm({name:"",emoji:"🎯",target:"",weeks:"12"});}} style={{flex:2}}/>
            </View>
          </PCard>
        ) : (
          <View style={{marginHorizontal:16}}>
            <PBtn label="+ Nueva meta de ahorro" onPress={()=>setAdding(true)} variant="ghost"/>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MÁS SCREEN (Score + Predictor + Recordatorios)
// ══════════════════════════════════════════════════════════════════════════════
function MasScreen({expenses, income, budgets, reminders, setReminders, user}) {
  const cur = user.currency;
  const [subTab, setSubTab] = useState("score");
  const totalInc = income.reduce((a,i)=>a+i.amount,0);
  const totalExp = expenses.reduce((a,e)=>a+e.amount,0);
  const {total,scores,grade} = calcScore(expenses,totalInc,budgets);
  const savePct = totalInc>0 ? Math.round(((totalInc-totalExp)/totalInc)*100) : 0;
  const dailyAvg = totalExp/Math.max(DAY,1);
  const projected = totalExp+(dailyAvg*(DAYS_IN_MONTH-DAY));
  const balanceEOM = totalInc-projected;
  const runOutDay = balanceEOM<0 ? Math.round(DAY+(totalInc-totalExp)/dailyAvg) : null;
  const pctSpent = Math.min((projected/Math.max(totalInc,1))*100,120);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({name:"",amount:"",day:""});
  const today = new Date().getDate();
  const totalRem = reminders.filter(r=>r.active).reduce((a,r)=>a+r.amount,0);
  const upcoming = reminders.filter(r=>r.active&&r.day>=today).sort((a,b)=>a.day-b.day);
  const past = reminders.filter(r=>r.active&&r.day<today);

  return (
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <Header subtitle="" title="Herramientas 🛠️"/>
      {/* Sub tab bar */}
      <View style={{flexDirection:"row",marginHorizontal:16,marginBottom:12,backgroundColor:T.bg2,borderRadius:14,padding:4,borderWidth:1,borderColor:T.b1}}>
        {[["score","🌡️ Score"],["predictor","🔮 Predictor"],["recordatorios","🔔 Pagos"]].map(([id,label]) => (
          <TouchableOpacity key={id} onPress={()=>setSubTab(id)} style={{flex:1,paddingVertical:9,borderRadius:11,backgroundColor:subTab===id?T.bg4:"transparent",alignItems:"center"}}>
            <Text style={{fontSize:11,fontWeight:"700",color:subTab===id?T.t1:T.t3}}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>

        {/* ── SCORE ── */}
        {subTab==="score" && (
          <>
            <PCard glow style={{alignItems:"center",paddingVertical:28}}>
              <Text style={{fontSize:28,marginBottom:8}}>{grade.emoji}</Text>
              <Text style={{fontSize:60,fontWeight:"800",color:grade.color,letterSpacing:-2,lineHeight:65}}>{total}</Text>
              <Text style={{fontSize:13,color:T.t3,marginBottom:4}}>puntos de 100</Text>
              <Tag label={grade.label} color={grade.color}/>
              <Text style={{fontSize:12,color:T.t3,marginTop:10,textAlign:"center"}}>Tu salud financiera este mes</Text>
            </PCard>
            <PCard style={{marginBottom:12}}>
              <Text style={{fontSize:13,fontWeight:"700",color:T.t1,marginBottom:14}}>Desglose</Text>
              {[["💰 Tasa de ahorro",scores.ahorro,T.mint],["📊 Control presupuesto",scores.presupuesto,T.sky],["📝 Registro constante",scores.consistencia,T.violet],["💳 Manejo de deudas",scores.deuda,T.gold]].map(([label,val,color]) => (
                <View key={label} style={{marginBottom:12}}>
                  <View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:5}}>
                    <Text style={{fontSize:12,color:T.t2}}>{label}</Text>
                    <Text style={{fontSize:12,fontWeight:"700",color}}>{Math.round(val)}pts</Text>
                  </View>
                  <PBar pct={val} color={color}/>
                </View>
              ))}
            </PCard>
            <PCard>
              <Text style={{fontSize:13,fontWeight:"700",color:T.t1,marginBottom:14}}>Logros 🏅</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:10}}>
                {[["🔥","Racha activa","5 días registrando",true],["💯","Sin exceder","Presupuesto OK",true],["🎯","Meta activa","Ahorro en curso",true],["🦸","Super ahorrador","30%+ ahorro",savePct>=30],["🧘","Sin deudas nuevas","30 días",false],["📆","Mes perfecto","100% cumplido",false]].map(([ic,label,desc,done]) => (
                  <View key={label} style={{width:"47%",backgroundColor:done?T.mintDim:T.bg2,borderRadius:14,borderWidth:1,borderColor:done?T.mintMid:T.b2,padding:13,opacity:done?1:.35}}>
                    <Text style={{fontSize:22,marginBottom:6}}>{ic}</Text>
                    <Text style={{fontSize:12,fontWeight:"700",color:done?T.mint:T.t3}}>{label}</Text>
                    <Text style={{fontSize:10,color:T.t3,marginTop:2}}>{desc}</Text>
                  </View>
                ))}
              </View>
            </PCard>
          </>
        )}

        {/* ── PREDICTOR ── */}
        {subTab==="predictor" && (
          <>
            <View style={[st.card,{marginBottom:12,borderColor:runOutDay?T.rose+"50":T.mintMid,backgroundColor:runOutDay?"#150008":"#00100A"}]}>
              <Text style={{fontSize:11,color:runOutDay?T.rose:T.mint,letterSpacing:2,marginBottom:8}}>{runOutDay?"⚠️ ALERTA":"✅ PROYECCIÓN"}</Text>
              {runOutDay ? (
                <Text style={{fontSize:15,color:T.rose,fontWeight:"700",lineHeight:22}}>
                  A este ritmo te quedarás sin dinero el <Text style={{fontSize:22}}>día {runOutDay}</Text>
                </Text>
              ) : (
                <>
                  <Text style={{fontSize:11,color:T.t3,marginBottom:4}}>Balance al día {DAYS_IN_MONTH}</Text>
                  <Text style={{fontSize:38,fontWeight:"800",color:T.mint,letterSpacing:-1}}>{fmt(Math.round(balanceEOM),cur)}</Text>
                  <Text style={{fontSize:12,color:T.t3,marginTop:6}}>Ritmo actual: <Text style={{color:T.t1,fontWeight:"600"}}>{fmt(Math.round(dailyAvg),cur)}/día</Text></Text>
                </>
              )}
              <View style={{marginTop:16}}>
                <View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:6}}>
                  <Text style={{fontSize:11,color:T.t3}}>Día {DAY} de {DAYS_IN_MONTH}</Text>
                  <Text style={{fontSize:11,fontWeight:"700",color:pctSpent>100?T.rose:pctSpent>80?T.gold:T.mint}}>{Math.round(pctSpent)}% proyectado</Text>
                </View>
                <PBar pct={pctSpent} color={T.mint} height={6}/>
                <View style={{flexDirection:"row",justifyContent:"space-between",marginTop:5}}>
                  <Text style={{fontSize:10,color:T.t3}}>Gastado: {fmt(totalExp,cur)}</Text>
                  <Text style={{fontSize:10,color:T.t3}}>Proyectado: {fmt(Math.round(projected),cur)}</Text>
                </View>
              </View>
            </View>
            <View style={[st.card,{flexDirection:"row",padding:0,overflow:"hidden",marginBottom:12}]}>
              {[[fmt(Math.round(dailyAvg),cur),"Por día",T.gold],[fmt(Math.round(dailyAvg*7),cur),"Por semana",T.sky],[`${DAYS_IN_MONTH-DAY} días`,"Restantes",T.violet]].map(([v,l,c],i) => (
                <View key={l} style={{flex:1,padding:16,alignItems:"center",borderRightWidth:i<2?1:0,borderRightColor:T.b1}}>
                  <Text style={{fontSize:13,fontWeight:"800",color:c,marginBottom:3}}>{v}</Text>
                  <Text style={{fontSize:10,color:T.t3}}>{l}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── RECORDATORIOS ── */}
        {subTab==="recordatorios" && (
          <>
            <PCard glow style={{marginBottom:12}}>
              <Text style={{fontSize:11,color:T.t3,letterSpacing:1.5,marginBottom:4}}>COMPROMISOS ESTE MES</Text>
              <Text style={{fontSize:32,fontWeight:"800",color:T.mint,letterSpacing:-.5}}>{fmt(totalRem,cur)}</Text>
              <Text style={{fontSize:12,color:T.t3,marginTop:4}}>{reminders.filter(r=>r.active).length} pagos programados</Text>
            </PCard>
            {upcoming.length>0 && (
              <PCard style={{marginBottom:12}}>
                <Text style={{fontSize:12,fontWeight:"700",color:T.gold,marginBottom:14}}>⏳ Próximos pagos</Text>
                {upcoming.map((r,i) => {
                  const d = r.day-today, urgent = d<=3;
                  return (
                    <View key={r.id}>
                      <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
                        <View style={{width:44,height:44,borderRadius:13,backgroundColor:urgent?T.roseDim:T.goldDim,borderWidth:1,borderColor:urgent?T.rose+"40":T.gold+"40",alignItems:"center",justifyContent:"center"}}>
                          <Text style={{fontSize:14,fontWeight:"800",color:urgent?T.rose:T.gold,lineHeight:17}}>{r.day}</Text>
                          <Text style={{fontSize:8,color:T.t3,letterSpacing:.5}}>DÍA</Text>
                        </View>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,fontWeight:"600",color:T.t1}}>{r.name}</Text>
                          <Text style={{fontSize:11,color:urgent?T.rose:T.t3,marginTop:1}}>{d===0?"¡Hoy!":d===1?"Mañana":`En ${d} días`}</Text>
                        </View>
                        <View style={{alignItems:"flex-end"}}>
                          <Text style={{fontSize:14,fontWeight:"700",color:T.gold}}>{fmt(r.amount,cur)}</Text>
                          <TouchableOpacity onPress={()=>setReminders(reminders.filter(x=>x.id!==r.id))}>
                            <Text style={{fontSize:11,color:T.t4,marginTop:2}}>× quitar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {i<upcoming.length-1 && <View style={{height:1,backgroundColor:T.b1,marginVertical:10,marginLeft:56}}/>}
                    </View>
                  );
                })}
              </PCard>
            )}
            {past.length>0 && (
              <PCard style={{marginBottom:12}}>
                <Text style={{fontSize:12,fontWeight:"700",color:T.t3,marginBottom:14}}>✅ Ya pagados</Text>
                {past.map((r,i) => (
                  <View key={r.id}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:12,opacity:.4}}>
                      <View style={{width:44,height:44,borderRadius:13,backgroundColor:T.mintDim,alignItems:"center",justifyContent:"center"}}>
                        <Text style={{fontSize:18,color:T.mint}}>✓</Text>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:"600",color:T.t1,textDecorationLine:"line-through"}}>{r.name}</Text>
                        <Text style={{fontSize:11,color:T.t3}}>Día {r.day}</Text>
                      </View>
                      <Text style={{fontSize:14,fontWeight:"700",color:T.t2}}>{fmt(r.amount,cur)}</Text>
                    </View>
                    {i<past.length-1 && <View style={{height:1,backgroundColor:T.b1,marginVertical:10,marginLeft:56}}/>}
                  </View>
                ))}
              </PCard>
            )}
            {reminders.length===0 && !adding && (
              <PCard style={{alignItems:"center",paddingVertical:36}}>
                <Text style={{fontSize:44,marginBottom:14}}>🔔</Text>
                <Text style={{fontSize:15,fontWeight:"700",color:T.t1,marginBottom:6}}>Sin recordatorios</Text>
                <Text style={{fontSize:13,color:T.t3,textAlign:"center"}}>Agrega tus pagos fijos para nunca olvidarlos.</Text>
              </PCard>
            )}
            {adding ? (
              <PCard>
                <Text style={{fontSize:14,fontWeight:"700",color:T.t1,marginBottom:14}}>Nuevo recordatorio</Text>
                <PInput placeholder="Nombre (ej: Netflix, Luz)" value={form.name} onChange={v=>setForm({...form,name:v})}/>
                <PInput placeholder={`Monto (${cur})`} value={form.amount} onChange={v=>setForm({...form,amount:v})} keyboard="numeric"/>
                <PInput placeholder="Día del mes (1-31)" value={form.day} onChange={v=>setForm({...form,day:v})} keyboard="numeric"/>
                <View style={{flexDirection:"row",gap:10,marginTop:4}}>
                  <PBtn label="Cancelar" onPress={()=>setAdding(false)} variant="ghost" style={{flex:1}}/>
                  <PBtn label="Guardar" onPress={()=>{if(!form.name||!form.amount||!form.day)return;setReminders([...reminders,{id:Date.now(),...form,amount:+form.amount,day:+form.day,active:true}]);setAdding(false);setForm({name:"",amount:"",day:""});}} style={{flex:2}}/>
                </View>
              </PCard>
            ) : (
              <View style={{marginHorizontal:16}}>
                <PBtn label="+ Nuevo recordatorio" onPress={()=>setAdding(true)} variant="ghost"/>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAV BAR
// ══════════════════════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  {id:"home",  icon:"◈",  label:"Inicio"},
  {id:"chat",  icon:"◉",  label:"IA"},
  {id:"deudas",icon:"💳", label:"Deudas"},
  {id:"metas", icon:"◎",  label:"Metas"},
  {id:"mas",   icon:"⋯",  label:"Más"},
];

function NavBar({tab, setTab}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.navBar, {paddingBottom:insets.bottom+8}]}>
      {NAV_ITEMS.map(item => {
        const active = tab === item.id;
        return (
          <TouchableOpacity key={item.id} onPress={()=>setTab(item.id)} style={st.navBtn} activeOpacity={0.7}>
            {active && (
              <View style={{position:"absolute",top:0,width:32,height:2,backgroundColor:T.mint,borderRadius:99}}/>
            )}
            <Text style={{fontSize:item.icon.length>2?14:22,color:active?T.mint:T.t4,marginTop:6}}>{item.icon}</Text>
            <Text style={{fontSize:9,fontWeight:"700",color:active?T.mint:T.t4,marginTop:2,letterSpacing:.5}}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,      setUser,      uReady] = usePersist(K.user,      null);
  const [onboarded, setOnboarded, oReady] = usePersist(K.onboarded, false);
  const [expenses,  setExpenses,  eReady] = usePersist(K.expenses,  S_EXPENSES);
  const [goals,     setGoals,     gReady] = usePersist(K.goals,     S_GOALS);
  const [debts,     setDebts,     dReady] = usePersist(K.debts,     S_DEBTS);
  const [income,    setIncome,    iReady] = usePersist(K.income,    S_INCOME);
  const [reminders, setReminders, rReady] = usePersist(K.reminders, S_REMINDERS);
  const [budgets,   setBudgets,   bReady] = usePersist(K.budgets,   S_BUDGETS);
  const [tab, setTab] = useState("home");

  const ready = uReady && oReady && eReady && gReady && dReady && iReady && rReady && bReady;

  if(!ready) return <LoadingScreen/>;

  const handleComplete = (data) => {
    try {
      setUser({name: data.name || "Usuario", currency: data.currency || "RD$"});
      setOnboarded(true);
      if(data.goals && data.goals.length > 0) setGoals(data.goals);
      if(data.income && data.income.length > 0) setIncome(data.income);
      if(data.budgets && Object.keys(data.budgets).length > 0) setBudgets(data.budgets);
    } catch(e) {
      save(K.user, {name: data.name || "Usuario", currency: data.currency || "RD$"});
      save(K.onboarded, true);
    }
  };

  if(!onboarded || !user) return <Onboarding onComplete={handleComplete}/>;

  return (
    <View style={{flex:1, backgroundColor:T.bg0}}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg0}/>

      {tab==="home"   && <HomeScreen   expenses={expenses} income={income} budgets={budgets} user={user}/>}
      {tab==="chat"   && <ChatScreen   expenses={expenses} setExpenses={setExpenses} goals={goals} income={income} debts={debts} user={user} budgets={budgets}/>}
      {tab==="deudas" && <DeudasScreen debts={debts} setDebts={setDebts} user={user}/>}
      {tab==="metas"  && <MetasScreen  goals={goals} setGoals={setGoals} user={user}/>}
      {tab==="mas"    && <MasScreen    expenses={expenses} income={income} budgets={budgets} reminders={reminders} setReminders={setReminders} user={user}/>}

      <NavBar tab={tab} setTab={setTab}/>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  card:      { backgroundColor:T.bg2, borderRadius:20, borderWidth:1, borderColor:T.b1, padding:18, marginHorizontal:16, marginBottom:12 },
  obWrap:    { flex:1, backgroundColor:T.bg0, padding:24, paddingTop:52 },
  obTitle:   { fontSize:26, fontWeight:"800", color:T.t1, marginBottom:6, letterSpacing:-.5 },
  obSub:     { fontSize:13, color:T.t2, marginBottom:28, lineHeight:20 },
  label:     { fontSize:10, color:T.t3, letterSpacing:1.5, fontWeight:"700" },
  input:     { backgroundColor:T.bg2, borderWidth:1, borderColor:T.b2, borderRadius:12, padding:14, color:T.t1, fontSize:14, marginBottom:10 },
  btn:       { borderRadius:13, padding:15, alignItems:"center" },
  btnTx:     { fontSize:15, fontWeight:"700" },
  navBar:    { flexDirection:"row", backgroundColor:T.bg1, borderTopWidth:1, borderTopColor:T.b1, paddingTop:4 },
  navBtn:    { flex:1, alignItems:"center", paddingVertical:4, position:"relative" },
});
