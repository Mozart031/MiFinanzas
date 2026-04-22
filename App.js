import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Alert, Dimensions,
} from "react-native";
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────
// COLORES
// ─────────────────────────────────────────────
const C = {
  bg:     "#040406",
  card:   "#0E0E14",
  card2:  "#14141C",
  border: "#1E1E2A",
  mint:   "#00E5B0",
  mintBg: "#00E5B015",
  gold:   "#F5B800",
  goldBg: "#F5B80015",
  rose:   "#FF4D6D",
  roseBg: "#FF4D6D15",
  sky:    "#38BDF8",
  skyBg:  "#38BDF815",
  violet: "#8B5CF6",
  green:  "#10B981",
  orange: "#F97316",
  t1:     "#F8F8FC",
  t2:     "#A0A0B8",
  t3:     "#606078",
  t4:     "#2A2A3A",
};

// ─────────────────────────────────────────────
// DATOS POR DEFECTO — limpios, sin datos de ejemplo
// ─────────────────────────────────────────────
const DEF_BUDGETS = { Alimentacion: 8000, Transporte: 4000, Ocio: 3000, Suscripciones: 1500 };

const CATS = {
  Alimentacion:  { icon: "🛒", color: C.mint   },
  Transporte:    { icon: "⛽", color: C.sky    },
  Ocio:          { icon: "🎮", color: "#EC4899" },
  Salud:         { icon: "💊", color: C.green  },
  Suscripciones: { icon: "📱", color: C.violet },
  Hogar:         { icon: "🏠", color: C.orange },
  Educacion:     { icon: "📚", color: C.gold   },
  Otro:          { icon: "💸", color: C.t3     },
};

// ─────────────────────────────────────────────
// STORAGE — guardado simple y directo
// ─────────────────────────────────────────────
const STORE_KEY = "mifinanzas_v5";

function loadApp() {
  return AsyncStorage.getItem(STORE_KEY)
    .then(raw => raw ? JSON.parse(raw) : null)
    .catch(() => null);
}

function saveApp(state) {
  return AsyncStorage.setItem(STORE_KEY, JSON.stringify(state))
    .catch(() => {});
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────
const TODAY = new Date();
const DAY   = TODAY.getDate();
const DAYS_IN_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();

function money(n, cur) {
  return (cur || "RD$") + Math.abs(Math.round(n)).toLocaleString();
}

function nlp(text) {
  const low = text.toLowerCase();
  const m = text.match(/[\d,]+(\.\d+)?/);
  const amount = m ? parseFloat(m[0].replace(",", "")) : null;
  let cat = "Otro";
  if (/gasolina|uber|combustible|transport/.test(low)) cat = "Transporte";
  else if (/comida|supermercado|nacional|bravo|restaurante|almuerzo|cena/.test(low)) cat = "Alimentacion";
  else if (/netflix|spotify|suscripci|disney|amazon/.test(low)) cat = "Suscripciones";
  else if (/farmacia|medic|doctor|salud|pastilla/.test(low)) cat = "Salud";
  else if (/ocio|fiesta|cine|bar|juego/.test(low)) cat = "Ocio";
  else if (/casa|hogar|alquiler|luz|agua/.test(low)) cat = "Hogar";
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const date = /ayer/.test(low) ? yesterday : today;
  const dm = text.match(/en\s+(.+?)(\s+hoy|\s+ayer|$)/i);
  const raw = dm ? dm[1].trim() : cat;
  return { amount, cat, date, desc: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

function score(expenses, income, budgets) {
  const exp = expenses.reduce((a, e) => a + e.amount, 0);
  const save = income > 0 ? ((income - exp) / income) * 100 : 0;
  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const cats = Object.entries(budgets);
  const over = cats.filter(([k, l]) => (ct[k] || 0) > l).length;
  const s = {
    ahorro:      Math.min(100, Math.max(0, save * 2.5)),
    presupuesto: cats.length ? Math.max(0, 100 - (over / cats.length) * 100) : 80,
    consistencia:Math.min(100, (expenses.length / 15) * 100),
    deuda:       85,
  };
  const total = Math.round(s.ahorro * .4 + s.presupuesto * .3 + s.consistencia * .2 + s.deuda * .1);
  const grade = total >= 85 ? { label: "Excelente", color: C.green,  emoji: "🏆" }
              : total >= 70 ? { label: "Bueno",     color: C.mint,   emoji: "✅" }
              : total >= 50 ? { label: "Regular",   color: C.gold,   emoji: "⚠️" }
              :               { label: "Critico",   color: C.rose,   emoji: "🚨" };
  return { total, s, grade };
}

function payoffMonths(balance, rate, payment) {
  const r = rate / 100 / 12;
  if (payment <= r * balance) return Infinity;
  if (r === 0) return Math.ceil(balance / payment);
  return Math.ceil(Math.log(payment / (payment - r * balance)) / Math.log(1 + r));
}

// ─────────────────────────────────────────────
// COMPONENTES BASE
// ─────────────────────────────────────────────
function Card({ children, style, accent }) {
  return (
    <View style={[styles.card, accent && { borderColor: C.mint + "50", backgroundColor: "#00100A" }, style]}>
      {children}
    </View>
  );
}

function Btn({ label, onPress, primary, ghost, danger, disabled, style, small }) {
  const bg = disabled ? C.t4 : danger ? C.rose : primary !== false && !ghost ? C.mint : "transparent";
  const tc = disabled ? C.t3 : (ghost || danger) ? (danger ? C.rose : C.t2) : "#000";
  const bw = ghost ? 1 : 0;
  return (
    <TouchableOpacity
      onPress={disabled ? null : onPress}
      activeOpacity={0.75}
      style={[styles.btn, { backgroundColor: bg, borderWidth: bw, borderColor: C.border }, small && { padding: 10 }, style]}
    >
      <Text style={[styles.btnText, { color: tc }, small && { fontSize: 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Input({ value, onChange, placeholder, numeric, style, multiline }) {
  return (
    <TextInput
      style={[styles.input, style]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.t4}
      keyboardType={numeric ? "numeric" : "default"}
      multiline={multiline}
    />
  );
}

function Bar({ pct, color, h }) {
  const p = Math.min(Math.max(pct || 0, 0), 100);
  const bc = pct > 90 ? C.rose : pct > 70 ? C.gold : (color || C.mint);
  return (
    <View style={{ height: h || 4, borderRadius: 99, backgroundColor: C.border, overflow: "hidden" }}>
      <View style={{ height: "100%", width: p + "%", borderRadius: 99, backgroundColor: bc }} />
    </View>
  );
}

function Tag({ label, color }) {
  return (
    <View style={{ backgroundColor: color + "25", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

function Section({ sup, title }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10 }}>
      {!!sup && <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2, marginBottom: 2 }}>{sup}</Text>}
      <Text style={{ fontSize: 22, fontWeight: "800", color: C.t1, letterSpacing: -0.5 }}>{title}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────
function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Text style={{ fontSize: 56 }}>💰</Text>
      <Text style={{ fontSize: 28, fontWeight: "800", color: C.mint, marginTop: 16, letterSpacing: -1 }}>MiFinanzas</Text>
      <ActivityIndicator color={C.mint} size="large" style={{ marginTop: 24 }} />
      <Text style={{ fontSize: 13, color: C.t3, marginTop: 12 }}>Cargando tu informacion...</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step,    setStep]    = useState(0);
  const [name,    setName]    = useState("");
  const [cur,     setCur]     = useState("RD$");
  const [inc,     setInc]     = useState("");
  const [extra,   setExtra]   = useState("");
  const [bud,     setBud]     = useState({ Alimentacion: "", Transporte: "", Ocio: "", Suscripciones: "" });
  const [gName,   setGName]   = useState("");
  const [gEmoji,  setGEmoji]  = useState("🎯");
  const [gTarget, setGTarget] = useState("");
  const [gWeeks,  setGWeeks]  = useState("24");

  const dots = (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 28 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ height: 3, borderRadius: 99, backgroundColor: i <= step ? C.mint : C.border, width: i === step ? 24 : 6 }} />
      ))}
    </View>
  );

  function submit() {
    // Build all data synchronously — no async at all here
    const userData = { name: name.trim() || "Usuario", currency: cur };
    const goals = gName && gTarget
      ? [{ id: 1, name: gName, emoji: gEmoji, target: +gTarget, saved: 0, weeks: +gWeeks }]
      : [];
    const income = [];
    if (inc)   income.push({ id: 1, source: "Salario",   amount: +inc,   date: new Date().toISOString().split("T")[0], type: "fijo"     });
    if (extra) income.push({ id: 2, source: "Variable",  amount: +extra, date: new Date().toISOString().split("T")[0], type: "variable" });
    const budgets = {};
    Object.entries(bud).forEach(([k, v]) => { if (v) budgets[k] = +v; });

    // Call onDone immediately — synchronous
    onDone({
      user:     userData,
      goals:    goals,
      income:   income,
      budgets:  Object.keys(budgets).length > 0 ? budgets : DEF_BUDGETS,
    });
  }

  // PANTALLA 0 — BIENVENIDA
  if (step === 0) return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: C.mintBg, borderWidth: 1.5, borderColor: C.mint + "50", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 46 }}>💰</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: "800", color: C.t1, textAlign: "center", letterSpacing: -0.5, marginBottom: 10 }}>
            Tu dinero,{"\n"}<Text style={{ color: C.mint }}>bajo control.</Text>
          </Text>
          <Text style={{ fontSize: 14, color: C.t2, textAlign: "center", lineHeight: 22, marginBottom: 32, paddingHorizontal: 20 }}>
            Finanzas personales con IA para Republica Dominicana.
          </Text>
          {[
            ["⚡", "Registra gastos con voz o texto"],
            ["📊", "Alertas inteligentes de presupuesto"],
            ["💳", "Gestion completa de deudas y tarjetas"],
            ["🎯", "Metas de ahorro con progreso visual"],
            ["💾", "Datos guardados aunque cierres la app"],
          ].map(([ic, tx]) => (
            <View key={tx} style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10, width: "100%", padding: 14, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 18 }}>{ic}</Text>
              <Text style={{ fontSize: 13, color: C.t2, flex: 1 }}>{tx}</Text>
            </View>
          ))}
        </View>
        <Btn label="Comenzar →" onPress={() => setStep(1)} style={{ marginTop: 16 }} />
      </SafeAreaView>
    </View>
  );

  // PANTALLA 1 — NOMBRE Y MONEDA
  if (step === 1) return (
    <SafeAreaView style={styles.obWrap}>
      {dots}
      <Text style={styles.obH}>Como te llamamos? 👋</Text>
      <Text style={styles.obSub}>Personaliza tu experiencia.</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.lbl}>TU NOMBRE</Text>
        <Input value={name} onChange={setName} placeholder="ej: Carlos, Maria..." />
        <Text style={[styles.lbl, { marginTop: 16 }]}>MONEDA</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {["RD$", "$", "€", "Q"].map(c => (
            <TouchableOpacity key={c} onPress={() => setCur(c)} style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: cur === c ? C.mint : C.border, backgroundColor: cur === c ? C.mintBg : C.card, alignItems: "center" }}>
              <Text style={{ fontWeight: "800", fontSize: 15, color: cur === c ? C.mint : C.t3 }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atras" onPress={() => setStep(0)} ghost style={{ flex: 1 }} />
        <Btn label="Continuar →" onPress={() => { if (name.trim()) setStep(2); else Alert.alert("Ingresa tu nombre"); }} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  // PANTALLA 2 — INGRESOS
  if (step === 2) return (
    <SafeAreaView style={styles.obWrap}>
      {dots}
      <Text style={styles.obH}>Tus ingresos 💼</Text>
      <Text style={styles.obSub}>Cuanto recibes al mes? (aproximado)</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.mintBg, borderRadius: 14, borderWidth: 1, borderColor: C.mint + "40", padding: 14, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, color: C.mint, fontWeight: "700", marginBottom: 3 }}>Por que lo pedimos?</Text>
          <Text style={{ fontSize: 12, color: C.t2, lineHeight: 18 }}>Calculamos tu tasa de ahorro, alertas y proyecciones personalizadas.</Text>
        </View>
        <Text style={styles.lbl}>INGRESO FIJO MENSUAL ({cur})</Text>
        <Input value={inc} onChange={setInc} placeholder="ej: 45000" numeric />
        <Text style={[styles.lbl, { marginTop: 12 }]}>INGRESOS VARIABLES ({cur})</Text>
        <Text style={{ fontSize: 11, color: C.t3, marginBottom: 8 }}>Freelance, bonos... (opcional)</Text>
        <Input value={extra} onChange={setExtra} placeholder="ej: 10000" numeric />
        {!!inc && (
          <View style={{ backgroundColor: C.card2, borderRadius: 12, padding: 14, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: C.t3 }}>Total mensual estimado</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: C.mint }}>{cur}{(+inc + (+extra || 0)).toLocaleString()}</Text>
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atras" onPress={() => setStep(1)} ghost style={{ flex: 1 }} />
        <Btn label="Continuar →" onPress={() => setStep(3)} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  // PANTALLA 3 — PRESUPUESTOS
  if (step === 3) return (
    <SafeAreaView style={styles.obWrap}>
      {dots}
      <Text style={styles.obH}>Tus limites 📊</Text>
      <Text style={styles.obSub}>Cuanto quieres gastar por categoria al mes.</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {Object.keys(bud).map(cat => (
          <View key={cat} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (CATS[cat]?.color || C.mint) + "20", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{CATS[cat]?.icon}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: C.t1 }}>{cat}</Text>
            </View>
            <Input value={bud[cat]} onChange={v => setBud({ ...bud, [cat]: v })} placeholder={"Limite en " + cur + " (opcional)"} numeric />
          </View>
        ))}
        <View style={{ backgroundColor: C.goldBg, borderRadius: 12, borderWidth: 1, borderColor: C.gold + "30", padding: 12, marginBottom: 20 }}>
          <Text style={{ fontSize: 11, color: C.t2, lineHeight: 18 }}>Puedes dejarlo en blanco y ajustarlo despues desde la app.</Text>
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atras" onPress={() => setStep(2)} ghost style={{ flex: 1 }} />
        <Btn label="Continuar →" onPress={() => setStep(4)} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  // PANTALLA 4 — PRIMERA META
  if (step === 4) return (
    <SafeAreaView style={styles.obWrap}>
      {dots}
      <Text style={styles.obH}>Tu primera meta 🎯</Text>
      <Text style={styles.obSub}>Que quieres lograr? (opcional, puedes saltarte)</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.lbl}>QUE QUIERES LOGRAR?</Text>
        <Input value={gName} onChange={setGName} placeholder="ej: Laptop, Viaje, Fondo de emergencia..." />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lbl}>EMOJI</Text>
            <Input value={gEmoji} onChange={setGEmoji} style={{ textAlign: "center", fontSize: 26 }} />
          </View>
          <View style={{ flex: 2.5 }}>
            <Text style={styles.lbl}>CUANTO CUESTA ({cur})</Text>
            <Input value={gTarget} onChange={setGTarget} placeholder="ej: 50000" numeric />
          </View>
        </View>
        <Text style={styles.lbl}>PLAZO</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 16 }}>
          {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 ano"]].map(([w, l]) => (
            <TouchableOpacity key={w} onPress={() => setGWeeks(w)} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: gWeeks === w ? C.mint : C.border, backgroundColor: gWeeks === w ? C.mintBg : C.card, alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: gWeeks === w ? C.mint : C.t3 }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!!gName && !!gTarget && (
          <View style={{ backgroundColor: C.mintBg, borderRadius: 12, borderWidth: 1, borderColor: C.mint + "40", padding: 14, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: C.t2 }}>
              Aparta <Text style={{ color: C.mint, fontWeight: "700" }}>{cur}{Math.ceil(+gTarget / +gWeeks).toLocaleString()}/semana</Text> durante {gWeeks} semanas.
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atras" onPress={() => setStep(3)} ghost style={{ flex: 1 }} />
        <Btn label="Empezar! 🚀" onPress={submit} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  return null;
}

// ─────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────
function HomeScreen({ state, openSettings }) {
  const { expenses, income, budgets, user } = state;
  const cur = user.currency;
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const balance  = totalInc - totalExp;
  const savePct  = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const maxCat = Math.max(...Object.values(ct), 1);
  const { total: sc, grade } = score(expenses, totalInc, budgets);
  const alerts = Object.entries(budgets)
    .map(([cat, lim]) => ({ cat, pct: ((ct[cat] || 0) / lim) * 100 }))
    .filter(a => a.pct >= 70)
    .sort((a, b) => b.pct - a.pct);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 13, color: C.t3 }}>Hola, <Text style={{ color: C.t1, fontWeight: "700" }}>{user.name}</Text> 👋</Text>
            <Text style={{ fontSize: 21, fontWeight: "800", color: C.t1 }}>Mi<Text style={{ color: C.mint }}>Finanzas</Text></Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ backgroundColor: grade.color + "25", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={{ fontSize: 13 }}>{grade.emoji}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: grade.color }}>{sc}pts</Text>
            </View>
            <TouchableOpacity onPress={openSettings} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance */}
        <Card accent style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 11, color: C.mint, letterSpacing: 2, marginBottom: 6 }}>BALANCE DISPONIBLE</Text>
          <Text style={{ fontSize: 40, fontWeight: "800", color: C.mint, letterSpacing: -1, lineHeight: 46 }}>{money(balance, cur)}</Text>
          <View style={{ flexDirection: "row", gap: 0, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.mint + "25" }}>
            {[[money(totalInc, cur), "Ingresos", C.mint], [money(totalExp, cur), "Gastos", C.rose], [savePct + "%", "Ahorro", C.gold]].map(([v, l, c], i) => (
              <View key={l} style={{ flex: 1, borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.mint + "25", paddingHorizontal: i > 0 ? 12 : 0 }}>
                <Text style={{ fontSize: 11, color: C.t3, marginBottom: 3 }}>{l}</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: c }}>{v}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Alertas */}
        {alerts.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.gold, marginBottom: 12 }}>⚡ Alertas de Presupuesto</Text>
            {alerts.map(({ cat, pct }) => (
              <View key={cat} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: C.t1 }}>{CATS[cat]?.icon} {cat}</Text>
                  <Tag label={Math.round(pct) + "%"} color={pct > 100 ? C.rose : C.gold} />
                </View>
                <Bar pct={pct} color={CATS[cat]?.color} />
              </View>
            ))}
          </Card>
        )}

        {/* Gastos */}
        {Object.keys(ct).length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Gastos del mes</Text>
            {Object.entries(ct).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <View key={cat} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: (CATS[cat]?.color || C.mint) + "20", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 14 }}>{CATS[cat]?.icon}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: C.t2 }}>{cat}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{money(amt, cur)}</Text>
                </View>
                <Bar pct={(amt / maxCat) * 100} color={CATS[cat]?.color} h={3} />
              </View>
            ))}
          </Card>
        )}

        {/* Movimientos */}
        <Card>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Ultimos movimientos</Text>
          {expenses.length === 0
            ? <Text style={{ fontSize: 13, color: C.t3, textAlign: "center", paddingVertical: 20 }}>Sin movimientos. Usa el Asistente IA para registrar.</Text>
            : expenses.slice(0, 6).map((e, i) => (
              <View key={e.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 19 }}>{CATS[e.cat]?.icon || "💸"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: C.t1 }} numberOfLines={1}>{e.desc}</Text>
                    <Text style={{ fontSize: 11, color: C.t3, marginTop: 1 }}>{e.date}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.rose }}>-{money(e.amount, cur)}</Text>
                </View>
                {i < Math.min(expenses.length, 6) - 1 && <View style={{ height: 1, backgroundColor: C.border, marginVertical: 10, marginLeft: 54 }} />}
              </View>
            ))
          }
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
function ChatScreen({ state, addExpense }) {
  const { user, income, debts, budgets } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const [msgs, setMsgs] = useState([{
    bot: true,
    text: "Hola " + user.name + "! 👋 Soy tu asistente financiero IA.\n\nPuedo ayudarte:\n• \"Gaste 800 en gasolina hoy\"\n• \"Cuanto llevo en alimentacion?\"\n• \"Dame consejos para ahorrar mas\"\n• \"Como estan mis deudas?\"",
  }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const scroll = useRef(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMsgs(m => [...m, { bot: false, text: msg }]);
    setLoading(true);

    const low = msg.toLowerCase();
    const isEntry = /gast[eé]|pagu[eé]|compr[eé]/.test(low);
    const parsed = nlp(msg);

    if (isEntry && parsed.amount) {
      const newE = { id: Date.now(), desc: parsed.desc, amount: parsed.amount, cat: parsed.cat, date: parsed.date };
      addExpense(newE);
      setLoading(false);
      setMsgs(m => [...m, { bot: true, text: "✅ Guardado!\n\n" + (CATS[parsed.cat]?.icon || "💸") + " " + parsed.desc + "\n" + cur + parsed.amount.toLocaleString() + " · " + parsed.cat + "\n" + parsed.date }]);
      return;
    }

    const ct = {};
    state.expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
    const totalExp = state.expenses.reduce((a, e) => a + e.amount, 0);
    const sys = "Eres asistente financiero personal. Usuario: " + user.name + ". Moneda: " + cur + ". Balance: " + money(totalInc - totalExp, cur) + ", Gastos: " + JSON.stringify(ct) + ", Deudas: " + debts.map(d => d.name + ":" + money(d.balance, cur)).join(", ") + ". Responde en espanol dominicano, amigable, con emojis. Maximo 3 parrafos cortos.";

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "TU_API_KEY_AQUI", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, system: sys, messages: [{ role: "user", content: msg }] }),
      });
      const data = await res.json();
      setMsgs(m => [...m, { bot: true, text: data.content?.[0]?.text || "No pude responder." }]);
    } catch {
      setMsgs(m => [...m, { bot: true, text: "Para registrar gastos escribe: \"Gaste [monto] en [concepto]\"\n\nPara activar la IA completa agrega tu API key de Anthropic en el codigo." }]);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <Section sup="ASISTENTE" title="Chat IA 🤖" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }} showsVerticalScrollIndicator={false} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {msgs.map((m, i) => (
            <View key={i} style={{ marginBottom: 10, alignItems: m.bot ? "flex-start" : "flex-end" }}>
              <View style={{ maxWidth: "82%", padding: 13, borderRadius: 16, backgroundColor: m.bot ? C.card : C.mint, borderWidth: m.bot ? 1 : 0, borderColor: C.border, borderBottomRightRadius: m.bot ? 16 : 4, borderBottomLeftRadius: m.bot ? 4 : 16 }}>
                <Text style={{ fontSize: 13, color: m.bot ? C.t1 : "#000", lineHeight: 20, fontWeight: m.bot ? "400" : "600" }}>{m.text}</Text>
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator color={C.mint} style={{ alignSelf: "flex-start", margin: 8 }} />}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10, padding: 14, paddingBottom: 20, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Escribe un gasto o pregunta..." placeholderTextColor={C.t4} value={input} onChangeText={setInput} onSubmitEditing={send} returnKeyType="send" />
          <TouchableOpacity onPress={send} style={{ width: 48, height: 48, backgroundColor: C.mint, borderRadius: 14, alignItems: "center", justifyContent: "center" }} activeOpacity={0.8}>
            <Text style={{ fontSize: 20, color: "#000", fontWeight: "800" }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// DEUDAS
// ─────────────────────────────────────────────
function DeudasScreen({ state, setDebts }) {
  const { user, debts } = state;
  const cur = user.currency;
  const [view,   setView]   = useState("lista");
  const [method, setMethod] = useState("avalanche");
  const [extra,  setExtra]  = useState("2000");
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState({ type: "tarjeta", name: "", balance: "", rate: "", minPay: "", limit: "" });

  const TYPES = [
    { id: "tarjeta",  icon: "💳", label: "Tarjeta",  color: C.rose   },
    { id: "prestamo", icon: "🏦", label: "Prestamo", color: C.gold   },
    { id: "hipoteca", icon: "🏠", label: "Hipoteca", color: C.sky    },
    { id: "auto",     icon: "🚗", label: "Auto",     color: C.violet },
    { id: "informal", icon: "🤝", label: "Informal", color: C.green  },
    { id: "otro",     icon: "📋", label: "Otro",     color: C.t3     },
  ];

  const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
  const totalMin  = debts.reduce((a, d) => a + d.minPay, 0);
  const sorted    = [...debts].sort((a, b) => method === "avalanche" ? b.rate - a.rate : a.balance - b.balance);

  const addDebt = () => {
    if (!form.name || !form.balance) return;
    const t = TYPES.find(x => x.id === form.type) || TYPES[5];
    setDebts([...debts, { id: Date.now(), ...form, balance: +form.balance, rate: +form.rate || 0, minPay: +form.minPay || 0, limit: +(form.limit || form.balance), color: t.color }]);
    setAdding(false);
    setForm({ type: "tarjeta", name: "", balance: "", rate: "", minPay: "", limit: "" });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <Section sup="GESTION" title="Mis Deudas 💳" />
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border }}>
        {[["lista","📋 Lista"],["estrategia","🏆 Estrategia"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setView(id)} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: view === id ? C.card2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: view === id ? C.t1 : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {debts.length > 0 && (
          <View style={[styles.card, { marginBottom: 14, backgroundColor: C.roseBg, borderColor: C.rose + "40" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View><Text style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 4 }}>DEUDA TOTAL</Text><Text style={{ fontSize: 32, fontWeight: "800", color: C.rose, letterSpacing: -0.5 }}>{money(totalDebt, cur)}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={{ fontSize: 10, color: C.t3, letterSpacing: 1, marginBottom: 4 }}>PAGO MINIMO/MES</Text><Text style={{ fontSize: 20, fontWeight: "700", color: C.gold }}>{money(totalMin, cur)}</Text></View>
            </View>
          </View>
        )}
        {view === "lista" && (
          <>
            {debts.length === 0 && !adding && (
              <Card style={{ alignItems: "center", paddingVertical: 36 }}>
                <Text style={{ fontSize: 44, marginBottom: 14 }}>🎉</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.t1, marginBottom: 6 }}>Sin deudas registradas</Text>
                <Text style={{ fontSize: 13, color: C.t3, textAlign: "center" }}>Excelente senal financiera!</Text>
              </Card>
            )}
            {debts.map(d => {
              const t = TYPES.find(x => x.id === d.type) || TYPES[5];
              const pctPaid = d.limit > 0 ? Math.round(((d.limit - d.balance) / d.limit) * 100) : 0;
              const mo = payoffMonths(d.balance, d.rate, d.minPay + Number(extra || 0));
              const tl = mo === Infinity ? "Solo intereses" : mo > 24 ? (mo / 12).toFixed(1) + " años" : mo + " meses";
              return (
                <Card key={d.id} style={{ marginBottom: 12, borderLeftWidth: 3, borderLeftColor: d.color || t.color }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (d.color || t.color) + "20", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 18 }}>{t.icon}</Text></View>
                      <View><Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>{d.name}</Text><Tag label={t.label} color={d.color || t.color} /></View>
                    </View>
                    <TouchableOpacity onPress={() => setDebts(debts.filter(x => x.id !== d.id))} style={{ padding: 6 }}><Text style={{ color: C.t4, fontSize: 20 }}>×</Text></TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row", gap: 0, marginBottom: 14 }}>
                    {[["Saldo", money(d.balance, cur), C.rose], ["Tasa", d.rate + "% anual", C.gold], ["Min/mes", money(d.minPay, cur), C.t1]].map(([l, v, c], i) => (
                      <View key={l} style={{ flex: 1, borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.border, paddingRight: i < 2 ? 12 : 0, paddingLeft: i > 0 ? 12 : 0 }}>
                        <Text style={{ fontSize: 10, color: C.t3, marginBottom: 3 }}>{l}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c }}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  {d.limit > 0 && <View style={{ marginBottom: 12 }}><View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}><Text style={{ fontSize: 11, color: C.t3 }}>Progreso de pago</Text><Text style={{ fontSize: 11, color: C.mint, fontWeight: "700" }}>{pctPaid}% pagado</Text></View><Bar pct={pctPaid} color={C.mint} /></View>}
                  <View style={{ backgroundColor: C.card2, borderRadius: 10, padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: C.t2 }}>Libre en: <Text style={{ color: C.mint, fontWeight: "700" }}>{tl}</Text></Text>
                    {d.rate > 0 && <Text style={{ fontSize: 12, color: C.t2 }}><Text style={{ color: C.rose, fontWeight: "700" }}>{money(Math.round(d.balance * d.rate / 100), cur)}</Text>/año</Text>}
                  </View>
                </Card>
              );
            })}
            {adding ? (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nueva deuda</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {TYPES.map(t => (
                    <TouchableOpacity key={t.id} onPress={() => setForm({ ...form, type: t.id })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: form.type === t.id ? t.color : C.border, backgroundColor: form.type === t.id ? t.color + "20" : C.card }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: form.type === t.id ? t.color : C.t3 }}>{t.icon} {t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {[["name","Nombre del credito","default"],["balance","Saldo actual","numeric"],["limit","Limite o monto original","numeric"],["rate","Tasa anual (%)","numeric"],["minPay","Pago minimo mensual","numeric"]].map(([k, ph, kb]) => (
                  <Input key={k} placeholder={ph} value={form[k]} onChange={v => setForm({ ...form, [k]: v })} numeric={kb === "numeric"} />
                ))}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <Btn label="Cancelar" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
                  <Btn label="Guardar deuda" onPress={addDebt} style={{ flex: 2 }} />
                </View>
              </Card>
            ) : (
              <View style={{ marginHorizontal: 16 }}><Btn label="+ Agregar deuda" onPress={() => setAdding(true)} ghost /></View>
            )}
          </>
        )}
        {view === "estrategia" && (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 }}>
              {[["avalanche","🏔 Avalanche","Mayor tasa primero"],["snowball","⛄ Snowball","Menor saldo primero"]].map(([id, label, sub]) => (
                <TouchableOpacity key={id} onPress={() => setMethod(id)} style={{ flex: 1, backgroundColor: method === id ? C.mint : C.card, borderRadius: 14, borderWidth: 1, borderColor: method === id ? C.mint : C.border, padding: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: method === id ? "#000" : C.t1 }}>{label}</Text>
                  <Text style={{ fontSize: 10, color: method === id ? "#00000080" : C.t3, marginTop: 2 }}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.t1, marginBottom: 8 }}>Abono extra mensual</Text>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Input placeholder={cur} value={extra} onChange={setExtra} numeric style={{ flex: 1, marginBottom: 0 }} />
                <Text style={{ fontSize: 12, color: C.mint, fontWeight: "700" }}>{cur}/mes</Text>
              </View>
            </Card>
            {sorted.map((d, i) => {
              const payment = d.minPay + (i === 0 ? +extra : 0);
              const mo = payoffMonths(d.balance, d.rate, payment);
              const tl = mo === Infinity ? "Solo intereses" : mo > 24 ? (mo / 12).toFixed(1) + " años" : mo + " meses";
              const t = TYPES.find(x => x.id === d.type) || TYPES[5];
              return (
                <Card key={d.id} style={{ marginBottom: 12, borderLeftWidth: 3, borderLeftColor: d.color || t.color }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: i === 0 ? C.mint : C.card2, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 13, fontWeight: "800", color: i === 0 ? "#000" : C.t3 }}>{i + 1}</Text></View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>{d.name}</Text>
                    </View>
                    {i === 0 && <Tag label="🎯 Atacar primero" color={C.mint} />}
                  </View>
                  <View style={{ flexDirection: "row", gap: 0, marginBottom: 12 }}>
                    {[["Saldo", money(d.balance, cur), C.rose], ["Tasa", d.rate + "%", C.gold], ["Pago", money(payment, cur), C.t1]].map(([l, v, c], idx) => (
                      <View key={l} style={{ flex: 1, borderRightWidth: idx < 2 ? 1 : 0, borderRightColor: C.border, paddingRight: idx < 2 ? 12 : 0, paddingLeft: idx > 0 ? 12 : 0 }}>
                        <Text style={{ fontSize: 10, color: C.t3, marginBottom: 3 }}>{l}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c }}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ backgroundColor: C.card2, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 12, color: C.t2 }}>Libre en: <Text style={{ color: C.mint, fontWeight: "700" }}>{tl}</Text></Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// METAS
// ─────────────────────────────────────────────
function MetasScreen({ state, setGoals }) {
  const { user, goals } = state;
  const cur = user.currency;
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState({ name: "", emoji: "🎯", target: "", weeks: "12" });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <Section sup="PLANIFICACION" title="Metas de Ahorro 🎯" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {goals.length === 0 && !adding && (
          <Card style={{ alignItems: "center", paddingVertical: 36 }}>
            <Text style={{ fontSize: 44, marginBottom: 14 }}>🎯</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.t1, marginBottom: 6 }}>Sin metas aun</Text>
            <Text style={{ fontSize: 13, color: C.t3, textAlign: "center" }}>Agrega tu primer objetivo y empieza a ahorrar con proposito.</Text>
          </Card>
        )}
        {goals.map(g => {
          const pct = Math.min((g.saved / g.target) * 100, 100);
          const weekly = ((g.target - g.saved) / g.weeks).toFixed(0);
          return (
            <Card key={g.id} accent style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.mintBg, borderWidth: 1, borderColor: C.mint + "40", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22 }}>{g.emoji}</Text></View>
                  <View><Text style={{ fontSize: 15, fontWeight: "700", color: C.t1 }}>{g.name}</Text><Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{cur}{g.saved.toLocaleString()} de {cur}{g.target.toLocaleString()}</Text></View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Tag label={Math.round(pct) + "%"} color={C.mint} />
                  <TouchableOpacity onPress={() => setGoals(goals.filter(x => x.id !== g.id))}><Text style={{ fontSize: 11, color: C.t4 }}>eliminar</Text></TouchableOpacity>
                </View>
              </View>
              <Bar pct={pct} color={C.mint} h={6} style={{ marginBottom: 12 }} />
              <View style={{ backgroundColor: C.card2, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between" }}>
                <View><Text style={{ fontSize: 10, color: C.t3 }}>Aparta por semana</Text><Text style={{ fontSize: 14, fontWeight: "700", color: C.mint }}>{cur}{Number(weekly).toLocaleString()}</Text></View>
                <View style={{ alignItems: "flex-end" }}><Text style={{ fontSize: 10, color: C.t3 }}>Faltan</Text><Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>{cur}{(g.target - g.saved).toLocaleString()}</Text></View>
              </View>
            </Card>
          );
        })}
        {adding ? (
          <Card>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 16 }}>Nueva meta</Text>
            <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Que quieres lograr?" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Text style={styles.lbl}>EMOJI</Text><Input value={form.emoji} onChange={v => setForm({ ...form, emoji: v })} style={{ textAlign: "center", fontSize: 26 }} /></View>
              <View style={{ flex: 2.5 }}><Text style={styles.lbl}>COSTO ({cur})</Text><Input value={form.target} onChange={v => setForm({ ...form, target: v })} placeholder="ej: 50000" numeric /></View>
            </View>
            <Text style={styles.lbl}>PLAZO</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 14 }}>
              {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 ano"]].map(([w, l]) => (
                <TouchableOpacity key={w} onPress={() => setForm({ ...form, weeks: w })} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: form.weeks === w ? C.mint : C.border, backgroundColor: form.weeks === w ? C.mintBg : C.card, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: form.weeks === w ? C.mint : C.t3 }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!form.name && !!form.target && (
              <View style={{ backgroundColor: C.mintBg, borderRadius: 12, borderWidth: 1, borderColor: C.mint + "40", padding: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: C.t2 }}>Aparta <Text style={{ color: C.mint, fontWeight: "700" }}>{cur}{Math.ceil(+form.target / +form.weeks).toLocaleString()}/semana</Text> durante {form.weeks} semanas.</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Btn label="Cancelar" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
              <Btn label="Guardar meta" onPress={() => { if (!form.name || !form.target) return; setGoals([...goals, { id: Date.now(), ...form, target: +form.target, saved: 0, weeks: +form.weeks }]); setAdding(false); setForm({ name: "", emoji: "🎯", target: "", weeks: "12" }); }} style={{ flex: 2 }} />
            </View>
          </Card>
        ) : (
          <View style={{ marginHorizontal: 16 }}><Btn label="+ Nueva meta de ahorro" onPress={() => setAdding(true)} ghost /></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// HERRAMIENTAS (Score + Predictor + Recordatorios)
// ─────────────────────────────────────────────
function HerramientasScreen({ state, setReminders }) {
  const { user, expenses, income, budgets, reminders, streakDays, goals } = state;
  const cur = user.currency;
  const [sub, setSub] = useState("score");
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const { total, s, grade } = score(expenses, totalInc, budgets);
  const savePct = totalInc > 0 ? Math.round(((totalInc - totalExp) / totalInc) * 100) : 0;
  const dailyAvg  = totalExp / Math.max(DAY, 1);
  const projected = totalExp + dailyAvg * (DAYS_IN_MONTH - DAY);
  const balEOM    = totalInc - projected;
  const runOut    = balEOM < 0 ? Math.round(DAY + (totalInc - totalExp) / Math.max(dailyAvg, 1)) : null;
  const pctSpent  = Math.min((projected / Math.max(totalInc, 1)) * 100, 120);
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState({ name: "", amount: "", day: "" });
  const today    = new Date().getDate();
  const totalRem = reminders.filter(r => r.active).reduce((a, r) => a + r.amount, 0);
  const upcoming = reminders.filter(r => r.active && r.day >= today).sort((a, b) => a.day - b.day);
  const past     = reminders.filter(r => r.active && r.day < today);

  // Rachas y logros reales
  const streak       = calcStreak(streakDays || []);
  const savingGoal   = user.savingGoalPct || 20;
  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const budgetCats   = Object.entries(budgets);
  const overBudget   = budgetCats.some(([k, l]) => (ct[k] || 0) > l);
  const hasActiveGoal = goals && goals.length > 0;
  const isSuperSaver  = savePct >= 30;
  const noNewDebts    = state.debts && state.debts.length === 0;
  const perfectMonth  = expenses.length >= 20 && !overBudget && savePct >= savingGoal;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.t1 }}>Herramientas 🛠️</Text>
      </View>
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border }}>
        {[["score","🌡️ Score"],["predictor","🔮 Predictor"],["pagos","🔔 Pagos"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setSub(id)} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: sub === id ? C.card2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: sub === id ? C.t1 : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {sub === "score" && (
          <>
            <Card accent style={{ alignItems: "center", paddingVertical: 28 }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>{grade.emoji}</Text>
              <Text style={{ fontSize: 60, fontWeight: "800", color: grade.color, letterSpacing: -2, lineHeight: 65 }}>{total}</Text>
              <Text style={{ fontSize: 13, color: C.t3, marginBottom: 8 }}>puntos de 100</Text>
              <Tag label={grade.label} color={grade.color} />
              <Text style={{ fontSize: 12, color: C.t3, marginTop: 10, textAlign: "center" }}>Tu salud financiera este mes</Text>
            </Card>
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Desglose del Score</Text>
              {[["💰 Tasa de ahorro", s.ahorro, C.mint], ["📊 Control", s.presupuesto, C.sky], ["📝 Registro", s.consistencia, C.violet], ["💳 Manejo de deudas", s.deuda, C.gold]].map(([label, val, color]) => (
                <View key={label} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                    <Text style={{ fontSize: 12, color: C.t2 }}>{label}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color }}>{Math.round(val)}pts</Text>
                  </View>
                  <Bar pct={val} color={color} />
                </View>
              ))}
            </Card>
            <Card>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Logros 🏅</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {[
                  ["🔥", "Racha activa",     streak + " dias registrando", streak >= 3],
                  ["💯", "Sin exceder",       "Presupuesto OK",             !overBudget && expenses.length > 0],
                  ["🎯", "Meta activa",       "Ahorro en curso",            hasActiveGoal],
                  ["🦸", "Super ahorrador",  "30%+ ahorro",                isSuperSaver],
                  ["🧘", "Sin deudas",       "Lista de deudas limpia",     noNewDebts],
                  ["📆", "Mes perfecto",     "20+ registros, meta alcanzada", perfectMonth],
                ].map(([ic, label, desc, done]) => (
                  <View key={label} style={{ width: "47%", backgroundColor: done ? C.mintBg : C.card2, borderRadius: 14, borderWidth: 1, borderColor: done ? C.mint + "40" : C.border, padding: 13, opacity: done ? 1 : 0.35 }}>
                    <Text style={{ fontSize: 22, marginBottom: 6 }}>{ic}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: done ? C.mint : C.t3 }}>{label}</Text>
                    <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{desc}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {sub === "predictor" && (
          <>
            <Card style={{ marginBottom: 12, borderColor: runOut ? C.rose + "50" : C.mint + "40", backgroundColor: runOut ? "#150008" : "#00100A" }}>
              <Text style={{ fontSize: 11, color: runOut ? C.rose : C.mint, letterSpacing: 2, marginBottom: 8 }}>{runOut ? "⚠️ ALERTA" : "✅ PROYECCION FAVORABLE"}</Text>
              {runOut ? (
                <Text style={{ fontSize: 15, color: C.rose, fontWeight: "700", lineHeight: 22 }}>
                  A este ritmo te quedaras sin dinero el dia <Text style={{ fontSize: 24 }}>{runOut}</Text>
                </Text>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>Balance al dia {DAYS_IN_MONTH}</Text>
                  <Text style={{ fontSize: 38, fontWeight: "800", color: C.mint, letterSpacing: -1 }}>{money(Math.round(balEOM), cur)}</Text>
                  <Text style={{ fontSize: 12, color: C.t3, marginTop: 6 }}>Ritmo actual: <Text style={{ color: C.t1, fontWeight: "600" }}>{money(Math.round(dailyAvg), cur)}/dia</Text></Text>
                </>
              )}
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: C.t3 }}>Dia {DAY} de {DAYS_IN_MONTH}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: pctSpent > 100 ? C.rose : pctSpent > 80 ? C.gold : C.mint }}>{Math.round(pctSpent)}% proyectado</Text>
                </View>
                <Bar pct={pctSpent} color={C.mint} h={6} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
                  <Text style={{ fontSize: 10, color: C.t3 }}>Gastado: {money(totalExp, cur)}</Text>
                  <Text style={{ fontSize: 10, color: C.t3 }}>Proyectado: {money(Math.round(projected), cur)}</Text>
                </View>
              </View>
            </Card>
            <Card style={{ flexDirection: "row", padding: 0, overflow: "hidden", marginBottom: 12 }}>
              {[[money(Math.round(dailyAvg), cur), "Por dia", C.gold], [money(Math.round(dailyAvg * 7), cur), "Por semana", C.sky], [(DAYS_IN_MONTH - DAY) + " dias", "Restantes", C.violet]].map(([v, l, c], i) => (
                <View key={l} style={{ flex: 1, padding: 16, alignItems: "center", borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.border }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: c, marginBottom: 3 }}>{v}</Text>
                  <Text style={{ fontSize: 10, color: C.t3 }}>{l}</Text>
                </View>
              ))}
            </Card>
            {totalInc > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Lineas de referencia</Text>
                {(() => {
                  const goalAmt = totalInc * (savingGoal / 100);
                  const maxGastable = totalInc - goalAmt;
                  const pctGastado = Math.min((totalExp / maxGastable) * 100, 120);
                  const pctIngresos = Math.min((totalExp / totalInc) * 100, 100);
                  return (
                    <>
                      <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ fontSize: 12, color: C.t2 }}>🟢 Meta de ahorro ({savingGoal}%)</Text>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: pctGastado > 100 ? C.rose : C.green }}>{Math.round(pctGastado)}%</Text>
                        </View>
                        <Bar pct={pctGastado} color={C.green} h={5} />
                        <Text style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>Puedes gastar hasta {money(Math.round(maxGastable), cur)} para cumplir tu meta</Text>
                      </View>
                      <View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ fontSize: 12, color: C.t2 }}>🔵 Limite de ingresos</Text>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: C.sky }}>{money(totalInc, cur)}</Text>
                        </View>
                        <Bar pct={pctIngresos} color={C.sky} h={5} />
                        <Text style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>Gastado: {Math.round(pctIngresos)}% de tus ingresos totales</Text>
                      </View>
                    </>
                  );
                })()}
              </Card>
            )}
          </>
        )}

        {sub === "pagos" && (
          <>
            <Card accent style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 1.5, marginBottom: 4 }}>COMPROMISOS ESTE MES</Text>
              <Text style={{ fontSize: 32, fontWeight: "800", color: C.mint, letterSpacing: -0.5 }}>{money(totalRem, cur)}</Text>
              <Text style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{reminders.filter(r => r.active).length} pagos programados</Text>
            </Card>
            {upcoming.length > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.gold, marginBottom: 14 }}>Proximos pagos</Text>
                {upcoming.map((r, i) => {
                  const d = r.day - today, urgent = d <= 3;
                  return (
                    <View key={r.id}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: urgent ? C.roseBg : C.goldBg, borderWidth: 1, borderColor: urgent ? C.rose + "40" : C.gold + "40", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: urgent ? C.rose : C.gold, lineHeight: 17 }}>{r.day}</Text>
                          <Text style={{ fontSize: 8, color: C.t3, letterSpacing: 0.5 }}>DIA</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: C.t1 }}>{r.name}</Text>
                          <Text style={{ fontSize: 11, color: urgent ? C.rose : C.t3, marginTop: 1 }}>{d === 0 ? "Hoy!" : d === 1 ? "Manana" : "En " + d + " dias"}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: C.gold }}>{money(r.amount, cur)}</Text>
                          <TouchableOpacity onPress={() => setReminders(reminders.filter(x => x.id !== r.id))}><Text style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>quitar</Text></TouchableOpacity>
                        </View>
                      </View>
                      {i < upcoming.length - 1 && <View style={{ height: 1, backgroundColor: C.border, marginVertical: 10, marginLeft: 56 }} />}
                    </View>
                  );
                })}
              </Card>
            )}
            {past.length > 0 && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.t3, marginBottom: 14 }}>Ya pagados ✅</Text>
                {past.map((r, i) => (
                  <View key={r.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: 0.4 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: C.mintBg, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 18, color: C.mint }}>✓</Text></View>
                      <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: "600", color: C.t1, textDecorationLine: "line-through" }}>{r.name}</Text><Text style={{ fontSize: 11, color: C.t3 }}>Dia {r.day}</Text></View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: C.t2 }}>{money(r.amount, cur)}</Text>
                    </View>
                    {i < past.length - 1 && <View style={{ height: 1, backgroundColor: C.border, marginVertical: 10, marginLeft: 56 }} />}
                  </View>
                ))}
              </Card>
            )}
            {reminders.length === 0 && !adding && (
              <Card style={{ alignItems: "center", paddingVertical: 36 }}>
                <Text style={{ fontSize: 44, marginBottom: 14 }}>🔔</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: C.t1, marginBottom: 6 }}>Sin recordatorios</Text>
                <Text style={{ fontSize: 13, color: C.t3, textAlign: "center" }}>Agrega tus pagos fijos para nunca olvidarlos.</Text>
              </Card>
            )}
            {adding ? (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nuevo recordatorio</Text>
                <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Nombre (ej: Netflix, Luz)" />
                <Input value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder={"Monto (" + cur + ")"} numeric />
                <Input value={form.day} onChange={v => setForm({ ...form, day: v })} placeholder="Dia del mes (1-31)" numeric />
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <Btn label="Cancelar" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
                  <Btn label="Guardar" onPress={() => { if (!form.name || !form.amount || !form.day) return; setReminders([...reminders, { id: Date.now(), ...form, amount: +form.amount, day: +form.day, active: true }]); setAdding(false); setForm({ name: "", amount: "", day: "" }); }} style={{ flex: 2 }} />
                </View>
              </Card>
            ) : (
              <View style={{ marginHorizontal: 16 }}><Btn label="+ Nuevo recordatorio" onPress={() => setAdding(true)} ghost /></View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// UTILIDAD: calcular racha real de dias
// ─────────────────────────────────────────────
function calcStreak(streakDays) {
  if (!streakDays || streakDays.length === 0) return 0;
  const sorted = [...new Set(streakDays)].sort().reverse();
  let streak = 0;
  let check = new Date();
  check.setHours(0, 0, 0, 0);
  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((check - d) / 86400000);
    if (diff === 0 || diff === streak) { streak++; check = d; }
    else if (diff > 1) break;
  }
  return streak;
}

// ─────────────────────────────────────────────
// SETTINGS MODAL — Centro de Mando
// ─────────────────────────────────────────────
function SettingsModal({ state, updateState, onClose }) {
  const { user, income, budgets } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const [name,        setName]       = useState(user.name);
  const [salary,      setSalary]     = useState(totalInc > 0 ? String(totalInc) : "");
  const [savingGoal,  setSavingGoal] = useState(String(user.savingGoalPct || 20));
  const [buds,        setBuds]       = useState({ ...budgets });

  function save() {
    const newInc = +salary > 0
      ? [{ id: 1, source: "Salario", amount: +salary, date: new Date().toISOString().split("T")[0], type: "fijo" }]
      : income;
    updateState({
      user: { ...user, name: name.trim() || user.name, savingGoalPct: +savingGoal || 20 },
      income: newInc,
      budgets: buds,
    });
    onClose();
  }

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000000CC", justifyContent: "flex-end" }}>
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: C.border, maxHeight: "88%" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1 }}>Centro de Mando ⚙️</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 22, color: C.t3 }}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.lbl, { marginBottom: 6 }]}>TU NOMBRE</Text>
          <Input value={name} onChange={setName} placeholder="Tu nombre" />

          <Text style={[styles.lbl, { marginTop: 12, marginBottom: 6 }]}>INGRESO MENSUAL ({cur})</Text>
          <Input value={salary} onChange={setSalary} placeholder="ej: 45000" numeric />

          <Text style={[styles.lbl, { marginTop: 12, marginBottom: 6 }]}>META DE AHORRO (%)</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {["10","20","30","40","50"].map(p => (
              <TouchableOpacity key={p} onPress={() => setSavingGoal(p)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, borderColor: savingGoal === p ? C.mint : C.border, backgroundColor: savingGoal === p ? C.mintBg : C.card2, alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: savingGoal === p ? C.mint : C.t3 }}>{p}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.lbl, { marginBottom: 6 }]}>LIMITES DE PRESUPUESTO</Text>
          {Object.keys(CATS).slice(0, 6).map(cat => (
            <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (CATS[cat]?.color || C.mint) + "20", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{CATS[cat]?.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Input value={buds[cat] ? String(buds[cat]) : ""} onChange={v => setBuds({ ...buds, [cat]: +v || 0 })} placeholder={cat + " (0 = sin limite)"} numeric style={{ marginBottom: 0 }} />
              </View>
            </View>
          ))}

          <Btn label="Guardar cambios" onPress={save} style={{ marginTop: 8, marginBottom: 32 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// NAV BAR
// ─────────────────────────────────────────────
function NavBar({ tab, setTab }) {
  const insets = useSafeAreaInsets();
  const items = [
    { id: "home",        icon: "◈",  label: "Inicio"   },
    { id: "chat",        icon: "◉",  label: "IA"       },
    { id: "deudas",      icon: "💳", label: "Deudas"   },
    { id: "metas",       icon: "◎",  label: "Metas"    },
    { id: "herramientas",icon: "⋯",  label: "Mas"      },
  ];
  return (
    <View style={[styles.navBar, { paddingBottom: insets.bottom + 8 }]}>
      {items.map(item => {
        const active = tab === item.id;
        return (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={styles.navBtn} activeOpacity={0.7}>
            {active && <View style={{ position: "absolute", top: 0, width: 32, height: 2, backgroundColor: C.mint, borderRadius: 99 }} />}
            <Text style={{ fontSize: item.icon.length > 2 ? 14 : 22, color: active ? C.mint : C.t4, marginTop: 6 }}>{item.icon}</Text>
            <Text style={{ fontSize: 9, fontWeight: "700", color: active ? C.mint : C.t4, marginTop: 2, letterSpacing: 0.5 }}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// APP ROOT — Estado centralizado
// ─────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState(null); // null = cargando
  const [tab, setTab] = useState("home");
  const [showSettings, setShowSettings] = useState(false);
  const saveTimer = useRef(null);

  // Cargar al iniciar
  useEffect(() => {
    loadApp().then(saved => {
      if (saved && saved.onboarded && saved.user) {
        setAppState(saved);
      } else {
        setAppState({ onboarded: false });
      }
    });
  }, []);

  // Guardar con debounce — espera 800ms tras el ultimo cambio
  function updateState(changes) {
    setAppState(prev => {
      const next = { ...prev, ...changes };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveApp(next).catch(() => {});
      }, 800);
      return next;
    });
  }

  // Onboarding completado
  function onDone(data) {
    const next = {
      onboarded: true,
      user:      data.user,
      expenses:  [],
      goals:     data.goals,
      debts:     [],
      income:    data.income,
      reminders: [],
      budgets:   data.budgets,
      streakDays: [],
    };
    // Guardar primero, luego cambiar estado
    saveApp(next).finally(() => {
      setAppState(next);
    });
  }

  // CARGANDO
  if (appState === null) {
    return (
      <SafeAreaProvider>
        <Loading />
      </SafeAreaProvider>
    );
  }

  // ONBOARDING
  if (!appState.onboarded) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Onboarding onDone={onDone} />
      </SafeAreaProvider>
    );
  }

  // APP PRINCIPAL
  const s = appState;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        {tab === "home"         && <HomeScreen          state={s} openSettings={() => setShowSettings(true)} />}
        {tab === "chat"         && <ChatScreen          state={s} addExpense={e => {
          const today = new Date().toISOString().split("T")[0];
          const streak = s.streakDays || [];
          const newStreak = streak.includes(today) ? streak : [...streak, today];
          updateState({ expenses: [e, ...s.expenses], streakDays: newStreak });
        }} />}
        {tab === "deudas"       && <DeudasScreen        state={s} setDebts={v  => updateState({ debts: v })} />}
        {tab === "metas"        && <MetasScreen         state={s} setGoals={v  => updateState({ goals: v })} />}
        {tab === "herramientas" && <HerramientasScreen  state={s} setReminders={v => updateState({ reminders: v })} />}
        <NavBar tab={tab} setTab={setTab} />
        {showSettings && <SettingsModal state={s} updateState={updateState} onClose={() => setShowSettings(false)} />}
      </View>
    </SafeAreaProvider>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  card:    { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 18, marginHorizontal: 16, marginBottom: 12 },
  btn:     { borderRadius: 13, padding: 15, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "700" },
  input:   { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, color: C.t1, fontSize: 14, marginBottom: 10 },
  obWrap:  { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 52 },
  obH:     { fontSize: 26, fontWeight: "800", color: C.t1, marginBottom: 6, letterSpacing: -0.5 },
  obSub:   { fontSize: 13, color: C.t2, marginBottom: 24, lineHeight: 20 },
  lbl:     { fontSize: 10, color: C.t3, letterSpacing: 1.5, fontWeight: "700", marginBottom: 6 },
  navBar:  { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 4 },
  navBtn:  { flex: 1, alignItems: "center", paddingVertical: 4, position: "relative" },
});
