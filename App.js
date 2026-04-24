import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Alert, Dimensions, Animated,
  Modal, Pressable, Switch,
} from "react-native";
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SW } = Dimensions.get("window");

// ─────────────────────────────────────────────
// TEMAS
// ─────────────────────────────────────────────
const DARK_THEME = {
  bg: "#060608", card: "#0F0F18", card2: "#161620",
  card3: "#1C1C28", border: "#22223A", border2: "#2E2E48",
  mint: "#00E5B0", mintDim: "#00C49A", mintBg: "#00E5B012", mintBg2: "#00E5B025",
  gold: "#F5B800", goldDim: "#D4A000", goldBg: "#F5B80012", goldBg2: "#F5B80028",
  rose: "#FF4D6D", roseDim: "#E03358", roseBg: "#FF4D6D12", roseBg2: "#FF4D6D28",
  sky: "#38BDF8", skyDim: "#22A8E8", skyBg: "#38BDF812", skyBg2: "#38BDF828",
  violet: "#A78BFA", violetBg: "#A78BFA12",
  green: "#10B981", greenBg: "#10B98112",
  orange: "#FB923C", orangeBg: "#FB923C12",
  pink: "#EC4899",
  t1: "#F0F0FA", t2: "#9898B8", t3: "#55556A", t4: "#28283A", t5: "#1A1A28",
};

const LIGHT_THEME = {
  bg: "#F0F4F8", card: "#FFFFFF", card2: "#F7F9FC",
  card3: "#EDF0F5", border: "#DDE2EA", border2: "#C8D0DC",
  mint: "#00B88A", mintDim: "#009A74", mintBg: "#00B88A14", mintBg2: "#00B88A28",
  gold: "#D4920A", goldDim: "#B87E08", goldBg: "#D4920A14", goldBg2: "#D4920A28",
  rose: "#E8274B", roseDim: "#C82040", roseBg: "#E8274B14", roseBg2: "#E8274B28",
  sky: "#0EA5E9", skyDim: "#0284C7", skyBg: "#0EA5E914", skyBg2: "#0EA5E928",
  violet: "#7C3AED", violetBg: "#7C3AED14",
  green: "#059669", greenBg: "#05966914",
  orange: "#EA580C", orangeBg: "#EA580C14",
  pink: "#DB2777",
  t1: "#0F172A", t2: "#475569", t3: "#94A3B8", t4: "#CBD5E1", t5: "#E2E8F0",
};

let C = { ...DARK_THEME };
function applyTheme(isDark) {
  const src = isDark ? DARK_THEME : LIGHT_THEME;
  Object.keys(src).forEach(k => { C[k] = src[k]; });
}

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────
const DEF_BUDGETS = { Alimentacion: 8000, Transporte: 4000, Ocio: 3000, Suscripciones: 1500 };

const CATS = {
  Alimentacion:  { icon: "🛒", color: "#00E5B0" },
  Transporte:    { icon: "⛽", color: "#38BDF8" },
  Ocio:          { icon: "🎮", color: "#EC4899" },
  Salud:         { icon: "💊", color: "#10B981" },
  Suscripciones: { icon: "📱", color: "#A78BFA" },
  Hogar:         { icon: "🏠", color: "#FB923C" },
  Educacion:     { icon: "📚", color: "#F5B800" },
  Otro:          { icon: "💸", color: "#55556A" },
};

const STORE_KEY = "mifinanzas_v7";
const TODAY = new Date();
const DAY = TODAY.getDate();

function loadApp() {
  return AsyncStorage.getItem(STORE_KEY)
    .then(raw => raw ? JSON.parse(raw) : null)
    .catch(() => null);
}

function saveApp(state) {
  return AsyncStorage.setItem(STORE_KEY, JSON.stringify(state)).catch(() => {});
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────
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

// ── Lógica Semafórica ──
function getBalanceColor(balance, totalInc) {
  if (totalInc <= 0) return C.mint;
  const ratio = balance / totalInc;
  if (ratio >= 0.5) return "#4CAF50";
  if (ratio > 0.25) return "#FFC107";
  return "#F44336";
}

function getBalanceLabel(balance, totalInc) {
  if (totalInc <= 0) return "Disponible";
  const ratio = balance / totalInc;
  if (ratio >= 0.5) return "Saludable";
  if (ratio > 0.25) return "Precaución";
  return "Alerta";
}

function calcScore(expenses, income, budgets) {
  const exp = expenses.reduce((a, e) => a + e.amount, 0);
  const save = income > 0 ? ((income - exp) / income) * 100 : 0;
  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const cats = Object.entries(budgets);
  const over = cats.filter(([k, l]) => (ct[k] || 0) > l).length;
  const s = {
    ahorro: Math.min(100, Math.max(0, save * 2.5)),
    presupuesto: cats.length ? Math.max(0, 100 - (over / cats.length) * 100) : 80,
    consistencia: Math.min(100, (expenses.length / 15) * 100),
    deuda: 85,
  };
  const total = Math.round(s.ahorro * 0.4 + s.presupuesto * 0.3 + s.consistencia * 0.2 + s.deuda * 0.1);
  const grade = total >= 85 ? { label: "Excelente", color: "#4CAF50", emoji: "🏆" }
    : total >= 70 ? { label: "Bueno", color: "#00E5B0", emoji: "✅" }
      : total >= 50 ? { label: "Regular", color: "#FFC107", emoji: "⚠️" }
        : { label: "Crítico", color: "#F44336", emoji: "🚨" };
  return { total, grade };
}

function calcRunway(balance, expenses) {
  if (expenses.length === 0 || balance <= 0) return null;
  const days = Math.max(DAY, 1);
  const dailyBurn = expenses.reduce((a, e) => a + e.amount, 0) / days;
  if (dailyBurn <= 0) return null;
  return Math.floor(balance / dailyBurn);
}

function calcStreak(streakDays) {
  if (!streakDays || streakDays.length === 0) return 0;
  const sorted = Array.from(new Set(streakDays)).sort().reverse();
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

function payoffMonths(balance, rate, payment) {
  const r = rate / 100 / 12;
  if (payment <= r * balance) return Infinity;
  if (r === 0) return Math.ceil(balance / payment);
  return Math.ceil(Math.log(payment / (payment - r * balance)) / Math.log(1 + r));
}

function lifeHours(amount, monthlyIncome) {
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  const hourlyRate = monthlyIncome / (22 * 8);
  return Math.round(amount / hourlyRate);
}

// ─────────────────────────────────────────────
// ANIMACIONES
// ─────────────────────────────────────────────
function FadeIn({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

function PulseView({ children, active, color, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.04, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.97, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scale.setValue(1);
    }
  }, [active]);
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// COMPONENTES BASE
// ─────────────────────────────────────────────
function Card({ children, style, accent, accentColor, glow, danger }) {
  const acCol = accentColor || C.mint;
  const borderCol = danger ? C.rose + "60" : accent ? acCol + "50" : C.border;
  const bg = danger ? "#180008" : C.card;
  const shadowStyle = glow ? {
    shadowColor: acCol, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 18, elevation: 10,
  } : {};
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 22, borderWidth: 1, borderColor: borderCol, padding: 18, marginHorizontal: 16, marginBottom: 12 }, shadowStyle, style]}>
      {accent && <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, backgroundColor: acCol, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />}
      {children}
    </View>
  );
}

function Btn({ label, onPress, primary, ghost, danger, disabled, style, small, icon }) {
  const bg = disabled ? C.t4 : danger ? C.rose : primary !== false && !ghost ? C.mint : "transparent";
  const tc = disabled ? C.t3 : (ghost || danger) ? (danger ? C.rose : C.t2) : "#000";
  return (
    <TouchableOpacity
      onPress={disabled ? null : onPress}
      activeOpacity={0.75}
      style={[{ borderRadius: 14, padding: 15, alignItems: "center", flexDirection: "row", justifyContent: "center", backgroundColor: bg, borderWidth: ghost ? 1 : 0, borderColor: ghost ? C.border2 : "transparent" }, small && { padding: 10 }, style]}
    >
      {icon ? <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text> : null}
      <Text style={[{ fontSize: 15, fontWeight: "700", color: tc }, small && { fontSize: 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Input({ value, onChange, placeholder, numeric, style, multiline }) {
  return (
    <TextInput
      style={[{ backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 13, padding: 14, color: C.t1, fontSize: 14, marginBottom: 10 }, style]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.t3}
      keyboardType={numeric ? "numeric" : "default"}
      multiline={multiline}
    />
  );
}

function Bar({ pct, color, h, bg, showGlow }) {
  const p = Math.min(Math.max(pct || 0, 0), 100);
  const bc = pct > 100 ? C.rose : pct > 85 ? C.gold : (color || C.mint);
  return (
    <View style={{ height: h || 5, borderRadius: 99, backgroundColor: bg || C.border, overflow: "hidden" }}>
      <View style={{ height: "100%", width: p + "%", borderRadius: 99, backgroundColor: bc }} />
    </View>
  );
}

function Tag({ label, color, size }) {
  return (
    <View style={{ backgroundColor: color + "22", borderRadius: 7, borderWidth: 1, borderColor: color + "35", paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: size === "sm" ? 10 : 11, fontWeight: "700", color, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

function Section({ sup, title, right }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
      <View>
        {!!sup && <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2.5, marginBottom: 3, textTransform: "uppercase" }}>{sup}</Text>}
        <Text style={{ fontSize: 22, fontWeight: "800", color: C.t1, letterSpacing: -0.8 }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function CatIcon({ cat, size }) {
  const s = size || 44;
  const info = CATS[cat] || CATS["Otro"];
  return (
    <View style={{ width: s, height: s, borderRadius: s * 0.3, backgroundColor: info.color + "20", borderWidth: 1, borderColor: info.color + "30", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: s * 0.42 }}>{info.icon}</Text>
    </View>
  );
}

// Score Circular para el header
function ScoreCircle({ score, size = 52 }) {
  const color = score >= 70 ? "#4CAF50" : score >= 40 ? "#FFC107" : "#F44336";
  const isAlert = score < 40;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isAlert) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.94, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [isAlert]);
  const deg = Math.round((score / 100) * 360);
  return (
    <Animated.View style={{ transform: [{ scale: pulse }], alignItems: "center", justifyContent: "center", width: size, height: size }}>
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: C.border2 }} />
      <View style={{
        position: "absolute", width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: "transparent",
        borderTopColor: deg >= 0 ? color : "transparent",
        borderRightColor: deg >= 90 ? color : "transparent",
        borderBottomColor: deg >= 180 ? color : "transparent",
        borderLeftColor: deg >= 270 ? color : "transparent",
        transform: [{ rotate: "-90deg" }],
      }} />
      <View style={{ alignItems: "center" }}>
        {isAlert && <Text style={{ fontSize: 10 }}>🚨</Text>}
        <Text style={{ fontSize: isAlert ? 11 : 13, fontWeight: "900", color, letterSpacing: -0.5 }}>{score}</Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────
function Loading() {
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: DARK_THEME.bg, alignItems: "center", justifyContent: "center" }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_THEME.bg} />
      <Animated.View style={{ opacity: pulse, alignItems: "center" }}>
        <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: DARK_THEME.mintBg2, borderWidth: 2, borderColor: DARK_THEME.mint + "50", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 44 }}>💚</Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: "900", color: DARK_THEME.t1, letterSpacing: -1 }}>
          Mi<Text style={{ color: DARK_THEME.mint }}>Finanzas</Text>
        </Text>
        <Text style={{ fontSize: 12, color: DARK_THEME.t3, marginTop: 8, letterSpacing: 1.5 }}>CARGANDO...</Text>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [cur, setCur] = useState("RD$");
  const [inc, setInc] = useState("");
  const [extra, setExtra] = useState("");
  const [bud, setBud] = useState({ Alimentacion: "", Transporte: "", Ocio: "", Suscripciones: "" });
  const [gName, setGName] = useState("");
  const [gEmoji, setGEmoji] = useState("🎯");
  const [gTarget, setGTarget] = useState("");
  const [gWeeks, setGWeeks] = useState("24");

  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const dots = (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 28 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ height: 3, borderRadius: 99, backgroundColor: i <= step ? C.mint : C.border, width: i === step ? 24 : 6 }} />
      ))}
    </View>
  );

  function submit() {
    const userData = { name: name.trim() || "Usuario", currency: cur };
    const goals = gName && gTarget
      ? [{ id: 1, name: gName, emoji: gEmoji, target: +gTarget, saved: 0, weeks: +gWeeks }]
      : [];
    const income = [];
    if (inc) income.push({ id: 1, source: "Salario", amount: +inc, date: new Date().toISOString().split("T")[0], type: "fijo" });
    if (extra) income.push({ id: 2, source: "Variable", amount: +extra, date: new Date().toISOString().split("T")[0], type: "variable" });
    const budgets = {};
    Object.entries(bud).forEach(([k, v]) => { if (v) budgets[k] = +v; });
    onDone({
      user: userData, goals, income,
      budgets: Object.keys(budgets).length > 0 ? budgets : DEF_BUDGETS,
    });
  }

  const obWrap = { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 52 };
  const obH = { fontSize: 28, fontWeight: "900", color: C.t1, marginBottom: 6, letterSpacing: -0.8 };
  const obSub = { fontSize: 13, color: C.t2, marginBottom: 24, lineHeight: 20 };
  const lbl = { fontSize: 10, color: C.t3, letterSpacing: 2, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" };

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
            Finanzas personales con IA para República Dominicana.
          </Text>
          {[
            ["⚡", "Score financiero en tiempo real"],
            ["🚦", "Semáforo inteligente de balance"],
            ["📊", "Motor de supervivencia (Runway)"],
            ["🤖", "IA conversacional accionable"],
            ["🎯", "Metas y estrategia de deudas"],
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

  if (step === 1) return (
    <SafeAreaView style={obWrap}>
      {dots}
      <Text style={obH}>¿Cómo te llamamos? 👋</Text>
      <Text style={obSub}>Personaliza tu experiencia.</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={lbl}>TU NOMBRE</Text>
        <Input value={name} onChange={setName} placeholder="ej: Carlos, María..." />
        <Text style={[lbl, { marginTop: 16 }]}>MONEDA</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {["RD$", "$", "€", "Q"].map(c => (
            <TouchableOpacity key={c} onPress={() => setCur(c)} style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: cur === c ? C.mint : C.border, backgroundColor: cur === c ? C.mintBg : C.card, alignItems: "center" }}>
              <Text style={{ fontWeight: "800", fontSize: 15, color: cur === c ? C.mint : C.t3 }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atrás" onPress={() => setStep(0)} ghost style={{ flex: 1 }} />
        <Btn label="Continuar →" onPress={() => { if (name.trim()) setStep(2); else Alert.alert("Ingresa tu nombre"); }} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  if (step === 2) return (
    <SafeAreaView style={obWrap}>
      {dots}
      <Text style={obH}>Tus ingresos 💼</Text>
      <Text style={obSub}>¿Cuánto recibes al mes? (aproximado)</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.mintBg, borderRadius: 14, borderWidth: 1, borderColor: C.mint + "40", padding: 14, marginBottom: 20 }}>
          <Text style={{ fontSize: 12, color: C.mint, fontWeight: "700", marginBottom: 3 }}>¿Por qué lo pedimos?</Text>
          <Text style={{ fontSize: 12, color: C.t2, lineHeight: 18 }}>Calculamos tu score, semáforo y proyecciones personalizadas.</Text>
        </View>
        <Text style={lbl}>INGRESO FIJO MENSUAL ({cur})</Text>
        <Input value={inc} onChange={setInc} placeholder="ej: 45000" numeric />
        <Text style={[lbl, { marginTop: 12 }]}>INGRESOS VARIABLES ({cur})</Text>
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
        <Btn label="Atrás" onPress={() => setStep(1)} ghost style={{ flex: 1 }} />
        <Btn label="Continuar →" onPress={() => setStep(3)} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  if (step === 3) return (
    <SafeAreaView style={obWrap}>
      {dots}
      <Text style={obH}>Tus límites 📊</Text>
      <Text style={obSub}>¿Cuánto quieres gastar por categoría al mes?</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {Object.keys(bud).map(cat => (
          <View key={cat} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (CATS[cat]?.color || C.mint) + "20", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{CATS[cat]?.icon}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{cat}</Text>
            </View>
            <Input value={bud[cat]} onChange={v => setBud({ ...bud, [cat]: v })} placeholder={cat + " (0 = sin límite)"} numeric />
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atrás" onPress={() => setStep(2)} ghost style={{ flex: 1 }} />
        <Btn label="Continuar →" onPress={() => setStep(4)} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={obWrap}>
      {dots}
      <Text style={obH}>Tu primera meta 🎯</Text>
      <Text style={obSub}>¿Hacia qué estás ahorrando? (puedes saltar)</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={lbl}>NOMBRE DE LA META</Text>
        <Input value={gName} onChange={setGName} placeholder="ej: iPhone, Vacaciones, Carro..." />
        <Text style={[lbl, { marginTop: 8 }]}>EMOJI</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {["🎯", "🚗", "✈️", "🏠", "💻", "💍", "🎓", "📱"].map(e => (
            <TouchableOpacity key={e} onPress={() => setGEmoji(e)} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: gEmoji === e ? C.mint + "25" : C.card2, borderWidth: 1.5, borderColor: gEmoji === e ? C.mint : C.border, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={lbl}>MONTO OBJETIVO ({cur})</Text>
        <Input value={gTarget} onChange={setGTarget} placeholder="ej: 80000" numeric />
        <Text style={[lbl, { marginTop: 8 }]}>PLAZO EN SEMANAS</Text>
        <Input value={gWeeks} onChange={setGWeeks} placeholder="ej: 24" numeric />
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atrás" onPress={() => setStep(3)} ghost style={{ flex: 1 }} />
        <Btn label="Empezar →" onPress={submit} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// FAB — botón de acción rápida expandible
// ─────────────────────────────────────────────
function FAB({ onPress }) {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ position: "absolute", bottom: 80 + insets.bottom, right: 22, transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}
        style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: C.mint, alignItems: "center", justifyContent: "center", shadowColor: C.mint, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 }}>
        <Text style={{ fontSize: 28, color: "#000", fontWeight: "900", marginTop: -2 }}>+</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function FABModal({ visible, onClose, onSave, cur, onSaveIncome, onSaveDebtPayment, debts }) {
  const [mode, setMode] = useState(null); // null | "gasto" | "ingreso" | "abono"
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("Otro");
  const [debtId, setDebtId] = useState(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setMode(null), 250);
    }
  }, [visible]);

  const reset = () => { setDesc(""); setAmount(""); setCat("Otro"); setDebtId(null); };

  const save = () => {
    const amt = parseFloat(amount.replace(",", ""));
    if (!amt || amt <= 0) return Alert.alert("Ingresa un monto válido");
    if (mode === "gasto") {
      onSave({ id: Date.now(), desc: desc || cat, amount: amt, cat, date: new Date().toISOString().split("T")[0] });
    } else if (mode === "ingreso") {
      onSaveIncome({ id: Date.now(), source: desc || "Ingreso", amount: amt, date: new Date().toISOString().split("T")[0], type: "variable" });
    } else if (mode === "abono") {
      onSaveDebtPayment(debtId, amt);
    }
    reset();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: "#00000085", opacity: bgOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, transform: [{ translateY: slideAnim }] }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border2, alignSelf: "center", marginBottom: 20 }} />

        {!mode ? (
          <>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1, marginBottom: 20, textAlign: "center" }}>¿Qué deseas registrar?</Text>
            {[
              { id: "gasto", icon: "💸", label: "Gasto", color: C.rose },
              { id: "ingreso", icon: "💰", label: "Ingreso", color: C.mint },
              { id: "abono", icon: "💳", label: "Abono a Deuda", color: C.gold },
            ].map(opt => (
              <TouchableOpacity key={opt.id} onPress={() => setMode(opt.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: opt.color + "12", borderRadius: 16, borderWidth: 1, borderColor: opt.color + "35", padding: 16, marginBottom: 10 }}>
                <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: opt.color }}>{opt.label}</Text>
                <Text style={{ color: C.t3, marginLeft: "auto", fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setMode(null)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.t2, fontSize: 18 }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1 }}>
                {mode === "gasto" ? "Registrar Gasto" : mode === "ingreso" ? "Registrar Ingreso" : "Abono a Deuda"}
              </Text>
            </View>

            {mode === "abono" && debts && debts.length > 0 && (
              <>
                <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 1.5, fontWeight: "700", marginBottom: 8 }}>SELECCIONA LA DEUDA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {debts.map(d => (
                      <TouchableOpacity key={d.id} onPress={() => setDebtId(d.id)}
                        style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: debtId === d.id ? C.gold : C.border, backgroundColor: debtId === d.id ? C.goldBg : C.card2 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: debtId === d.id ? C.gold : C.t2 }}>{d.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {mode === "gasto" && (
              <>
                <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 1.5, fontWeight: "700", marginBottom: 8 }}>CATEGORÍA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {Object.entries(CATS).map(([k, v]) => (
                      <TouchableOpacity key={k} onPress={() => setCat(k)}
                        style={{ alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: cat === k ? v.color : C.border, backgroundColor: cat === k ? v.color + "20" : C.card2 }}>
                        <Text style={{ fontSize: 18 }}>{v.icon}</Text>
                        <Text style={{ fontSize: 9, color: cat === k ? v.color : C.t3, fontWeight: "700", marginTop: 3 }}>{k}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 1.5, fontWeight: "700", marginBottom: 8 }}>MONTO ({cur})</Text>
            <Input value={amount} onChange={setAmount} placeholder="0" numeric style={{ fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 }} />

            {mode !== "abono" && (
              <>
                <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 1.5, fontWeight: "700", marginBottom: 8 }}>DESCRIPCIÓN (OPCIONAL)</Text>
                <Input value={desc} onChange={setDesc} placeholder="ej: Almuerzo, Gasolina..." style={{ marginBottom: 12 }} />
              </>
            )}

            <Btn label="Guardar →" onPress={save} style={{ marginTop: 4 }} />
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// HOME SCREEN — Centro de mando
// ─────────────────────────────────────────────
function HomeScreen({ state, openSettings, onAddExpense, onUpdateIncome, onDeleteExpense }) {
  const { expenses, income, budgets, user, streakDays = [], emergencyBrake } = state;
  const cur = user.currency;
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const balance = totalInc - totalExp;
  const savePct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;

  const balanceColor = getBalanceColor(balance, totalInc);
  const balanceLabel = getBalanceLabel(balance, totalInc);
  const isRed = balanceColor === "#F44336";
  const isYellow = balanceColor === "#FFC107";

  const { total: sc, grade } = calcScore(expenses, totalInc, budgets);
  const runway = calcRunway(balance, expenses);
  const streak = calcStreak(streakDays);

  // Detectar suscripciones recurrentes
  const subs = expenses.filter(e => e.cat === "Suscripciones");

  const [showFAB, setShowFAB] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  // Botón ocultar balance (privacidad)
  const toggleBalance = () => setHideBalance(h => !h);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

          {/* ── HEADER ── */}
          <FadeIn delay={0}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}>
              {/* Avatar + nombre */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.mintBg2, borderWidth: 1.5, borderColor: C.mint + "50", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 22 }}>👤</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 0.3 }}>Hola,</Text>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>{user.name} <Text style={{ fontSize: 12, color: C.t3, fontWeight: "400" }}>Nv.5</Text></Text>
                </View>
              </View>
              {/* Score circular + ajustes */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ScoreCircle score={sc} size={52} />
                <TouchableOpacity onPress={openSettings} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>

          {/* ── SCORE LABEL ── */}
          <FadeIn delay={40}>
            <View style={{ alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2, fontWeight: "700" }}>SCORE FINANCIERO</Text>
            </View>
          </FadeIn>

          {/* ── HERO: BALANCE ── */}
          <FadeIn delay={80}>
            <PulseView active={isRed} style={{ marginHorizontal: 16, marginBottom: 14 }}>
              <View style={{
                borderRadius: 24, overflow: "hidden", borderWidth: 1.5,
                borderColor: balanceColor + "60",
                backgroundColor: C.card,
                shadowColor: balanceColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25, shadowRadius: 20, elevation: 8,
              }}>
                {/* Top accent bar */}
                <View style={{ height: 3, backgroundColor: balanceColor }} />
                <View style={{ padding: 24, alignItems: "center" }}>
                  {/* Badge estado */}
                  <View style={{ backgroundColor: balanceColor + "22", borderRadius: 10, borderWidth: 1, borderColor: balanceColor + "50", paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: balanceColor, letterSpacing: 1.5 }}>
                      {isRed ? "🚨 " : isYellow ? "⚠️ " : "✅ "}{balanceLabel.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 13, color: C.t3, letterSpacing: 1, marginBottom: 4 }}>Balance Disponible</Text>
                  <TouchableOpacity onPress={toggleBalance}>
                    <Text style={{ fontSize: 38, fontWeight: "900", color: balanceColor, letterSpacing: -2 }}>
                      {hideBalance ? "RD$••••••" : money(balance, cur)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>Toca para {hideBalance ? "mostrar" : "ocultar"} · 🔒 Privacidad</Text>
                </View>
              </View>
            </PulseView>
          </FadeIn>

          {/* ── MÉTRICAS FILA ── */}
          <FadeIn delay={120}>
            <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 14 }}>
              {/* Tasa de ahorro */}
              <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: savePct < 0 ? C.rose + "50" : C.border, padding: 14, alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, fontWeight: "700", marginBottom: 6 }}>TASA AHORRO</Text>
                <Text style={{ fontSize: 22, fontWeight: "900", color: savePct >= 20 ? C.mint : savePct >= 0 ? C.gold : C.rose, letterSpacing: -1 }}>{savePct}%</Text>
                <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>este mes</Text>
                <View style={{ width: "100%", marginTop: 8 }}>
                  <Bar pct={Math.max(0, savePct)} color={savePct >= 20 ? C.mint : savePct >= 0 ? C.gold : C.rose} h={4} />
                </View>
              </View>

              {/* Runway */}
              <View style={{ flex: 1, backgroundColor: runway !== null && runway < 7 ? C.roseBg : C.card, borderRadius: 18, borderWidth: 1, borderColor: runway !== null && runway < 7 ? C.rose + "50" : C.border, padding: 14, alignItems: "center" }}>
                <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, fontWeight: "700", marginBottom: 6 }}>SUPERVIVENCIA</Text>
                <Text style={{ fontSize: 22, fontWeight: "900", color: runway === null ? C.t3 : runway < 7 ? C.rose : runway < 15 ? C.gold : C.mint, letterSpacing: -1 }}>
                  {runway === null ? "—" : runway}
                </Text>
                <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>días de runway</Text>
                {runway !== null && runway < 7 && (
                  <Text style={{ fontSize: 9, color: C.rose, fontWeight: "700", marginTop: 6, textAlign: "center" }}>⚡ CRÍTICO</Text>
                )}
              </View>
            </View>
          </FadeIn>

          {/* ── MODO SUPERVIVENCIA BANNER ── */}
          {isRed && (
            <FadeIn delay={140}>
              <PulseView active style={{ marginHorizontal: 16, marginBottom: 14 }}>
                <View style={{ borderRadius: 18, backgroundColor: C.roseBg2, borderWidth: 1.5, borderColor: C.rose + "60", padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Text style={{ fontSize: 32 }}>🚨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: C.rose, letterSpacing: -0.3 }}>MODO SUPERVIVENCIA</Text>
                    <Text style={{ fontSize: 11, color: C.t2, marginTop: 3, lineHeight: 16 }}>
                      Balance crítico. Prioriza solo necesidades básicas.
                    </Text>
                  </View>
                </View>
              </PulseView>
            </FadeIn>
          )}

          {/* ── FRENO DE EMERGENCIA ── */}
          {(isRed || isYellow) && (
            <FadeIn delay={160}>
              <Card style={{ marginBottom: 14 }} accent accentColor={C.rose}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: C.t1 }}>🛑 Freno de Emergencia</Text>
                    <Text style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 16 }}>
                      Desactiva Ocio y Lujos por 48h para proteger tu balance.
                    </Text>
                  </View>
                  <Switch
                    value={emergencyBrake || false}
                    onValueChange={() => {}}
                    trackColor={{ false: C.border2, true: C.rose + "80" }}
                    thumbColor={emergencyBrake ? C.rose : C.t3}
                  />
                </View>
                {emergencyBrake && (
                  <View style={{ marginTop: 10, backgroundColor: C.roseBg, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 11, color: C.rose, fontWeight: "700" }}>🔒 Ocio y Lujos bloqueados por 48 horas</Text>
                  </View>
                )}
              </Card>
            </FadeIn>
          )}

          {/* ── GASTOS RECIENTES ── */}
          <FadeIn delay={200}>
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Gastos Recientes</Text>
                {expenses.length > 0 && (
                  <TouchableOpacity onPress={() => setShowHistorial(true)}>
                    <Tag label={"Ver todos (" + expenses.length + ")"} color={C.sky} />
                  </TouchableOpacity>
                )}
              </View>

              {expenses.length === 0 ? (
                <View style={{ paddingVertical: 8, alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 70, marginBottom: 14, width: "100%" }}>
                    {[40, 65, 30, 80, 50, 70, 45].map((h, i) => (
                      <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 70 }}>
                        <View style={{ width: "100%", height: h, borderRadius: 8, backgroundColor: C.mint + "15", borderWidth: 1, borderColor: C.mint + "25" }} />
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: C.mint }}>Tu potencial de ahorro aquí</Text>
                  <Text style={{ fontSize: 11, color: C.t3, marginTop: 4, textAlign: "center", lineHeight: 17 }}>
                    Cada gasto registrado construye{"\n"}tu mapa financiero real.
                  </Text>
                  <TouchableOpacity onPress={() => setShowFAB(true)} style={{ marginTop: 14, backgroundColor: C.mintBg2, borderRadius: 12, borderWidth: 1, borderColor: C.mint + "45", paddingHorizontal: 18, paddingVertical: 9 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: C.mint }}>+ Registrar primer gasto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                expenses.slice(0, 5).map((e, i) => {
                  const info = CATS[e.cat] || CATS["Otro"];
                  return (
                    <View key={e.id}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: info.color + "18", borderWidth: 1, borderColor: info.color + "30", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 20 }}>{info.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }} numberOfLines={1}>{e.desc}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: info.color }} />
                            <Text style={{ fontSize: 10, color: C.t3 }}>{e.cat} · {e.date}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: C.rose }}>-{money(e.amount, cur)}</Text>
                      </View>
                      {i < Math.min(expenses.length, 5) - 1 && <View style={{ height: 1, backgroundColor: C.border, marginVertical: 11, marginLeft: 56 }} />}
                    </View>
                  );
                })
              )}
            </Card>
          </FadeIn>

          {/* ── GASTOS FANTASMA (SUSCRIPCIONES) ── */}
          {subs.length > 0 && (
            <FadeIn delay={240}>
              <Card style={{ marginBottom: 14 }} accent accentColor={C.violet}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 4 }}>👻 Gastos Fantasma</Text>
                <Text style={{ fontSize: 11, color: C.t3, marginBottom: 14 }}>Suscripciones que podrías estar pagando sin usar</Text>
                {subs.map((s, i) => (
                  <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: i < subs.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                    <Text style={{ fontSize: 20 }}>📱</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: C.t1 }}>{s.desc}</Text>
                      <Text style={{ fontSize: 10, color: C.t3 }}>¿Lo usaste en los últimos 15 días?</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: C.violet }}>{money(s.amount, cur)}</Text>
                  </View>
                ))}
                <View style={{ marginTop: 12, backgroundColor: C.violetBg, borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 11, color: C.violet, fontWeight: "700" }}>💡 Cancela lo que no usas y ahorra {money(subs.reduce((a, s) => a + s.amount, 0), cur)}/mes</Text>
                </View>
              </Card>
            </FadeIn>
          )}

          {/* ── RACHA ── */}
          <FadeIn delay={280}>
            <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: streak > 0 ? C.gold + "50" : C.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: C.goldBg, borderWidth: 1.5, borderColor: C.gold + "40", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 26 }}>{streak > 0 ? "🔥" : "💤"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: streak > 0 ? C.gold : C.t3 }}>
                  {streak} días de racha
                </Text>
                <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                  {streak > 0 ? "¡Sigue registrando diario!" : "Registra un gasto para empezar"}
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: "900", color: C.gold }}>{streak > 0 ? "🏅" : ""}</Text>
            </View>
          </FadeIn>

        </ScrollView>
      </SafeAreaView>

      <FABModal
        visible={showFAB}
        onClose={() => setShowFAB(false)}
        onSave={onAddExpense}
        cur={cur}
        onSaveIncome={() => {}}
        onSaveDebtPayment={() => {}}
        debts={[]}
      />
      <HistorialModal
        visible={showHistorial}
        onClose={() => setShowHistorial(false)}
        expenses={expenses}
        onDelete={onDeleteExpense}
        cur={cur}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// HISTORIAL MODAL
// ─────────────────────────────────────────────
function HistorialModal({ visible, onClose, expenses, onDelete, cur }) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#00000070" }} onPress={onClose} />
      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "85%", backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, transform: [{ translateY: slideAnim }] }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1 }}>Historial de Gastos</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {expenses.map((e, i) => {
            const info = CATS[e.cat] || CATS["Otro"];
            return (
              <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: i < expenses.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: info.color + "18", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>{info.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{e.desc}</Text>
                  <Text style={{ fontSize: 10, color: C.t3 }}>{e.cat} · {e.date}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "800", color: C.rose }}>-{money(e.amount, cur)}</Text>
                <TouchableOpacity onPress={() => onDelete(e.id)} style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: C.roseBg, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: C.rose, fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// ESTRATEGIA SCREEN — Deudas + Metas unificadas
// ─────────────────────────────────────────────
function EstrategiaScreen({ state, setDebts, setGoals }) {
  const { user, debts, goals, income } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);
  const netWorth = totalSaved - totalDebt;

  const [activeTab, setActiveTab] = useState("deudas");
  const [addingDebt, setAddingDebt] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [method, setMethod] = useState("avalanche");
  const [extra, setExtra] = useState("2000");
  const [debtForm, setDebtForm] = useState({ type: "tarjeta", name: "", balance: "", rate: "", minPay: "", limit: "" });
  const [goalForm, setGoalForm] = useState({ name: "", emoji: "🎯", target: "", weeks: "12" });

  const DEBT_TYPES = [
    { id: "tarjeta", icon: "💳", label: "Tarjeta", color: C.rose },
    { id: "prestamo", icon: "🏦", label: "Préstamo", color: C.gold },
    { id: "hipoteca", icon: "🏠", label: "Hipoteca", color: C.sky },
    { id: "auto", icon: "🚗", label: "Auto", color: C.violet },
    { id: "informal", icon: "🤝", label: "Informal", color: C.green },
    { id: "otro", icon: "📋", label: "Otro", color: C.t3 },
  ];

  const GOAL_COLORS = [C.sky, C.mint, C.violet, C.gold, C.orange, C.pink];

  const addDebt = () => {
    if (!debtForm.name || !debtForm.balance) return;
    const t = DEBT_TYPES.find(x => x.id === debtForm.type) || DEBT_TYPES[5];
    setDebts([...debts, { id: Date.now(), ...debtForm, balance: +debtForm.balance, rate: +debtForm.rate || 0, minPay: +debtForm.minPay || 0, limit: +(debtForm.limit || debtForm.balance), color: t.color }]);
    setAddingDebt(false);
    setDebtForm({ type: "tarjeta", name: "", balance: "", rate: "", minPay: "", limit: "" });
  };

  const addGoal = () => {
    if (!goalForm.name || !goalForm.target) return;
    setGoals([...goals, { id: Date.now(), ...goalForm, target: +goalForm.target, saved: 0, weeks: +goalForm.weeks }]);
    setAddingGoal(false);
    setGoalForm({ name: "", emoji: "🎯", target: "", weeks: "12" });
  };

  const sorted = [...debts].sort((a, b) => method === "avalanche" ? b.rate - a.rate : a.balance - b.balance);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>

      {/* Header */}
      <FadeIn delay={0}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}>
          <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2.5, fontWeight: "700" }}>GESTIÓN</Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.t1, letterSpacing: -0.8 }}>Estrategia</Text>
        </View>
      </FadeIn>

      {/* Patrimonio neto */}
      <FadeIn delay={60}>
        <View style={{ marginHorizontal: 16, marginBottom: 14, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: netWorth >= 0 ? C.mint + "40" : C.rose + "40", padding: 16 }}>
          <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>PATRIMONIO NETO</Text>
          <Text style={{ fontSize: 32, fontWeight: "900", color: netWorth >= 0 ? C.mint : C.rose, letterSpacing: -1.5, textAlign: "center" }}>
            {netWorth >= 0 ? "+" : "-"}{money(Math.abs(netWorth), cur)}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 14, gap: 0 }}>
            <View style={{ flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: C.border }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: C.rose }}>{money(totalDebt, cur)}</Text>
              <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Total deuda</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: C.mint }}>{money(totalSaved, cur)}</Text>
              <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Total ahorrado</Text>
            </View>
          </View>
        </View>
      </FadeIn>

      {/* Tab selector */}
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border }}>
        {[["deudas", "💳 Deudas"], ["metas", "🎯 Metas"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setActiveTab(id)} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: activeTab === id ? C.card2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: activeTab === id ? C.t1 : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── DEUDAS ── */}
        {activeTab === "deudas" && (
          <>
            {debts.length === 0 && !addingDebt ? (
              <Card style={{ alignItems: "center", paddingVertical: 36 }}>
                <Text style={{ fontSize: 44, marginBottom: 14 }}>🎉</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.t1, marginBottom: 6 }}>Sin deudas registradas</Text>
                <Text style={{ fontSize: 13, color: C.t3, textAlign: "center", marginBottom: 20 }}>¡Excelente señal financiera!</Text>
                <Btn label="+ Agregar deuda" onPress={() => setAddingDebt(true)} ghost style={{ paddingHorizontal: 24 }} />
              </Card>
            ) : (
              <>
                {/* Selector de método */}
                {debts.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginBottom: 12 }}>
                    {[["avalanche", "🏔 Avalanche", "Mayor tasa primero"], ["snowball", "⛄ Snowball", "Menor saldo primero"]].map(([id, label, sub]) => (
                      <TouchableOpacity key={id} onPress={() => setMethod(id)} style={{ flex: 1, backgroundColor: method === id ? C.mint : C.card, borderRadius: 14, borderWidth: 1, borderColor: method === id ? C.mint : C.border, padding: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: method === id ? "#000" : C.t1 }}>{label}</Text>
                        <Text style={{ fontSize: 10, color: method === id ? "#00000080" : C.t3, marginTop: 2 }}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {sorted.map((d, i) => {
                  const t = DEBT_TYPES.find(x => x.id === d.type) || DEBT_TYPES[5];
                  const dc = d.color || t.color;
                  const payment = d.minPay + (i === 0 ? +extra : 0);
                  const mo = payoffMonths(d.balance, d.rate, payment);
                  const tl = mo === Infinity ? "Solo intereses" : mo > 24 ? (mo / 12).toFixed(1) + " años" : mo + " meses";
                  return (
                    <View key={d.id} style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1.5, borderColor: dc + "45", backgroundColor: C.card }}>
                      <View style={{ height: 3, backgroundColor: dc, borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
                      <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: dc + "22", borderWidth: 1, borderColor: dc + "40", alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                            </View>
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>{d.name}</Text>
                              {i === 0 && <Tag label="🎯 Atacar primero" color={dc} size="sm" />}
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => setDebts(debts.filter(x => x.id !== d.id))} style={{ padding: 6, borderRadius: 10, backgroundColor: C.roseBg }}>
                            <Text style={{ color: C.rose, fontSize: 16, fontWeight: "700" }}>×</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: "row", backgroundColor: C.card2, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
                          {[["Saldo", money(d.balance, cur), C.rose], ["Tasa", d.rate + "% anual", C.gold], ["Mín/mes", money(d.minPay, cur), C.t1]].map(([l, v, c], idx) => (
                            <View key={l} style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRightWidth: idx < 2 ? 1 : 0, borderRightColor: C.border }}>
                              <Text style={{ fontSize: 12, fontWeight: "800", color: c }}>{v}</Text>
                              <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{l}</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={{ fontSize: 12, color: C.t2 }}>⏱ Libre en: <Text style={{ color: dc, fontWeight: "700" }}>{tl}</Text></Text>
                      </View>
                    </View>
                  );
                })}

                {addingDebt ? (
                  <Card>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nueva deuda</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {DEBT_TYPES.map(t => (
                        <TouchableOpacity key={t.id} onPress={() => setDebtForm({ ...debtForm, type: t.id })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: debtForm.type === t.id ? t.color : C.border, backgroundColor: debtForm.type === t.id ? t.color + "20" : C.card }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: debtForm.type === t.id ? t.color : C.t3 }}>{t.icon} {t.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {[["name", "Nombre del crédito", "default"], ["balance", "Saldo actual", "numeric"], ["rate", "Tasa anual (%)", "numeric"], ["minPay", "Pago mínimo mensual", "numeric"]].map(([k, ph, kb]) => (
                      <Input key={k} placeholder={ph} value={debtForm[k]} onChange={v => setDebtForm({ ...debtForm, [k]: v })} numeric={kb === "numeric"} />
                    ))}
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                      <Btn label="Cancelar" onPress={() => setAddingDebt(false)} ghost style={{ flex: 1 }} />
                      <Btn label="Guardar" onPress={addDebt} style={{ flex: 2 }} />
                    </View>
                  </Card>
                ) : (
                  <View style={{ marginHorizontal: 16 }}>
                    <Btn label="+ Agregar deuda" onPress={() => setAddingDebt(true)} ghost />
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ── METAS ── */}
        {activeTab === "metas" && (
          <>
            {goals.length === 0 && !addingGoal ? (
              <Card style={{ alignItems: "center", paddingVertical: 36 }}>
                <Text style={{ fontSize: 44, marginBottom: 14 }}>🎯</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.t1, marginBottom: 6 }}>Sin metas aún</Text>
                <Text style={{ fontSize: 13, color: C.t3, textAlign: "center", marginBottom: 20 }}>Define tu primer objetivo y mira tu progreso visual</Text>
                <Btn label="+ Crear meta" onPress={() => setAddingGoal(true)} ghost style={{ paddingHorizontal: 24 }} />
              </Card>
            ) : (
              <>
                {goals.map((g, i) => {
                  const pct = Math.min((g.saved / g.target) * 100, 100);
                  const col = GOAL_COLORS[i % GOAL_COLORS.length];
                  const weekly = ((g.target - g.saved) / Math.max(g.weeks, 1)).toFixed(0);
                  return (
                    <View key={g.id} style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: col + "45" }}>
                      <View style={{ height: 3, backgroundColor: col, borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
                      <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: col + "20", borderWidth: 1.5, borderColor: col + "40", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>{g.name}</Text>
                            <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{money(g.saved, cur)} de {money(g.target, cur)}</Text>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 6 }}>
                            <View style={{ backgroundColor: col + "22", borderRadius: 8, borderWidth: 1, borderColor: col + "40", paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 12, fontWeight: "900", color: col }}>{Math.round(pct)}%</Text>
                            </View>
                            <TouchableOpacity onPress={() => setGoals(goals.filter(x => x.id !== g.id))}>
                              <Text style={{ fontSize: 10, color: C.t4 }}>eliminar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Bar pct={pct} color={col} h={8} showGlow />
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                          <Text style={{ fontSize: 10, color: C.t3 }}>Aparta {money(+weekly, cur)}/semana</Text>
                          <Text style={{ fontSize: 10, color: col, fontWeight: "700" }}>Faltan {money(g.target - g.saved, cur)}</Text>
                        </View>

                        {/* Micro-inversión: redondeo */}
                        <View style={{ marginTop: 12, backgroundColor: col + "12", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 16 }}>🪙</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: col }}>Micro-Inversión</Text>
                            <Text style={{ fontSize: 10, color: C.t3 }}>Activa el redondeo automático de gastos para esta meta</Text>
                          </View>
                          <Switch
                            value={g.rounding || false}
                            onValueChange={() => {
                              const updated = goals.map(x => x.id === g.id ? { ...x, rounding: !x.rounding } : x);
                              setGoals(updated);
                            }}
                            trackColor={{ false: C.border2, true: col + "80" }}
                            thumbColor={g.rounding ? col : C.t3}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}

                {addingGoal ? (
                  <Card>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nueva meta</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                      {["🎯", "🚗", "✈️", "🏠", "💻", "💍", "🎓", "📱"].map(e => (
                        <TouchableOpacity key={e} onPress={() => setGoalForm({ ...goalForm, emoji: e })} style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: goalForm.emoji === e ? C.mint + "25" : C.card2, borderWidth: 1.5, borderColor: goalForm.emoji === e ? C.mint : C.border, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 20 }}>{e}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Input placeholder="Nombre de la meta" value={goalForm.name} onChange={v => setGoalForm({ ...goalForm, name: v })} />
                    <Input placeholder="Monto objetivo" value={goalForm.target} onChange={v => setGoalForm({ ...goalForm, target: v })} numeric />
                    <Input placeholder="Plazo en semanas" value={goalForm.weeks} onChange={v => setGoalForm({ ...goalForm, weeks: v })} numeric />
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                      <Btn label="Cancelar" onPress={() => setAddingGoal(false)} ghost style={{ flex: 1 }} />
                      <Btn label="Guardar" onPress={addGoal} style={{ flex: 2 }} />
                    </View>
                  </Card>
                ) : (
                  <View style={{ marginHorizontal: 16 }}>
                    <Btn label="+ Crear meta" onPress={() => setAddingGoal(true)} ghost />
                  </View>
                )}
              </>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// CHAT IA — TARS con componentes accionables
// ─────────────────────────────────────────────
const API_KEY = "TU_API_KEY_AQUI"; // ← Reemplaza con tu key de console.anthropic.com

function ChatScreen({ state, addExpense, addIncome }) {
  const { user, income, debts, budgets, goals, expenses: allExp } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = allExp.reduce((a, e) => a + e.amount, 0);
  const balance = totalInc - totalExp;
  const { total: sc } = calcScore(allExp, totalInc, budgets);
  const runway = calcRunway(balance, allExp);

  const buildContext = () => {
    const ct = {};
    allExp.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
    const savePct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
    const debtTotal = debts.reduce((a, d) => a + d.balance, 0);
    return `Eres TARS, el asistente financiero de élite de ${user.name} en República Dominicana.
Moneda: ${cur}. Fecha: ${new Date().toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })}.

SITUACIÓN FINANCIERA:
- Balance: ${money(balance, cur)} | Score: ${sc}/100
- Ingresos: ${money(totalInc, cur)} | Gastos: ${money(totalExp, cur)}
- Tasa ahorro: ${savePct}% | Runway: ${runway ?? "N/A"} días
- Deuda total: ${money(debtTotal, cur)}
- Por categoría: ${JSON.stringify(ct)}
- Metas: ${goals?.map(g => `${g.emoji}${g.name}: ${Math.round((g.saved / g.target) * 100)}%`).join(", ") || "ninguna"}

INSTRUCCIONES:
- Responde en español dominicano coloquial con emojis estratégicos
- Máximo 3 párrafos cortos y accionables
- Si detectas gasto de lujo, menciona las horas de trabajo que cuesta
- Si el runway es <30 días, incluye esa advertencia urgente
- Si hay deudas con tasa >20%, sugiere atacarlas primero
- Sé brutalmente honesto pero motivador
- Cuando puedas dar una acción concreta, incluye al final: ACTION:{"type":"...","data":{...}}
  Tipos: "recorte" (recortar categoría), "ahorro" (mover a meta)`;
  };

  const WELCOME = `¡Qué lo qué, ${user.name}! 🚀 Soy TARS, tu asesor financiero.\n\nSituación actual:\n💰 Balance: ${money(balance, cur)}\n📊 Score: ${sc}/100\n${runway ? `⏳ Runway: ${runway} días` : ""}\n\nDime qué necesitas:\n• "Gasté 800 en gasolina"\n• "¿Cuánto llevo en comida?"\n• "Analiza mis finanzas"\n• "¿Me conviene pagar la BHD?"`;

  const [msgs, setMsgs] = useState([{ bot: true, text: WELCOME }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroll = useRef(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMsgs(m => [...m, { bot: false, text: msg }]);
    setLoading(true);

    const low = msg.toLowerCase();
    const parsed = nlp(msg);

    const isEntry = /gast[eé]|pagu[eé]|compr[eé]|sali[oó]/.test(low);
    if (isEntry && parsed.amount) {
      const newE = { id: Date.now(), desc: parsed.desc, amount: parsed.amount, cat: parsed.cat, date: parsed.date };
      addExpense(newE);
      const hours = lifeHours(parsed.amount, totalInc);
      const hoursMsg = hours && hours >= 2 ? `\n⏱ Eso son ${hours} horas de tu trabajo.` : "";
      const budgetRem = budgets[parsed.cat] ? Math.max(0, budgets[parsed.cat] - ((allExp.filter(e => e.cat === parsed.cat).reduce((a, e) => a + e.amount, 0)) + parsed.amount)) : null;
      const budgetMsg = budgetRem !== null ? `\n📊 Te quedan ${money(budgetRem, cur)} en ${parsed.cat} este mes.` : "";
      setLoading(false);
      setMsgs(m => [...m, { bot: true, text: `✅ Registrado!\n\n${CATS[parsed.cat]?.icon || "💸"} ${parsed.desc}\n${money(parsed.amount, cur)} · ${parsed.cat}${hoursMsg}${budgetMsg}` }]);
      return;
    }

    const catMatch = Object.keys(CATS).find(k => low.includes(k.toLowerCase()));
    if (/cuánto|cuanto|llevo|total/.test(low) && catMatch) {
      const spent = allExp.filter(e => e.cat === catMatch).reduce((a, e) => a + e.amount, 0);
      const bud = budgets[catMatch];
      const pct = bud ? Math.round((spent / bud) * 100) : null;
      setLoading(false);
      setMsgs(m => [...m, { bot: true, text: `📊 ${CATS[catMatch]?.icon} ${catMatch} este mes:\n\n${money(spent, cur)} gastados${bud ? ` de ${money(bud, cur)} (${pct}%)` : ""}\n\n${pct > 90 ? "⚠️ Casi al límite, cuidado." : pct > 70 ? "👀 Vas bien pero vigila." : "✅ Dentro del presupuesto."}` }]);
      return;
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, system: buildContext(), messages: [{ role: "user", content: msg }] }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      let text = data.content?.[0]?.text || "No pude responder.";

      // Parsear action si existe
      let action = null;
      const actionMatch = text.match(/ACTION:(\{.*\})/s);
      if (actionMatch) {
        try { action = JSON.parse(actionMatch[1]); } catch (e) {}
        text = text.replace(/ACTION:\{.*\}/s, "").trim();
      }

      setMsgs(m => [...m, { bot: true, text, action }]);
    } catch (err) {
      const savePct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
      let fallback = `🤖 Modo offline, análisis rápido:\n\n💰 Balance: ${money(balance, cur)}\n📈 Ahorro: ${savePct}%\n`;
      if (runway) fallback += `⏳ Runway: ${runway} días\n`;
      fallback += savePct >= 20 ? `\n✅ Vas excelente. ¡Mantén ese ritmo!` : `\n⚠️ Ahorro bajo. Revisa gastos de Ocio primero.\n\n💡 Agrega tu API key en App.js para respuestas completas.`;
      setMsgs(m => [...m, { bot: true, text: fallback }]);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View>
          <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2, fontWeight: "700" }}>ASISTENTE</Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>TARS <Text style={{ color: C.mint }}>IA</Text> 🤖</Text>
        </View>
        <View style={{ backgroundColor: C.mintBg2, borderRadius: 10, borderWidth: 1, borderColor: C.mint + "40", paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: C.mint }}>{money(balance, cur)}</Text>
          <Text style={{ fontSize: 9, color: C.t3, textAlign: "center" }}>disponible</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {msgs.map((m, i) => (
            <View key={i} style={{ marginBottom: 12, alignItems: m.bot ? "flex-start" : "flex-end" }}>
              {m.bot ? (
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "85%" }}>
                  <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: C.mintBg2, borderWidth: 1, borderColor: C.mint + "40", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                    <Text style={{ fontSize: 14 }}>🤖</Text>
                  </View>
                  <View>
                    <View style={{ padding: 13, borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: C.card, borderWidth: 1, borderColor: C.border2 }}>
                      <Text style={{ fontSize: 13, color: C.t1, lineHeight: 21 }}>{m.text}</Text>
                    </View>
                    {/* Componentes accionables */}
                    {m.action && (
                      <TouchableOpacity style={{ marginTop: 8, backgroundColor: C.mint + "20", borderRadius: 12, borderWidth: 1, borderColor: C.mint + "50", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ fontSize: 18 }}>⚡</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: C.mint }}>
                            {m.action.type === "recorte" ? "Ejecutar Recorte" : "Mover a Ahorro"}
                          </Text>
                          <Text style={{ fontSize: 10, color: C.t3 }}>Toca para aplicar esta acción</Text>
                        </View>
                        <Text style={{ color: C.mint, fontSize: 18 }}>›</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View style={{ maxWidth: "80%", padding: 13, borderRadius: 18, borderBottomRightRadius: 4, backgroundColor: C.mint }}>
                  <Text style={{ fontSize: 13, color: "#000", lineHeight: 21, fontWeight: "600" }}>{m.text}</Text>
                </View>
              )}
            </View>
          ))}
          {loading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: C.mintBg2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 14 }}>🤖</Text>
              </View>
              <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border2, padding: 14, flexDirection: "row", gap: 6 }}>
                {[0, 1, 2].map(j => (
                  <View key={j} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.mint, opacity: 0.6 + j * 0.2 }} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 14, paddingBottom: 6, maxHeight: 44 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["Analiza mis finanzas", "¿Cuánto llevo en comida?", "Consejo para ahorrar", "¿Cómo están mis deudas?", "¿Cuántos días me quedan?"].map(s => (
              <TouchableOpacity key={s} onPress={() => setInput(s)} style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card2, borderRadius: 10, borderWidth: 1, borderColor: C.border2 }}>
                <Text style={{ fontSize: 11, color: C.t2, fontWeight: "600" }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 10, padding: 14, paddingBottom: 20, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          <TextInput
            style={{ flex: 1, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 13, padding: 14, color: C.t1, fontSize: 14 }}
            placeholder="Escribe o pregunta a TARS..."
            placeholderTextColor={C.t3}
            value={input} onChangeText={setInput}
            onSubmitEditing={send} returnKeyType="send"
            multiline maxHeight={100}
          />
          <TouchableOpacity onPress={send}
            style={{ width: 48, height: 48, backgroundColor: loading ? C.t4 : C.mint, borderRadius: 14, alignItems: "center", justifyContent: "center", shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8 }}
            activeOpacity={0.8} disabled={loading}>
            <Text style={{ fontSize: 20, color: "#000", fontWeight: "900" }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// SETTINGS MODAL
// ─────────────────────────────────────────────
function SettingsModal({ state, updateState, onClose, isDark, onToggleTheme }) {
  const { user, budgets, income } = state;
  const cur = user.currency;
  const [buds, setBuds] = useState({ ...DEF_BUDGETS, ...budgets });

  const save = () => {
    updateState({ budgets: buds });
    onClose();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#00000070" }}>
        <Pressable style={{ flex: 0.25 }} onPress={onClose} />
        <View style={{ flex: 0.75, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1 }}>Ajustes</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.t2, fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {/* Tema */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card2, borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>Modo Oscuro</Text>
                <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Cambia la apariencia visual</Text>
              </View>
              <Switch value={isDark} onValueChange={onToggleTheme} trackColor={{ false: C.border2, true: C.mint + "80" }} thumbColor={isDark ? C.mint : C.t3} />
            </View>

            {/* Presupuestos */}
            <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 2, fontWeight: "700", marginBottom: 12 }}>PRESUPUESTOS MENSUALES</Text>
            {Object.keys(DEF_BUDGETS).map(cat => (
              <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <CatIcon cat={cat} size={36} />
                <View style={{ flex: 1 }}>
                  <Input value={buds[cat] ? String(buds[cat]) : ""} onChange={v => setBuds({ ...buds, [cat]: +v || 0 })} placeholder={cat + " (0 = sin límite)"} numeric style={{ marginBottom: 0 }} />
                </View>
              </View>
            ))}
            <Btn label="Guardar cambios" onPress={save} style={{ marginTop: 8, marginBottom: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// NAV BAR — 3 tabs + perfil
// ─────────────────────────────────────────────
function NavBar({ tab, setTab, isDark }) {
  const insets = useSafeAreaInsets();
  const items = [
    { id: "home", icon: "◈", label: "Inicio" },
    { id: "estrategia", icon: "⚔️", label: "Estrategia" },
    { id: "chat", icon: "◉", label: "Asistente IA" },
    { id: "perfil", icon: "👤", label: "Perfil" },
  ];

  return (
    <View style={{ flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border2, paddingTop: 4, paddingBottom: insets.bottom + 8 }}>
      {items.map(item => {
        const active = tab === item.id;
        return (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4, position: "relative" }} activeOpacity={0.7}>
            {active && <View style={{ position: "absolute", top: 0, width: 36, height: 2.5, backgroundColor: C.mint, borderRadius: 99 }} />}
            <View style={{ marginTop: 6, width: 36, height: 28, alignItems: "center", justifyContent: "center", backgroundColor: active ? C.mintBg2 : "transparent", borderRadius: 10 }}>
              <Text style={{ fontSize: item.icon.length > 2 ? 14 : 18, color: active ? C.mint : C.t3 }}>{item.icon}</Text>
            </View>
            <Text style={{ fontSize: 9, fontWeight: "700", color: active ? C.mint : C.t3, marginTop: 2, letterSpacing: 0.5 }}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// PERFIL SCREEN
// ─────────────────────────────────────────────
function PerfilScreen({ state, updateState, isDark, onToggleTheme }) {
  const { user, income, expenses, budgets, streakDays = [] } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const balance = totalInc - totalExp;
  const { total: sc, grade } = calcScore(expenses, totalInc, budgets);
  const streak = calcStreak(streakDays);
  const runway = calcRunway(balance, expenses);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: C.t1, letterSpacing: -0.8 }}>Perfil</Text>
        </View>

        {/* Avatar & nombre */}
        <FadeIn>
          <View style={{ alignItems: "center", paddingVertical: 28 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: C.mintBg2, borderWidth: 2, borderColor: C.mint + "50", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 42 }}>👤</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>{user.name}</Text>
            <Text style={{ fontSize: 13, color: C.t3, marginTop: 4 }}>Nivel 5 · {cur}</Text>
          </View>
        </FadeIn>

        {/* Stats */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: C.t3, letterSpacing: 2, fontWeight: "700", marginBottom: 14 }}>RESUMEN FINANCIERO</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[
              ["Score", sc + "/100", grade.color],
              ["Racha", streak + " días", C.gold],
              ["Runway", (runway ?? "—") + (runway ? " días" : ""), runway && runway < 7 ? C.rose : C.mint],
              ["Ahorro", totalInc > 0 ? Math.round(((balance) / totalInc) * 100) + "%" : "0%", C.sky],
            ].map(([l, v, c]) => (
              <View key={l} style={{ width: "50%", paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: c, letterSpacing: -1 }}>{v}</Text>
                <Text style={{ fontSize: 10, color: C.t3, marginTop: 3, letterSpacing: 0.5 }}>{l}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Tema */}
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>🌙 Modo Oscuro</Text>
              <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Interfaz oscura para tus ojos</Text>
            </View>
            <Switch value={isDark} onValueChange={onToggleTheme} trackColor={{ false: C.border2, true: C.mint + "80" }} thumbColor={isDark ? C.mint : C.t3} />
          </View>
        </Card>

        {/* Restablecer datos */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 4 }}>⚠️ Zona de Datos</Text>
          <Text style={{ fontSize: 11, color: C.t3, marginBottom: 14 }}>Aquí puedes gestionar tus datos de la aplicación</Text>
          <Btn label="Exportar Resumen" onPress={() => Alert.alert("Próximamente", "Exportación PDF en desarrollo")} ghost />
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState(null);
  const [tab, setTab] = useState("home");
  const [showSettings, setShowSettings] = useState(false);
  const [showFABGlobal, setShowFABGlobal] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [themeKey, setThemeKey] = useState(0);
  const saveTimer = useRef(null);

  useEffect(() => {
    applyTheme(isDark);
    setThemeKey(k => k + 1);
  }, [isDark]);

  useEffect(() => {
    loadApp().then(saved => {
      if (saved && saved.onboarded && saved.user) {
        if (saved.user.darkMode === false) { setIsDark(false); applyTheme(false); }
        setAppState(saved);
      } else {
        setAppState({ onboarded: false });
      }
    }).catch(() => setAppState({ onboarded: false }));
  }, []);

  function updateState(changes) {
    setAppState(prev => {
      const next = { ...prev, ...changes };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveApp(next).catch(() => {}), 800);
      return next;
    });
  }

  function toggleTheme(dark) {
    setIsDark(dark);
    applyTheme(dark);
    updateState({ user: { ...appState.user, darkMode: dark } });
  }

  function onDone(data) {
    const next = {
      onboarded: true,
      user: { ...data.user, darkMode: true },
      expenses: [],
      goals: data.goals,
      debts: [],
      income: data.income,
      budgets: data.budgets,
      streakDays: [],
      emergencyBrake: false,
    };
    saveApp(next).then(() => setAppState(next)).catch(() => setAppState(next));
  }

  if (appState === null) {
    return <SafeAreaProvider><Loading /></SafeAreaProvider>;
  }

  if (!appState.onboarded) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Onboarding onDone={onDone} />
      </SafeAreaProvider>
    );
  }

  const s = appState;

  const addExpenseWithStreak = (e) => {
    const today = new Date().toISOString().split("T")[0];
    const streak = s.streakDays || [];
    const newStreak = streak.includes(today) ? streak : [...streak, today];
    // Micro-inversión: redondeo automático si hay metas con rounding activo
    const roundingGoals = (s.goals || []).filter(g => g.rounding);
    let updatedGoals = s.goals;
    if (roundingGoals.length > 0) {
      const rounded = Math.ceil(e.amount / 100) * 100;
      const diff = rounded - e.amount;
      if (diff > 0 && diff < 100) {
        updatedGoals = s.goals.map(g =>
          g.rounding ? { ...g, saved: g.saved + diff / roundingGoals.length } : g
        );
      }
    }
    updateState({ expenses: [e, ...s.expenses], streakDays: newStreak, goals: updatedGoals });
  };

  const deleteExpense = (id) => updateState({ expenses: s.expenses.filter(e => e.id !== id) });
  const addIncome = (inc) => updateState({ income: [...s.income, inc] });

  return (
    <SafeAreaProvider key={themeKey}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />

        {tab === "home" && (
          <HomeScreen
            state={s}
            openSettings={() => setShowSettings(true)}
            onAddExpense={addExpenseWithStreak}
            onUpdateIncome={inc => updateState({ income: inc })}
            onDeleteExpense={deleteExpense}
          />
        )}
        {tab === "estrategia" && (
          <EstrategiaScreen
            state={s}
            setDebts={v => updateState({ debts: v })}
            setGoals={v => updateState({ goals: v })}
          />
        )}
        {tab === "chat" && (
          <ChatScreen state={s} addExpense={addExpenseWithStreak} addIncome={addIncome} />
        )}
        {tab === "perfil" && (
          <PerfilScreen state={s} updateState={updateState} isDark={isDark} onToggleTheme={toggleTheme} />
        )}

        <NavBar tab={tab} setTab={setTab} isDark={isDark} />

        {tab !== "chat" && (
          <FAB onPress={() => setShowFABGlobal(true)} />
        )}

        <FABModal
          visible={showFABGlobal}
          onClose={() => setShowFABGlobal(false)}
          onSave={addExpenseWithStreak}
          cur={s.user?.currency || "RD$"}
          onSaveIncome={addIncome}
          onSaveDebtPayment={(debtId, amount) => {
            const updated = s.debts.map(d => d.id === debtId ? { ...d, balance: Math.max(0, d.balance - amount) } : d);
            updateState({ debts: updated });
          }}
          debts={s.debts}
        />

        {showSettings && (
          <SettingsModal
            state={s}
            updateState={updateState}
            onClose={() => setShowSettings(false)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}
