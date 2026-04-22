import { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const T = {
  bg0:"#040406",bg1:"#08080C",bg2:"#0E0E14",bg3:"#14141C",bg4:"#1A1A24",
  b1:"#1E1E2A",b2:"#28283A",b3:"#32324A",
  mint:"#00E5B0",mintDim:"#00E5B012",mintMid:"#00E5B035",
  gold:"#F5B800",goldDim:"#F5B80012",rose:"#FF4D6D",roseDim:"#FF4D6D12",
  sky:"#38BDF8",skyDim:"#38BDF812",violet:"#8B5CF6",violetDim:"#8B5CF612",
  emerald:"#10B981",emeraldDim:"#10B98112",orange:"#F97316",
  t1:"#F8F8FC",t2:"#A0A0B8",t3:"#606078",t4:"#30303C",
};

const CATS = {
  "Alimentacion":{icon:"🛒",color:T.mint,bg:T.mintDim},
  "Transporte":{icon:"⛽",color:T.sky,bg:T.skyDim},
  "Ocio":{icon:"🎮",color:"#EC4899",bg:"#EC489912"},
  "Salud":{icon:"💊",color:T.emerald,bg:T.emeraldDim},
  "Suscripciones":{icon:"📱",color:T.violet,bg:T.violetDim},
  "Hogar":{icon:"🏠",color:T.orange,bg:"#F9731612"},
  "Educacion":{icon:"📚",color:T.gold,bg:T.goldDim},
  "Otro":{icon:"💸",color:T.t3,bg:T.bg3},
};

const TODAY=new Date(),DAY=TODAY.getDate(),DAYS_IN_MONTH=new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0).getDate();
const STORAGE_KEY="mf4_data";

async function saveAll(data){try{await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(e){}}
async function loadAll(){try{const r=await AsyncStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):null;}catch(e){return null;}}

const S_EXP=[
  {id:1,desc:"Supermercados Nacional",amount:2800,cat:"Alimentacion",date:"2025-06-10"},
  {id:2,desc:"Gasolina Shell",amount:1500,cat:"Transporte",date:"2025-06-09"},
  {id:3,desc:"Netflix",amount:580,cat:"Suscripciones",date:"2025-06-08"},
  {id:4,desc:"Farmacia Carol",amount:900,cat:"Salud",date:"2025-06-07"},
  {id:5,desc:"Restaurante",amount:1200,cat:"Ocio",date:"2025-06-06"},
];
const S_GOALS=[{id:1,name:"PC Gaming",emoji:"🖥",target:50000,saved:18500,weeks:24},{id:2,name:"Viaje Mexico",emoji:"✈",target:80000,saved:12000,weeks:40}];
const S_DEBTS=[{id:1,type:"tarjeta",name:"Tarjeta BHD",balance:35000,rate:24,minPay:1200,limit:50000,color:T.rose},{id:2,type:"prestamo",name:"Prestamo Banco",balance:120000,rate:18,minPay:4500,limit:120000,color:T.gold}];
const S_INC=[{id:1,source:"Salario",amount:45000,date:"2025-06-01",type:"fijo"},{id:2,source:"Freelance",amount:12000,date:"2025-06-15",type:"variable"}];
const S_REM=[{id:1,name:"Netflix",amount:580,day:8,active:true},{id:2,name:"Prestamo BHD",amount:4500,day:15,active:true}];
const S_BUD={Alimentacion:8000,Transporte:4000,Ocio:3000,Suscripciones:1500};

function parseNLP(text){
  const lower=text.toLowerCase();
  const m=text.match(/[\d,]+(\.\d+)?/);
  const amount=m?parseFloat(m[0].replace(",","")):null;
  let cat="Otro";
  if(/gasolina|uber|combustible|transport/.test(lower))cat="Transporte";
  else if(/comida|supermercado|nacional|bravo|restaurante|almuerzo|cena/.test(lower))cat="Alimentacion";
  else if(/netflix|spotify|suscripci|disney|amazon/.test(lower))cat="Suscripciones";
  else if(/farmacia|medic|doctor|salud|pastilla/.test(lower))cat="Salud";
  else if(/ocio|fiesta|cine|bar|juego/.test(lower))cat="Ocio";
  else if(/casa|hogar|alquiler|luz|agua/.test(lower))cat="Hogar";
  const today=new Date().toISOString().split("T")[0];
  const yesterday=new Date(Date.now()-86400000).toISOString().split("T")[0];
  const date=/ayer/.test(lower)?yesterday:today;
  const descM=text.match(/en\s+(.+?)(\s+hoy|\s+ayer|$)/i);
  const raw=descM?descM[1].trim():cat;
  return {amount,cat,date,desc:raw.charAt(0).toUpperCase()+raw.slice(1)};
}

function calcScore(expenses,income,budgets){
  const totalExp=expenses.reduce((a,e)=>a+e.amount,0);
  const savePct=income>0?((income-totalExp)/income)*100:0;
  const catTotals={};
  expenses.forEach(e=>{catTotals[e.cat]=(catTotals[e.cat]||0)+e.amount;});
  const s={
    ahorro:Math.min(100,Math.max(0,savePct*2.5)),
    presupuesto:(()=>{const c=Object.entries(budgets);if(!c.length)return 80;const o=c.filter(([k,l])=>(catTotals[k]||0)>l).length;return Math.max(0,100-(o/c.length)*100);})(),
    consistencia:Math.min(100,(expenses.length/15)*100),
    deuda:85,
  };
  const total=Math.round(s.ahorro*.4+s.presupuesto*.3+s.consistencia*.2+s.deuda*.1);
  const grade=total>=85?{label:"Excelente",color:T.emerald,emoji:"🏆"}:total>=70?{label:"Bueno",color:T.mint,emoji:"✅"}:total>=50?{label:"Regular",color:T.gold,emoji:"⚠️"}:{label:"Critico",color:T.rose,emoji:"🚨"};
  return {total,scores:s,grade};
}

function moPay(balance,rate,payment){
  const r=rate/100/12;
  if(payment<=r*balance)return Infinity;
  if(r===0)return Math.ceil(balance/payment);
  return Math.ceil(Math.log(payment/(payment-r*balance))/Math.log(1+r));
}

function fmt(n,cur){return (cur||"RD$")+Math.abs(n).toLocaleString();}

// SHARED UI
function PCard({children,glow,danger,style}){
  return <View style={[ss.card,glow&&{borderColor:T.mintMid,backgroundColor:"#00100A"},danger&&{borderColor:T.rose+"40",backgroundColor:T.roseDim},style]}>{children}</View>;
}
function PBtn({label,onPress,variant,style,disabled}){
  const v=variant||"primary";
  const bg=disabled?T.bg3:v==="primary"?T.mint:v==="danger"?T.rose:"transparent";
  const tx=disabled?T.t3:v==="ghost"?T.t2:"#000";
  return <TouchableOpacity onPress={disabled?null:onPress} activeOpacity={0.75} style={[ss.btn,{backgroundColor:bg,borderWidth:v==="ghost"?1:0,borderColor:T.b2},style]}><Text style={[ss.btnTx,{color:tx}]}>{label}</Text></TouchableOpacity>;
}
function PInput({placeholder,value,onChange,keyboard,style}){
  return <TextInput style={[ss.input,style]} placeholder={placeholder} placeholderTextColor={T.t4} value={value} onChangeText={onChange} keyboardType={keyboard||"default"}/>;
}
function PBar({pct,color,height,style}){
  const h=height||4;
  const clr=pct>90?T.rose:pct>70?T.gold:color;
  return <View style={[{height:h,borderRadius:99,backgroundColor:T.b1,overflow:"hidden"},style]}><View style={{height:"100%",width:`${Math.min(pct,100)}%`,borderRadius:99,backgroundColor:clr}}/></View>;
}
function Tag({label,color}){
  return <View style={{backgroundColor:color+"20",borderRadius:6,paddingHorizontal:8,paddingVertical:3}}><Text style={{fontSize:10,fontWeight:"700",color,letterSpacing:.5}}>{label}</Text></View>;
}
function Hdr({sup,title}){
  return <View style={{paddingHorizontal:20,paddingTop:8,paddingBottom:12}}>{!!sup&&<Text style={{fontSize:11,color:T.t3,letterSpacing:2,marginBottom:2}}>{sup}</Text>}<Text style={{fontSize:24,fontWeight:"800",color:T.t1,letterSpacing:-.5}}>{title}</Text></View>;
}

// LOADING
function LoadingScreen(){
  return <View style={{flex:1,backgroundColor:T.bg0,alignItems:"center",justifyContent:"center"}}><Text style={{fontSize:52}}>💰</Text><Text style={{fontSize:26,fontWeight:"800",color:T.mint,marginTop:16,letterSpacing:-1}}>MiFinanzas</Text><Text style={{fontSize:12,color:T.t3,marginTop:6}}>Cargando...</Text></View>;
}

// ONBOARDING
function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [currency,setCur]=useState("RD$");
  const [inc,setInc]=useState("");
  const [extra,setExtra]=useState("");
  const [budgets,setBudgets]=useState({Alimentacion:"",Transporte:"",Ocio:"",Suscripciones:""});
  const [gName,setGName]=useState("");
  const [gEmoji,setGEmoji]=useState("🎯");
  const [gTarget,setGTarget]=useState("");
  const [gWeeks,setGWeeks]=useState("24");

  const dots=(
    <View style={{flexDirection:"row",gap:5,justifyContent:"center",marginBottom:32}}>
      {[0,1,2,3,4].map(i=><View key={i} style={{height:3,borderRadius:99,backgroundColor:i<=step?T.mint:T.b2,width:i===step?22:6}}/>)}
    </View>
  );

  const finish=()=>{
    const bud={};
    Object.entries(budgets).forEach(([k,v])=>{if(v)bud[k]=+v;});
    const goals=gName&&gTarget?[{id:1,name:gName,emoji:gEmoji,target:+gTarget,saved:0,weeks:+gWeeks}]:[];
    const income=[];
    if(inc)income.push({id:1,source:"Salario",amount:+inc,date:new Date().toISOString().split("T")[0],type:"fijo"});
    if(extra)income.push({id:2,source:"Variable",amount:+extra,date:new Date().toISOString().split("T")[0],type:"variable"});
    onComplete({
      name:name.trim()||"Usuario",
      currency,
      budgets:Object.keys(bud).length?bud:S_BUD,
      goals,
      income:income.length?income:S_INC,
    });
  };

  if(step===0)return(
    <View style={{flex:1,backgroundColor:T.bg0}}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg0}/>
      <SafeAreaView style={{flex:1,justifyContent:"space-between",padding:24}}>
        <View style={{flex:1,alignItems:"center",justifyContent:"center"}}>
          <View style={{width:96,height:96,borderRadius:28,backgroundColor:T.mintDim,borderWidth:1.5,borderColor:T.mintMid,alignItems:"center",justifyContent:"center",marginBottom:24}}>
            <Text style={{fontSize:44}}>💰</Text>
          </View>
          <Text style={{fontSize:30,fontWeight:"800",color:T.t1,textAlign:"center",letterSpacing:-.5,marginBottom:10}}>Tu dinero,{"\n"}<Text style={{color:T.mint}}>bajo control.</Text></Text>
          <Text style={{fontSize:14,color:T.t2,textAlign:"center",lineHeight:22,marginBottom:32}}>Finanzas personales con IA.</Text>
          {[["⚡","Registra gastos con voz o texto"],["📊","Alertas inteligentes de presupuesto"],["🎯","Metas de ahorro visuales"],["💾","Datos guardados siempre"]].map(([ic,txt])=>(
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

  if(step===1)return(
    <SafeAreaView style={ss.obWrap}>
      {dots}
      <Text style={ss.obTitle}>Como te llamamos? 👋</Text>
      <Text style={ss.obSub}>Personaliza tu experiencia.</Text>
      <View style={{flex:1}}>
        <Text style={ss.lbl}>TU NOMBRE</Text>
        <PInput placeholder="ej: Carlos, Maria..." value={name} onChange={setName}/>
        <Text style={[ss.lbl,{marginTop:16}]}>MONEDA</Text>
        <View style={{flexDirection:"row",gap:8,marginTop:8}}>
          {["RD$","$","€","Q"].map(c=>(
            <TouchableOpacity key={c} onPress={()=>setCur(c)} style={{flex:1,paddingVertical:12,borderRadius:12,borderWidth:1.5,borderColor:currency===c?T.mint:T.b2,backgroundColor:currency===c?T.mintDim:T.bg2,alignItems:"center"}}>
              <Text style={{fontWeight:"800",fontSize:15,color:currency===c?T.mint:T.t3}}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atras" onPress={()=>setStep(0)} variant="ghost" style={{flex:1}}/>
        <PBtn label="Continuar →" onPress={()=>{if(name.trim())setStep(2);}} disabled={!name.trim()} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );

  if(step===2)return(
    <SafeAreaView style={ss.obWrap}>
      {dots}
      <Text style={ss.obTitle}>Tus ingresos 💼</Text>
      <Text style={ss.obSub}>Cuanto recibes al mes? (aproximado)</Text>
      <View style={{flex:1}}>
        <View style={{backgroundColor:T.mintDim,borderRadius:14,borderWidth:1,borderColor:T.mintMid,padding:14,marginBottom:20}}>
          <Text style={{fontSize:12,color:T.mint,fontWeight:"700",marginBottom:3}}>Para que sirve esto?</Text>
          <Text style={{fontSize:12,color:T.t2,lineHeight:18}}>Calculamos tu tasa de ahorro y proyecciones personalizadas.</Text>
        </View>
        <Text style={ss.lbl}>INGRESO FIJO ({currency})</Text>
        <PInput placeholder="ej: 45000" value={inc} onChange={setInc} keyboard="numeric"/>
        <Text style={[ss.lbl,{marginTop:12}]}>INGRESOS VARIABLES ({currency})</Text>
        <Text style={{fontSize:11,color:T.t3,marginBottom:8}}>Freelance, bonos... (opcional)</Text>
        <PInput placeholder="ej: 10000" value={extra} onChange={setExtra} keyboard="numeric"/>
        {!!inc&&(
          <View style={{backgroundColor:T.bg3,borderRadius:12,padding:14,marginTop:4}}>
            <Text style={{fontSize:11,color:T.t3}}>Total mensual estimado</Text>
            <Text style={{fontSize:22,fontWeight:"800",color:T.mint}}>{currency}{(+inc+(+extra||0)).toLocaleString()}</Text>
          </View>
        )}
      </View>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atras" onPress={()=>setStep(1)} variant="ghost" style={{flex:1}}/>
        <PBtn label="Continuar →" onPress={()=>setStep(3)} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );

  if(step===3)return(
    <SafeAreaView style={ss.obWrap}>
      {dots}
      <Text style={ss.obTitle}>Tus limites 📊</Text>
      <Text style={ss.obSub}>Cuanto quieres gastar por categoria al mes.</Text>
      <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
        {Object.keys(budgets).map(cat=>(
          <View key={cat} style={{marginBottom:14}}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:8}}>
              <Text style={{fontSize:15}}>{CATS[cat]?.icon}</Text>
              <Text style={{fontSize:14,fontWeight:"600",color:T.t1}}>{cat}</Text>
            </View>
            <PInput placeholder={"Limite en "+currency+" (opcional)"} value={budgets[cat]} onChange={v=>setBudgets({...budgets,[cat]:v})} keyboard="numeric"/>
          </View>
        ))}
        <View style={{backgroundColor:T.goldDim,borderRadius:12,borderWidth:1,borderColor:T.gold+"30",padding:12,marginBottom:20}}>
          <Text style={{fontSize:11,color:T.t2,lineHeight:18}}>Puedes dejarlo en blanco y ajustarlo despues.</Text>
        </View>
      </ScrollView>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atras" onPress={()=>setStep(2)} variant="ghost" style={{flex:1}}/>
        <PBtn label="Continuar →" onPress={()=>setStep(4)} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );

  if(step===4)return(
    <SafeAreaView style={ss.obWrap}>
      {dots}
      <Text style={ss.obTitle}>Tu primera meta 🎯</Text>
      <Text style={ss.obSub}>Que quieres lograr? (opcional)</Text>
      <View style={{flex:1}}>
        <Text style={ss.lbl}>QUE QUIERES LOGRAR?</Text>
        <PInput placeholder="ej: Laptop, Viaje, Fondo de emergencia..." value={gName} onChange={setGName}/>
        <View style={{flexDirection:"row",gap:10}}>
          <View style={{flex:1}}>
            <Text style={ss.lbl}>EMOJI</Text>
            <PInput value={gEmoji} onChange={setGEmoji} style={{textAlign:"center",fontSize:24}}/>
          </View>
          <View style={{flex:2.5}}>
            <Text style={ss.lbl}>CUANTO CUESTA ({currency})</Text>
            <PInput placeholder="ej: 50000" value={gTarget} onChange={setGTarget} keyboard="numeric"/>
          </View>
        </View>
        <Text style={ss.lbl}>PLAZO</Text>
        <View style={{flexDirection:"row",gap:8,marginTop:8,marginBottom:16}}>
          {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 ano"]].map(([w,l])=>(
            <TouchableOpacity key={w} onPress={()=>setGWeeks(w)} style={{flex:1,paddingVertical:10,borderRadius:11,borderWidth:1.5,borderColor:gWeeks===w?T.mint:T.b2,backgroundColor:gWeeks===w?T.mintDim:T.bg2,alignItems:"center"}}>
              <Text style={{fontSize:11,fontWeight:"700",color:gWeeks===w?T.mint:T.t3}}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!!gName&&!!gTarget&&(
          <View style={{backgroundColor:T.mintDim,borderRadius:12,borderWidth:1,borderColor:T.mintMid,padding:12,marginBottom:14}}>
            <Text style={{fontSize:12,color:T.t2}}>Aparta <Text style={{color:T.mint,fontWeight:"700"}}>{currency}{Math.ceil(+gTarget/+gWeeks).toLocaleString()}/semana</Text> durante {gWeeks} semanas.</Text>
          </View>
        )}
      </View>
      <View style={{flexDirection:"row",gap:10}}>
        <PBtn label="Atras" onPress={()=>setStep(3)} variant="ghost" style={{flex:1}}/>
        <PBtn label="Empezar! 🚀" onPress={finish} style={{flex:2}}/>
      </View>
    </SafeAreaView>
  );

  return null;
}

// HOME
function HomeScreen({expenses,income,budgets,user}){
  const cur=user.currency;
  const totalExp=expenses.reduce((a,e)=>a+e.amount,0);
  const totalInc=income.reduce((a,i)=>a+i.amount,0);
  const balance=totalInc-totalExp;
  const savePct=totalInc>0?Math.round((balance/totalInc)*100):0;
  const catTotals={};
  expenses.forEach(e=>{catTotals[e.cat]=(catTotals[e.cat]||0)+e.amount;});
  const maxCat=Math.max(...Object.values(catTotals),1);
  const {total:score,grade}=calcScore(expenses,totalInc,budgets);
  const alerts=Object.entries(budgets).map(([cat,lim])=>({cat,pct:((catTotals[cat]||0)/lim)*100})).filter(a=>a.pct>=70).sort((a,b)=>b.pct-a.pct);
  return(
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
        <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:20,paddingTop:8,paddingBottom:16}}>
          <View>
            <Text style={{fontSize:12,color:T.t3}}>Hola, <Text style={{color:T.t1,fontWeight:"700"}}>{user.name}</Text> 👋</Text>
            <Text style={{fontSize:20,fontWeight:"800",color:T.t1}}>Mi<Text style={{color:T.mint}}>Finanzas</Text></Text>
          </View>
          <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
            <View style={{backgroundColor:grade.color+"25",borderRadius:10,paddingHorizontal:10,paddingVertical:6,flexDirection:"row",alignItems:"center",gap:5}}>
              <Text style={{fontSize:12}}>{grade.emoji}</Text>
              <Text style={{fontSize:12,fontWeight:"700",color:grade.color}}>{score}pts</Text>
            </View>
          </View>
        </View>
        <View style={{marginHorizontal:16,marginBottom:14,backgroundColor:"#00100A",borderRadius:24,borderWidth:1,borderColor:T.mintMid,padding:22}}>
          <Text style={{fontSize:11,color:T.mint,letterSpacing:2,marginBottom:6}}>BALANCE DISPONIBLE</Text>
          <Text style={{fontSize:40,fontWeight:"800",color:T.mint,letterSpacing:-1,lineHeight:46}}>{cur}{balance.toLocaleString()}</Text>
          <View style={{flexDirection:"row",gap:0,marginTop:18,borderTopWidth:1,borderTopColor:T.mintMid+"50",paddingTop:14}}>
            {[[fmt(totalInc,cur),"Ingresos",T.mint],[fmt(totalExp,cur),"Gastos",T.rose],[savePct+"%","Ahorro",T.gold]].map(([v,l,c],i)=>(
              <View key={l} style={{flex:1,borderRightWidth:i<2?1:0,borderRightColor:T.mintMid+"40",paddingHorizontal:i>0?14:0}}>
                <Text style={{fontSize:11,color:T.t3,marginBottom:3}}>{l}</Text>
                <Text style={{fontSize:13,fontWeight:"700",color:c}}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
        {alerts.length>0&&(
          <PCard style={{marginBottom:14}}>
            <Text style={{fontSize:13,fontWeight:"700",color:T.gold,marginBottom:12}}>⚡ Alertas de Presupuesto</Text>
            {alerts.map(({cat,pct})=>(
              <View key={cat} style={{marginBottom:12}}>
                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <Text style={{fontSize:13,color:T.t1}}>{CATS[cat]?.icon} {cat}</Text>
                  <Tag label={Math.round(pct)+"%"} color={pct>100?T.rose:T.gold}/>
                </View>
                <PBar pct={pct} color={CATS[cat]?.color||T.mint}/>
              </View>
            ))}
          </PCard>
        )}
        {Object.keys(catTotals).length>0&&(
          <PCard style={{marginBottom:14}}>
            <Text style={{fontSize:13,fontWeight:"700",color:T.t1,marginBottom:14}}>Gastos del mes</Text>
            {Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>(
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
        <PCard>
          <Text style={{fontSize:13,fontWeight:"700",color:T.t1,marginBottom:14}}>Ultimos movimientos</Text>
          {expenses.length===0
            ?<Text style={{fontSize:13,color:T.t3,textAlign:"center",paddingVertical:20}}>Sin movimientos. Usa el Asistente IA para registrar.</Text>
            :expenses.slice(0,6).map((e,i)=>(
              <View key={e.id}>
                <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
                  <View style={{width:42,height:42,borderRadius:13,backgroundColor:T.bg3,alignItems:"center",justifyContent:"center"}}>
                    <Text style={{fontSize:19}}>{CATS[e.cat]?.icon||"💸"}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,fontWeight:"600",color:T.t1}} numberOfLines={1}>{e.desc}</Text>
                    <Text style={{fontSize:11,color:T.t3,marginTop:1}}>{e.date}</Text>
                  </View>
                  <Text style={{fontSize:14,fontWeight:"700",color:T.rose}}>-{fmt(e.amount,cur)}</Text>
                </View>
                {i<Math.min(expenses.length,6)-1&&<View style={{height:1,backgroundColor:T.b1,marginVertical:10,marginLeft:54}}/>}
              </View>
            ))
          }
        </PCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// CHAT
function ChatScreen({expenses,setExpenses,goals,income,debts,user,budgets}){
  const cur=user.currency;
  const totalInc=income.reduce((a,i)=>a+i.amount,0);
  const [msgs,setMsgs]=useState([{role:"bot",text:"Hola "+user.name+"! 👋 Soy tu asistente financiero IA.\n\nPuedo ayudarte:\n• \"Gaste 800 en gasolina hoy\"\n• \"Cuanto llevo en alimentacion?\"\n• \"Consejos para ahorrar mas\""}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const scrollRef=useRef();
  const send=async()=>{
    if(!input.trim()||loading)return;
    const msg=input.trim();setInput("");
    setMsgs(m=>[...m,{role:"user",text:msg}]);
    setLoading(true);
    const lower=msg.toLowerCase();
    const isEntry=/gast[eé]|pagu[eé]|compr[eé]/.test(lower);
    const parsed=parseNLP(msg);
    if(isEntry&&parsed.amount){
      const newE={id:Date.now(),desc:parsed.desc,amount:parsed.amount,cat:parsed.cat,date:parsed.date};
      setExpenses(p=>[newE,...p]);
      setLoading(false);
      setMsgs(m=>[...m,{role:"bot",text:"✅ Guardado!\n\n"+(CATS[parsed.cat]?.icon||"💸")+" "+parsed.desc+"\n"+cur+parsed.amount.toLocaleString()+" · "+parsed.cat+"\n"+parsed.date}]);
      return;
    }
    const catTotals={};expenses.forEach(e=>{catTotals[e.cat]=(catTotals[e.cat]||0)+e.amount;});
    const totalExp=expenses.reduce((a,e)=>a+e.amount,0);
    const ctx="Eres asistente financiero. Usuario: "+user.name+". Moneda: "+cur+". Balance: "+cur+(totalInc-totalExp).toLocaleString()+", Gastos: "+JSON.stringify(catTotals)+", Deudas: "+debts.map(d=>d.name+":"+cur+d.balance).join(", ")+". Responde en espanol, amigable, con emojis. Maximo 3 parrafos.";
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":"TU_API_KEY_AQUI","anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,system:ctx,messages:[{role:"user",content:msg}]})});
      const data=await res.json();
      setMsgs(m=>[...m,{role:"bot",text:data.content?.[0]?.text||"No pude responder."}]);
    }catch{
      setMsgs(m=>[...m,{role:"bot",text:"Para registrar gastos escribe: \"Gaste [monto] en [concepto]\"\n\nPara activar la IA completa, agrega tu API key de Anthropic."}]);
    }
    setLoading(false);
  };
  return(
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <Hdr sup="ASISTENTE" title="Chat IA 🤖"/>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:20}} showsVerticalScrollIndicator={false} onContentSizeChange={()=>scrollRef.current?.scrollToEnd({animated:true})}>
          {msgs.map((m,i)=>(
            <View key={i} style={{marginBottom:10,alignItems:m.role==="user"?"flex-end":"flex-start"}}>
              <View style={{maxWidth:"82%",padding:13,borderRadius:16,backgroundColor:m.role==="user"?T.mint:T.bg2,borderWidth:m.role==="bot"?1:0,borderColor:T.b2,borderBottomRightRadius:m.role==="user"?4:16,borderBottomLeftRadius:m.role==="bot"?4:16}}>
                <Text style={{fontSize:13,color:m.role==="user"?"#000":T.t1,lineHeight:20,fontWeight:m.role==="user"?"600":"400"}}>{m.text}</Text>
              </View>
            </View>
          ))}
          {loading&&<ActivityIndicator color={T.mint} style={{alignSelf:"flex-start",margin:8}}/>}
        </ScrollView>
        <View style={{flexDirection:"row",gap:10,padding:14,paddingBottom:20,backgroundColor:T.bg0,borderTopWidth:1,borderTopColor:T.b1}}>
          <TextInput style={[ss.input,{flex:1,marginBottom:0}]} placeholder="Escribe un gasto o pregunta..." placeholderTextColor={T.t4} value={input} onChangeText={setInput} onSubmitEditing={send} returnKeyType="send"/>
          <TouchableOpacity onPress={send} style={{width:48,height:48,backgroundColor:T.mint,borderRadius:14,alignItems:"center",justifyContent:"center"}} activeOpacity={0.8}>
            <Text style={{fontSize:20,color:"#000",fontWeight:"800"}}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// DEUDAS
function DeudasScreen({debts,setDebts,user}){
  const cur=user.currency;
  const [view,setView]=useState("lista");
  const [method,setMethod]=useState("avalanche");
  const [extra,setExtra]=useState("2000");
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({type:"tarjeta",name:"",balance:"",rate:"",minPay:"",limit:""});
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const TYPES=[{id:"tarjeta",icon:"💳",label:"Tarjeta",color:T.rose},{id:"prestamo",icon:"🏦",label:"Prestamo",color:T.gold},{id:"hipoteca",icon:"🏠",label:"Hipoteca",color:T.sky},{id:"auto",icon:"🚗",label:"Auto",color:T.violet},{id:"informal",icon:"🤝",label:"Informal",color:T.emerald},{id:"otro",icon:"📋",label:"Otro",color:T.t3}];
  const totalDebt=debts.reduce((a,d)=>a+d.balance,0);
  const totalMin=debts.reduce((a,d)=>a+d.minPay,0);
  const sorted=[...debts].sort((a,b)=>method==="avalanche"?b.rate-a.rate:a.balance-b.balance);
  const addDebt=()=>{
    if(!form.name||!form.balance)return;
    const t=TYPES.find(x=>x.id===form.type)||TYPES[5];
    setDebts([...debts,{id:Date.now(),...form,balance:+form.balance,rate:+form.rate||0,minPay:+form.minPay||0,limit:+(form.limit||form.balance),color:t.color}]);
    setAdding(false);setForm({type:"tarjeta",name:"",balance:"",rate:"",minPay:"",limit:""});
  };
  return(
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <Hdr sup="GESTION" title="Mis Deudas 💳"/>
      <View style={{flexDirection:"row",marginHorizontal:16,marginBottom:12,backgroundColor:T.bg2,borderRadius:14,padding:4,borderWidth:1,borderColor:T.b1}}>
        {[["lista","📋 Lista"],["estrategia","🏆 Estrategia"]].map(([id,label])=>(
          <TouchableOpacity key={id} onPress={()=>setView(id)} style={{flex:1,paddingVertical:9,borderRadius:11,backgroundColor:view===id?T.bg4:"transparent",alignItems:"center"}}>
            <Text style={{fontSize:13,fontWeight:"700",color:view===id?T.t1:T.t3}}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
        {debts.length>0&&(
          <PCard danger style={{marginBottom:14}}>
            <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}>
              <View><Text style={{fontSize:10,color:T.t3,letterSpacing:1.5,marginBottom:4}}>DEUDA TOTAL</Text><Text style={{fontSize:32,fontWeight:"800",color:T.rose,letterSpacing:-.5}}>{fmt(totalDebt,cur)}</Text></View>
              <View style={{alignItems:"flex-end"}}><Text style={{fontSize:10,color:T.t3,letterSpacing:1,marginBottom:4}}>PAGO MINIMO/MES</Text><Text style={{fontSize:20,fontWeight:"700",color:T.gold}}>{fmt(totalMin,cur)}</Text></View>
            </View>
          </PCard>
        )}
        {view==="lista"&&(
          <>
            {debts.length===0&&!adding&&(
              <PCard style={{alignItems:"center",paddingVertical:36}}>
                <Text style={{fontSize:44,marginBottom:14}}>🎉</Text>
                <Text style={{fontSize:16,fontWeight:"700",color:T.t1,marginBottom:6}}>Sin deudas registradas</Text>
                <Text style={{fontSize:13,color:T.t3,textAlign:"center"}}>Excelente señal financiera!</Text>
              </PCard>
            )}
            {debts.map(d=>{
              const t=TYPES.find(x=>x.id===d.type)||TYPES[5];
              const pctPaid=d.limit>0?Math.round(((d.limit-d.balance)/d.limit)*100):0;
              const mo=moPay(d.balance,d.rate,d.minPay+Number(extra||0));
              const tl=mo===Infinity?"Solo intereses":mo>24?(mo/12).toFixed(1)+" años":mo+" meses";
              return(
                <PCard key={d.id} style={{marginBottom:12,borderLeftWidth:3,borderLeftColor:d.color||t.color}}>
                  <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                      <View style={{width:40,height:40,borderRadius:12,backgroundColor:(d.color||t.color)+"20",alignItems:"center",justifyContent:"center"}}><Text style={{fontSize:18}}>{t.icon}</Text></View>
                      <View><Text style={{fontSize:14,fontWeight:"700",color:T.t1}}>{d.name}</Text><Tag label={t.label} color={d.color||t.color}/></View>
                    </View>
                    <TouchableOpacity onPress={()=>setDebts(debts.filter(x=>x.id!==d.id))} style={{padding:4}}><Text style={{color:T.b3,fontSize:18}}>×</Text></TouchableOpacity>
                  </View>
                  <View style={{flexDirection:"row",gap:0,marginBottom:14}}>
                    {[["Saldo",fmt(d.balance,cur),T.rose],["Tasa",d.rate+"% anual",T.gold],["Min/mes",fmt(d.minPay,cur),T.t1]].map(([l,v,c],i)=>(
                      <View key={l} style={{flex:1,borderRightWidth:i<2?1:0,borderRightColor:T.b1,paddingRight:i<2?12:0,paddingLeft:i>0?12:0}}>
                        <Text style={{fontSize:10,color:T.t3,marginBottom:3}}>{l}</Text>
                        <Text style={{fontSize:13,fontWeight:"700",color:c}}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  {d.limit>0&&<View style={{marginBottom:12}}><View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:5}}><Text style={{fontSize:11,color:T.t3}}>Progreso de pago</Text><Text style={{fontSize:11,color:T.mint,fontWeight:"700"}}>{pctPaid}% pagado</Text></View><PBar pct={pctPaid} color={T.mint}/></View>}
                  <View style={{backgroundColor:T.bg3,borderRadius:10,padding:10,flexDirection:"row",justifyContent:"space-between"}}>
                    <Text style={{fontSize:12,color:T.t2}}>Libre en: <Text style={{color:T.mint,fontWeight:"700"}}>{tl}</Text></Text>
                    {d.rate>0&&<Text style={{fontSize:12,color:T.t2}}><Text style={{color:T.rose,fontWeight:"700"}}>{fmt(Math.round(d.balance*d.rate/100),cur)}</Text>/año</Text>}
                  </View>
                </PCard>
              );
            })}
            {adding?(
              <PCard>
                <Text style={{fontSize:14,fontWeight:"700",color:T.t1,marginBottom:14}}>Nueva deuda</Text>
                <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:16}}>
                  {TYPES.map(t=>(
                    <TouchableOpacity key={t.id} onPress={()=>setF("type",t.id)} style={{paddingHorizontal:12,paddingVertical:8,borderRadius:10,borderWidth:1.5,borderColor:form.type===t.id?t.color:T.b2,backgroundColor:form.type===t.id?t.color+"20":T.bg2}}>
                      <Text style={{fontSize:12,fontWeight:"700",color:form.type===t.id?t.color:T.t3}}>{t.icon} {t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {[["name","Nombre del credito","default"],["balance","Saldo actual","numeric"],["limit","Limite o monto original","numeric"],["rate","Tasa anual (%)","numeric"],["minPay","Pago minimo mensual","numeric"]].map(([k,ph,kb])=>(
                  <PInput key={k} placeholder={ph} value={form[k]} onChange={v=>setF(k,v)} keyboard={kb}/>
                ))}
                <View style={{flexDirection:"row",gap:10,marginTop:4}}>
                  <PBtn label="Cancelar" onPress={()=>setAdding(false)} variant="ghost" style={{flex:1}}/>
                  <PBtn label="Guardar deuda" onPress={addDebt} style={{flex:2}}/>
                </View>
              </PCard>
            ):(
              <View style={{marginHorizontal:16}}><PBtn label="+ Agregar deuda" onPress={()=>setAdding(true)} variant="ghost"/></View>
            )}
          </>
        )}
        {view==="estrategia"&&(
          <>
            <View style={{flexDirection:"row",gap:10,marginHorizontal:16,marginBottom:12}}>
              {[["avalanche","🏔 Avalanche","Mayor tasa primero"],["snowball","⛄ Snowball","Menor saldo primero"]].map(([id,label,sub])=>(
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
            {sorted.map((d,i)=>{
              const payment=d.minPay+(i===0?+extra:0);
              const mo=moPay(d.balance,d.rate,payment);
              const tl=mo===Infinity?"Solo intereses":mo>24?(mo/12).toFixed(1)+" años":mo+" meses";
              const t=TYPES.find(x=>x.id===d.type)||TYPES[5];
              return(
                <PCard key={d.id} style={{marginBottom:12,borderLeftWidth:3,borderLeftColor:d.color||t.color}}>
                  <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                      <View style={{width:28,height:28,borderRadius:8,backgroundColor:i===0?T.mint:T.bg3,alignItems:"center",justifyContent:"center"}}><Text style={{fontSize:13,fontWeight:"800",color:i===0?"#000":T.t3}}>{i+1}</Text></View>
                      <Text style={{fontSize:14,fontWeight:"700",color:T.t1}}>{d.name}</Text>
                    </View>
                    {i===0&&<Tag label="🎯 Atacar primero" color={T.mint}/>}
                  </View>
                  <View style={{flexDirection:"row",gap:0,marginBottom:12}}>
                    {[["Saldo",fmt(d.balance,cur),T.rose],["Tasa",d.rate+"%",T.gold],["Pago",fmt(payment,cur),T.t1]].map(([l,v,c],idx)=>(
                      <View key={l} style={{flex:1,borderRightWidth:idx<2?1:0,borderRightColor:T.b1,paddingRight:idx<2?12:0,paddingLeft:idx>0?12:0}}>
                        <Text style={{fontSize:10,color:T.t3,marginBottom:3}}>{l}</Text>
                        <Text style={{fontSize:13,fontWeight:"700",color:c}}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{backgroundColor:T.bg3,borderRadius:10,padding:10}}>
                    <Text style={{fontSize:12,color:T.t2}}>Libre en: <Text style={{color:T.mint,fontWeight:"700"}}>{tl}</Text></Text>
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

// METAS
function MetasScreen({goals,setGoals,user}){
  const cur=user.currency;
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({name:"",emoji:"🎯",target:"",weeks:"12"});
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <Hdr sup="PLANIFICACION" title="Metas de Ahorro 🎯"/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
        {goals.length===0&&!adding&&(
          <PCard style={{alignItems:"center",paddingVertical:36}}>
            <Text style={{fontSize:44,marginBottom:14}}>🎯</Text>
            <Text style={{fontSize:16,fontWeight:"700",color:T.t1,marginBottom:6}}>Sin metas aun</Text>
            <Text style={{fontSize:13,color:T.t3,textAlign:"center"}}>Agrega tu primer objetivo.</Text>
          </PCard>
        )}
        {goals.map(g=>{
          const pct=Math.min((g.saved/g.target)*100,100);
          const weekly=((g.target-g.saved)/g.weeks).toFixed(0);
          return(
            <View key={g.id} style={[ss.card,{marginBottom:12,backgroundColor:"#00100A",borderColor:T.mintMid}]}>
              <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
                  <View style={{width:48,height:48,borderRadius:14,backgroundColor:T.mintDim,borderWidth:1,borderColor:T.mintMid,alignItems:"center",justifyContent:"center"}}><Text style={{fontSize:22}}>{g.emoji}</Text></View>
                  <View><Text style={{fontSize:15,fontWeight:"700",color:T.t1}}>{g.name}</Text><Text style={{fontSize:11,color:T.t3,marginTop:2}}>{cur}{g.saved.toLocaleString()} de {cur}{g.target.toLocaleString()}</Text></View>
                </View>
                <View style={{alignItems:"flex-end",gap:6}}>
                  <Tag label={Math.round(pct)+"%"} color={T.mint}/>
                  <TouchableOpacity onPress={()=>setGoals(goals.filter(x=>x.id!==g.id))}><Text style={{fontSize:11,color:T.b3}}>eliminar</Text></TouchableOpacity>
                </View>
              </View>
              <PBar pct={pct} color={T.mint} height={6} style={{marginBottom:12}}/>
              <View style={{backgroundColor:T.bg2,borderRadius:10,padding:12,flexDirection:"row",justifyContent:"space-between"}}>
                <View><Text style={{fontSize:10,color:T.t3}}>Aparta por semana</Text><Text style={{fontSize:14,fontWeight:"700",color:T.mint}}>{cur}{Number(weekly).toLocaleString()}</Text></View>
                <View style={{alignItems:"flex-end"}}><Text style={{fontSize:10,color:T.t3}}>Faltan</Text><Text style={{fontSize:14,fontWeight:"700",color:T.t1}}>{cur}{(g.target-g.saved).toLocaleString()}</Text></View>
              </View>
            </View>
          );
        })}
        {adding?(
          <PCard>
            <Text style={{fontSize:14,fontWeight:"700",color:T.t1,marginBottom:16}}>Nueva meta</Text>
            <PInput placeholder="Que quieres lograr?" value={form.name} onChange={v=>setF("name",v)}/>
            <View style={{flexDirection:"row",gap:10}}>
              <View style={{flex:1}}><Text style={ss.lbl}>EMOJI</Text><PInput value={form.emoji} onChange={v=>setF("emoji",v)} style={{textAlign:"center",fontSize:24}}/></View>
              <View style={{flex:2.5}}><Text style={ss.lbl}>COSTO ({cur})</Text><PInput placeholder="ej: 50000" value={form.target} onChange={v=>setF("target",v)} keyboard="numeric"/></View>
            </View>
            <Text style={ss.lbl}>PLAZO</Text>
            <View style={{flexDirection:"row",gap:8,marginTop:8,marginBottom:14}}>
              {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 ano"]].map(([w,l])=>(
                <TouchableOpacity key={w} onPress={()=>setF("weeks",w)} style={{flex:1,paddingVertical:10,borderRadius:11,borderWidth:1.5,borderColor:form.weeks===w?T.mint:T.b2,backgroundColor:form.weeks===w?T.mintDim:T.bg2,alignItems:"center"}}>
                  <Text style={{fontSize:11,fontWeight:"700",color:form.weeks===w?T.mint:T.t3}}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!form.name&&!!form.target&&(
              <View style={{backgroundColor:T.mintDim,borderRadius:12,borderWidth:1,borderColor:T.mintMid,padding:12,marginBottom:14}}>
                <Text style={{fontSize:12,color:T.t2}}>Aparta <Text style={{color:T.mint,fontWeight:"700"}}>{cur}{Math.ceil(+form.target/+form.weeks).toLocaleString()}/semana</Text> durante {form.weeks} semanas.</Text>
              </View>
            )}
            <View style={{flexDirection:"row",gap:10}}>
              <PBtn label="Cancelar" onPress={()=>setAdding(false)} variant="ghost" style={{flex:1}}/>
              <PBtn label="Guardar meta" onPress={()=>{if(!form.name||!form.target)return;setGoals([...goals,{id:Date.now(),...form,target:+form.target,saved:0,weeks:+form.weeks}]);setAdding(false);setForm({name:"",emoji:"🎯",target:"",weeks:"12"});}} style={{flex:2}}/>
            </View>
          </PCard>
        ):(
          <View style={{marginHorizontal:16}}><PBtn label="+ Nueva meta de ahorro" onPress={()=>setAdding(true)} variant="ghost"/></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// MAS (Score + Predictor + Recordatorios)
function MasScreen({expenses,income,budgets,reminders,setReminders,user}){
  const cur=user.currency;
  const [subTab,setSubTab]=useState("score");
  const totalInc=income.reduce((a,i)=>a+i.amount,0);
  const totalExp=expenses.reduce((a,e)=>a+e.amount,0);
  const {total,scores,grade}=calcScore(expenses,totalInc,budgets);
  const savePct=totalInc>0?Math.round(((totalInc-totalExp)/totalInc)*100):0;
  const dailyAvg=totalExp/Math.max(DAY,1);
  const projected=totalExp+(dailyAvg*(DAYS_IN_MONTH-DAY));
  const balEOM=totalInc-projected;
  const runOut=balEOM<0?Math.round(DAY+(totalInc-totalExp)/dailyAvg):null;
  const pctSpent=Math.min((projected/Math.max(totalInc,1))*100,120);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({name:"",amount:"",day:""});
  const today=new Date().getDate();
  const totalRem=reminders.filter(r=>r.active).reduce((a,r)=>a+r.amount,0);
  const upcoming=reminders.filter(r=>r.active&&r.day>=today).sort((a,b)=>a.day-b.day);
  const past=reminders.filter(r=>r.active&&r.day<today);
  return(
    <SafeAreaView style={{flex:1,backgroundColor:T.bg0}} edges={["top"]}>
      <View style={{paddingHorizontal:20,paddingTop:8,paddingBottom:8}}>
        <Text style={{fontSize:22,fontWeight:"800",color:T.t1}}>Herramientas 🛠️</Text>
      </View>
      <View style={{flexDirection:"row",marginHorizontal:16,marginBottom:8,backgroundColor:T.bg2,borderRadius:14,padding:4,borderWidth:1,borderColor:T.b1}}>
        {[["score","🌡️ Score"],["predictor","🔮 Predictor"],["pagos","🔔 Pagos"]].map(([id,label])=>(
          <TouchableOpacity key={id} onPress={()=>setSubTab(id)} style={{flex:1,paddingVertical:9,borderRadius:11,backgroundColor:subTab===id?T.bg4:"transparent",alignItems:"center"}}>
            <Text style={{fontSize:11,fontWeight:"700",color:subTab===id?T.t1:T.t3}}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:110}}>
        {subTab==="score"&&(
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
              {[["💰 Tasa de ahorro",scores.ahorro,T.mint],["📊 Control presupuesto",scores.presupuesto,T.sky],["📝 Registro constante",scores.consistencia,T.violet],["💳 Manejo de deudas",scores.deuda,T.gold]].map(([label,val,color])=>(
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
                {[["🔥","Racha activa","5 dias registrando",true],["💯","Sin exceder","Presupuesto OK",true],["🎯","Meta activa","Ahorro en curso",true],["🦸","Super ahorrador","30%+ ahorro",savePct>=30],["🧘","Sin deudas nuevas","30 dias",false],["📆","Mes perfecto","100% cumplido",false]].map(([ic,label,desc,done])=>(
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
        {subTab==="predictor"&&(
          <>
            <View style={[ss.card,{marginBottom:12,borderColor:runOut?T.rose+"50":T.mintMid,backgroundColor:runOut?"#150008":"#00100A"}]}>
              <Text style={{fontSize:11,color:runOut?T.rose:T.mint,letterSpacing:2,marginBottom:8}}>{runOut?"⚠️ ALERTA":"✅ PROYECCION"}</Text>
              {runOut
                ?<Text style={{fontSize:15,color:T.rose,fontWeight:"700",lineHeight:22}}>A este ritmo te quedaras sin dinero el dia <Text style={{fontSize:22}}>{runOut}</Text></Text>
                :<><Text style={{fontSize:11,color:T.t3,marginBottom:4}}>Balance al dia {DAYS_IN_MONTH}</Text><Text style={{fontSize:38,fontWeight:"800",color:T.mint,letterSpacing:-1}}>{fmt(Math.round(balEOM),cur)}</Text><Text style={{fontSize:12,color:T.t3,marginTop:6}}>Ritmo actual: <Text style={{color:T.t1,fontWeight:"600"}}>{fmt(Math.round(dailyAvg),cur)}/dia</Text></Text></>
              }
              <View style={{marginTop:16}}>
                <View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:6}}>
                  <Text style={{fontSize:11,color:T.t3}}>Dia {DAY} de {DAYS_IN_MONTH}</Text>
                  <Text style={{fontSize:11,fontWeight:"700",color:pctSpent>100?T.rose:pctSpent>80?T.gold:T.mint}}>{Math.round(pctSpent)}% proyectado</Text>
                </View>
                <PBar pct={pctSpent} color={T.mint} height={6}/>
                <View style={{flexDirection:"row",justifyContent:"space-between",marginTop:5}}>
                  <Text style={{fontSize:10,color:T.t3}}>Gastado: {fmt(totalExp,cur)}</Text>
                  <Text style={{fontSize:10,color:T.t3}}>Proyectado: {fmt(Math.round(projected),cur)}</Text>
                </View>
              </View>
            </View>
            <View style={[ss.card,{flexDirection:"row",padding:0,overflow:"hidden",marginBottom:12}]}>
              {[[fmt(Math.round(dailyAvg),cur),"Por dia",T.gold],[fmt(Math.round(dailyAvg*7),cur),"Por semana",T.sky],[(DAYS_IN_MONTH-DAY)+" dias","Restantes",T.violet]].map(([v,l,c],i)=>(
                <View key={l} style={{flex:1,padding:16,alignItems:"center",borderRightWidth:i<2?1:0,borderRightColor:T.b1}}>
                  <Text style={{fontSize:13,fontWeight:"800",color:c,marginBottom:3}}>{v}</Text>
                  <Text style={{fontSize:10,color:T.t3}}>{l}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {subTab==="pagos"&&(
          <>
            <PCard glow style={{marginBottom:12}}>
              <Text style={{fontSize:11,color:T.t3,letterSpacing:1.5,marginBottom:4}}>COMPROMISOS ESTE MES</Text>
              <Text style={{fontSize:32,fontWeight:"800",color:T.mint,letterSpacing:-.5}}>{fmt(totalRem,cur)}</Text>
              <Text style={{fontSize:12,color:T.t3,marginTop:4}}>{reminders.filter(r=>r.active).length} pagos programados</Text>
            </PCard>
            {upcoming.length>0&&(
              <PCard style={{marginBottom:12}}>
                <Text style={{fontSize:12,fontWeight:"700",color:T.gold,marginBottom:14}}>Proximos pagos</Text>
                {upcoming.map((r,i)=>{
                  const d=r.day-today,urgent=d<=3;
                  return(
                    <View key={r.id}>
                      <View style={{flexDirection:"row",alignItems:"center",gap:12}}>
                        <View style={{width:44,height:44,borderRadius:13,backgroundColor:urgent?T.roseDim:T.goldDim,borderWidth:1,borderColor:urgent?T.rose+"40":T.gold+"40",alignItems:"center",justifyContent:"center"}}>
                          <Text style={{fontSize:14,fontWeight:"800",color:urgent?T.rose:T.gold,lineHeight:17}}>{r.day}</Text>
                          <Text style={{fontSize:8,color:T.t3,letterSpacing:.5}}>DIA</Text>
                        </View>
                        <View style={{flex:1}}>
                          <Text style={{fontSize:13,fontWeight:"600",color:T.t1}}>{r.name}</Text>
                          <Text style={{fontSize:11,color:urgent?T.rose:T.t3,marginTop:1}}>{d===0?"Hoy!":d===1?"Manana":"En "+d+" dias"}</Text>
                        </View>
                        <View style={{alignItems:"flex-end"}}>
                          <Text style={{fontSize:14,fontWeight:"700",color:T.gold}}>{fmt(r.amount,cur)}</Text>
                          <TouchableOpacity onPress={()=>setReminders(reminders.filter(x=>x.id!==r.id))}><Text style={{fontSize:11,color:T.t4,marginTop:2}}>quitar</Text></TouchableOpacity>
                        </View>
                      </View>
                      {i<upcoming.length-1&&<View style={{height:1,backgroundColor:T.b1,marginVertical:10,marginLeft:56}}/>}
                    </View>
                  );
                })}
              </PCard>
            )}
            {past.length>0&&(
              <PCard style={{marginBottom:12}}>
                <Text style={{fontSize:12,fontWeight:"700",color:T.t3,marginBottom:14}}>Ya pagados</Text>
                {past.map((r,i)=>(
                  <View key={r.id}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:12,opacity:.4}}>
                      <View style={{width:44,height:44,borderRadius:13,backgroundColor:T.mintDim,alignItems:"center",justifyContent:"center"}}><Text style={{fontSize:18,color:T.mint}}>✓</Text></View>
                      <View style={{flex:1}}><Text style={{fontSize:13,fontWeight:"600",color:T.t1,textDecorationLine:"line-through"}}>{r.name}</Text><Text style={{fontSize:11,color:T.t3}}>Dia {r.day}</Text></View>
                      <Text style={{fontSize:14,fontWeight:"700",color:T.t2}}>{fmt(r.amount,cur)}</Text>
                    </View>
                    {i<past.length-1&&<View style={{height:1,backgroundColor:T.b1,marginVertical:10,marginLeft:56}}/>}
                  </View>
                ))}
              </PCard>
            )}
            {reminders.length===0&&!adding&&(
              <PCard style={{alignItems:"center",paddingVertical:36}}>
                <Text style={{fontSize:44,marginBottom:14}}>🔔</Text>
                <Text style={{fontSize:15,fontWeight:"700",color:T.t1,marginBottom:6}}>Sin recordatorios</Text>
                <Text style={{fontSize:13,color:T.t3,textAlign:"center"}}>Agrega tus pagos fijos para nunca olvidarlos.</Text>
              </PCard>
            )}
            {adding?(
              <PCard>
                <Text style={{fontSize:14,fontWeight:"700",color:T.t1,marginBottom:14}}>Nuevo recordatorio</Text>
                <PInput placeholder="Nombre (ej: Netflix, Luz)" value={form.name} onChange={v=>setForm({...form,name:v})}/>
                <PInput placeholder={"Monto ("+cur+")"} value={form.amount} onChange={v=>setForm({...form,amount:v})} keyboard="numeric"/>
                <PInput placeholder="Dia del mes (1-31)" value={form.day} onChange={v=>setForm({...form,day:v})} keyboard="numeric"/>
                <View style={{flexDirection:"row",gap:10,marginTop:4}}>
                  <PBtn label="Cancelar" onPress={()=>setAdding(false)} variant="ghost" style={{flex:1}}/>
                  <PBtn label="Guardar" onPress={()=>{if(!form.name||!form.amount||!form.day)return;setReminders([...reminders,{id:Date.now(),...form,amount:+form.amount,day:+form.day,active:true}]);setAdding(false);setForm({name:"",amount:"",day:""});}} style={{flex:2}}/>
                </View>
              </PCard>
            ):(
              <View style={{marginHorizontal:16}}><PBtn label="+ Nuevo recordatorio" onPress={()=>setAdding(true)} variant="ghost"/></View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// NAV
function NavBar({tab,setTab}){
  const insets=useSafeAreaInsets();
  const items=[{id:"home",icon:"◈",label:"Inicio"},{id:"chat",icon:"◉",label:"IA"},{id:"deudas",icon:"💳",label:"Deudas"},{id:"metas",icon:"◎",label:"Metas"},{id:"mas",icon:"⋯",label:"Mas"}];
  return(
    <View style={[ss.navBar,{paddingBottom:insets.bottom+8}]}>
      {items.map(item=>{
        const active=tab===item.id;
        return(
          <TouchableOpacity key={item.id} onPress={()=>setTab(item.id)} style={ss.navBtn} activeOpacity={0.7}>
            {active&&<View style={{position:"absolute",top:0,width:32,height:2,backgroundColor:T.mint,borderRadius:99}}/>}
            <Text style={{fontSize:item.icon.length>2?14:22,color:active?T.mint:T.t4,marginTop:6}}>{item.icon}</Text>
            <Text style={{fontSize:9,fontWeight:"700",color:active?T.mint:T.t4,marginTop:2,letterSpacing:.5}}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ROOT
export default function App(){
  const [loading,setLoading]=useState(true);
  const [onboarded,setOnboarded]=useState(false);
  const [tab,setTab]=useState("home");
  const [user,setUser]=useState(null);
  const [expenses,setExpenses]=useState(S_EXP);
  const [goals,setGoals]=useState(S_GOALS);
  const [debts,setDebts]=useState(S_DEBTS);
  const [income,setIncome]=useState(S_INC);
  const [reminders,setReminders]=useState(S_REM);
  const [budgets,setBudgets]=useState(S_BUD);

  useEffect(()=>{
    loadAll().then(saved=>{
      if(saved&&saved.onboarded&&saved.user){
        setUser(saved.user);
        setOnboarded(true);
        if(saved.expenses&&saved.expenses.length>0)setExpenses(saved.expenses);
        if(saved.goals&&saved.goals.length>0)setGoals(saved.goals);
        if(saved.debts&&saved.debts.length>0)setDebts(saved.debts);
        if(saved.income&&saved.income.length>0)setIncome(saved.income);
        if(saved.reminders&&saved.reminders.length>0)setReminders(saved.reminders);
        if(saved.budgets&&Object.keys(saved.budgets).length>0)setBudgets(saved.budgets);
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!loading&&onboarded&&user){
      saveAll({onboarded,user,expenses,goals,debts,income,reminders,budgets});
    }
  },[expenses,goals,debts,income,reminders,budgets,user,onboarded,loading]);

  if(loading)return <LoadingScreen/>;

  const handleComplete=(data)=>{
    const userData={name:(data.name||"Usuario").trim(),currency:data.currency||"RD$"};
    const newGoals=(data.goals&&data.goals.length>0)?data.goals:[];
    const newIncome=(data.income&&data.income.length>0)?data.income:S_INC;
    const newBudgets=(data.budgets&&Object.keys(data.budgets).length>0)?data.budgets:S_BUD;
    setUser(userData);
    setGoals(newGoals);
    setIncome(newIncome);
    setBudgets(newBudgets);
    setOnboarded(true);
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({onboarded:true,user:userData,expenses:S_EXP,goals:newGoals,debts:S_DEBTS,income:newIncome,reminders:S_REM,budgets:newBudgets})).catch(()=>{});
  };

  if(!onboarded||!user)return <Onboarding onComplete={handleComplete}/>;

  return(
    <View style={{flex:1,backgroundColor:T.bg0}}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg0}/>
      {tab==="home"   &&<HomeScreen   expenses={expenses} income={income} budgets={budgets} user={user}/>}
      {tab==="chat"   &&<ChatScreen   expenses={expenses} setExpenses={setExpenses} goals={goals} income={income} debts={debts} user={user} budgets={budgets}/>}
      {tab==="deudas" &&<DeudasScreen debts={debts} setDebts={setDebts} user={user}/>}
      {tab==="metas"  &&<MetasScreen  goals={goals} setGoals={setGoals} user={user}/>}
      {tab==="mas"    &&<MasScreen    expenses={expenses} income={income} budgets={budgets} reminders={reminders} setReminders={setReminders} user={user}/>}
      <NavBar tab={tab} setTab={setTab}/>
    </View>
  );
}

const ss=StyleSheet.create({
  card:{backgroundColor:T.bg2,borderRadius:20,borderWidth:1,borderColor:T.b1,padding:18,marginHorizontal:16,marginBottom:12},
  obWrap:{flex:1,backgroundColor:T.bg0,padding:24,paddingTop:52},
  obTitle:{fontSize:26,fontWeight:"800",color:T.t1,marginBottom:6,letterSpacing:-.5},
  obSub:{fontSize:13,color:T.t2,marginBottom:28,lineHeight:20},
  lbl:{fontSize:10,color:T.t3,letterSpacing:1.5,fontWeight:"700",marginBottom:6},
  input:{backgroundColor:T.bg2,borderWidth:1,borderColor:T.b2,borderRadius:12,padding:14,color:T.t1,fontSize:14,marginBottom:10},
  btn:{borderRadius:13,padding:15,alignItems:"center"},
  btnTx:{fontSize:15,fontWeight:"700"},
  navBar:{flexDirection:"row",backgroundColor:T.bg1,borderTopWidth:1,borderTopColor:T.b1,paddingTop:4},
  navBtn:{flex:1,alignItems:"center",paddingVertical:4,position:"relative"},
});
