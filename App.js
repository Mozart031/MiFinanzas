import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Alert, Dimensions, Animated,
  Modal, Pressable,
} from "react-native";
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────
// ICONOS — SVG Unicode profesionales (sin emojis)
// ─────────────────────────────────────────────
const ICON = {
  // Nav
  home:       "⌂",
  strategy:   "◈",
  ai:         "◉",
  profile:    "◎",
  plus:       "+",
  // Acciones
  settings:   "≡",
  eye:        "◉",
  eyeOff:     "◎",
  back:       "‹",
  close:      "×",
  check:      "✓",
  alert:      "!",
  lock:       "■",
  shield:     "◆",
  chart:      "▲",
  trend:      "↗",
  trendDown:  "↘",
  stable:     "→",
  fire:       "◆",
  target:     "◎",
  // Categorías
  cart:       "⊞",
  fuel:       "▣",
  game:       "◧",
  health:     "✚",
  phone:      "▤",
  house:      "⌂",
  book:       "▦",
  money:      "◈",
  // Finanzas
  income:     "↑",
  expense:    "↓",
  debt:       "◆",
  goal:       "◎",
  save:       "▲",
  // Estado
  ok:         "●",
  warn:       "●",
  danger:     "●",
  trophy:     "▲",
  star:       "★",
  run:        "►",
};

// ─────────────────────────────────────────────
// TEMA — dark / light
// ─────────────────────────────────────────────
const DARK_THEME = {
  bg: "#060608", card: "#0F0F18", card2: "#161620", card3: "#1C1C28",
  border: "#22223A", border2: "#2E2E48",
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
  bg: "#F0F4F8", card: "#FFFFFF", card2: "#F7F9FC", card3: "#EDF0F5",
  border: "#DDE2EA", border2: "#C8D0DC",
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

// SURVIVAL THEME — modo rojo global
const SURVIVAL_THEME = {
  bg: "#080204", card: "#120008", card2: "#1A000D", card3: "#1F0010",
  border: "#3A0018", border2: "#4A0020",
  mint: "#FF4D6D", mintDim: "#E03358", mintBg: "#FF4D6D12", mintBg2: "#FF4D6D25",
  gold: "#FF7043", goldDim: "#E64A19", goldBg: "#FF704312", goldBg2: "#FF704328",
  rose: "#FF4D6D", roseDim: "#E03358", roseBg: "#FF4D6D12", roseBg2: "#FF4D6D28",
  sky: "#FF6B8A", skyDim: "#E85575", skyBg: "#FF6B8A12", skyBg2: "#FF6B8A28",
  violet: "#FF6B9D", violetBg: "#FF6B9D12",
  green: "#FF4D6D", greenBg: "#FF4D6D12",
  orange: "#FF7043", orangeBg: "#FF704312",
  pink: "#FF4D8B",
  t1: "#FFE0E8", t2: "#CC8899", t3: "#7A3344", t4: "#3A1520", t5: "#200A10",
};

let C = { ...DARK_THEME };
function applyTheme(mode) {
  const src = mode === "survival" ? SURVIVAL_THEME : mode === "light" ? LIGHT_THEME : DARK_THEME;
  Object.keys(src).forEach(k => { C[k] = src[k]; });
}

// ─────────────────────────────────────────────
// CATEGORÍAS — con iconos profesionales
// ─────────────────────────────────────────────
const CATS = {
  Alimentacion:  { icon: ICON.cart,   color: "#00E5B0", label: "Alimentación" },
  Transporte:    { icon: ICON.fuel,   color: "#38BDF8", label: "Transporte"   },
  Ocio:          { icon: ICON.game,   color: "#EC4899", label: "Ocio"         },
  Salud:         { icon: ICON.health, color: "#10B981", label: "Salud"        },
  Suscripciones: { icon: ICON.phone,  color: "#A78BFA", label: "Suscripciones"},
  Hogar:         { icon: ICON.house,  color: "#FB923C", label: "Hogar"        },
  Educacion:     { icon: ICON.book,   color: "#F5B800", label: "Educación"    },
  Otro:          { icon: ICON.money,  color: "#55556A", label: "Otro"         },
};

// Categorías bloqueadas por freno de emergencia
const BLOCKED_CATS = ["Ocio"];

// Tipos de deuda
const TYPES = [
  { id: "tarjeta",  icon: ICON.debt,   label: "Tarjeta",   color: "#FF4D6D" },
  { id: "prestamo", icon: ICON.money,  label: "Préstamo",  color: "#F5B800" },
  { id: "hipoteca", icon: ICON.house,  label: "Hipoteca",  color: "#38BDF8" },
  { id: "auto",     icon: ICON.fuel,   label: "Auto",      color: "#10B981" },
  { id: "personal", icon: ICON.save,   label: "Personal",  color: "#A78BFA" },
  { id: "otro",     icon: ICON.money,  label: "Otro",      color: "#FB923C" },
];

// ─────────────────────────────────────────────
// STORAGE — cifrado XOR + persistencia freno
// ─────────────────────────────────────────────
const STORE_KEY   = "mifinanzas_v7";
const FRENO_KEY   = "mifinanzas_freno_v1";
const FRENO_HOURS = 48;
const XOR_SECRET  = "MiFinanzasDR#2025";

function xorCipher(str) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ XOR_SECRET.charCodeAt(i % XOR_SECRET.length));
  }
  return out;
}
function encode(str) {
  try { return btoa(unescape(encodeURIComponent(xorCipher(str)))); }
  catch { return str; }
}
function decode(str) {
  try { return xorCipher(decodeURIComponent(escape(atob(str)))); }
  catch { return str; }
}

function loadApp() {
  return AsyncStorage.getItem(STORE_KEY).then(raw => {
    if (!raw) return null;
    try { return JSON.parse(decode(raw)); }
    catch { try { return JSON.parse(raw); } catch { return null; } }
  }).catch(() => null);
}
function saveApp(state) {
  return AsyncStorage.setItem(STORE_KEY, encode(JSON.stringify(state))).catch(() => {});
}

// Freno de emergencia — persiste 48h reales
async function loadFreno() {
  try {
    const raw = await AsyncStorage.getItem(FRENO_KEY);
    if (!raw) return { active: false, hoursLeft: 0 };
    const data = JSON.parse(raw);
    const elapsedH = (Date.now() - data.activatedAt) / 3600000;
    if (elapsedH >= FRENO_HOURS) {
      await AsyncStorage.removeItem(FRENO_KEY);
      return { active: false, hoursLeft: 0 };
    }
    return { active: true, hoursLeft: Math.ceil(FRENO_HOURS - elapsedH), activatedAt: data.activatedAt };
  } catch { return { active: false, hoursLeft: 0 }; }
}
async function activateFreno() {
  await AsyncStorage.setItem(FRENO_KEY, JSON.stringify({ activatedAt: Date.now() }));
}
async function deactivateFreno() {
  await AsyncStorage.removeItem(FRENO_KEY);
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────
const TODAY        = new Date();
const DAY          = TODAY.getDate();
const DAYS_IN_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
const DEF_BUDGETS  = { Alimentacion: 8000, Transporte: 4000, Ocio: 3000, Suscripciones: 1500 };

function money(n, cur) {
  return (cur || "RD$") + Math.abs(Math.round(n)).toLocaleString();
}

function nlp(text) {
  const low = text.toLowerCase();
  const m   = text.match(/[\d,]+(\.\d+)?/);
  const amount = m ? parseFloat(m[0].replace(",", "")) : null;
  let cat = "Otro";
  if (/gasolina|uber|combustible|transport/.test(low))        cat = "Transporte";
  else if (/comida|supermercado|nacional|bravo|restaurante|almuerzo|cena/.test(low)) cat = "Alimentacion";
  else if (/netflix|spotify|suscripci|disney|amazon/.test(low)) cat = "Suscripciones";
  else if (/farmacia|medic|doctor|salud|pastilla/.test(low))  cat = "Salud";
  else if (/ocio|fiesta|cine|bar|juego/.test(low))            cat = "Ocio";
  else if (/casa|hogar|alquiler|luz|agua/.test(low))          cat = "Hogar";
  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const date = /ayer/.test(low) ? yesterday : today;
  const dm   = text.match(/en\s+(.+?)(\s+hoy|\s+ayer|$)/i);
  const raw  = dm ? dm[1].trim() : cat;
  return { amount, cat, date, desc: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

function score(expenses, income, budgets) {
  const exp  = expenses.reduce((a, e) => a + e.amount, 0);
  const save = income > 0 ? ((income - exp) / income) * 100 : 0;
  const ct   = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const cats = Object.entries(budgets);
  const over = cats.filter(([k, l]) => (ct[k] || 0) > l).length;
  const s = {
    ahorro:       Math.min(100, Math.max(0, save * 2.5)),
    presupuesto:  cats.length ? Math.max(0, 100 - (over / cats.length) * 100) : 80,
    consistencia: Math.min(100, (expenses.length / 15) * 100),
    deuda:        85,
  };
  const total = Math.round(s.ahorro * .4 + s.presupuesto * .3 + s.consistencia * .2 + s.deuda * .1);
  const grade = total >= 85 ? { label: "Excelente", color: "#10B981", icon: ICON.trophy }
              : total >= 70 ? { label: "Bueno",     color: "#00E5B0", icon: ICON.star  }
              : total >= 50 ? { label: "Regular",   color: "#F5B800", icon: ICON.warn  }
              :               { label: "Crítico",   color: "#FF4D6D", icon: ICON.alert };
  return { total, s, grade };
}

function payoffMonths(balance, rate, payment) {
  const r = rate / 100 / 12;
  if (payment <= r * balance) return Infinity;
  if (r === 0) return Math.ceil(balance / payment);
  return Math.ceil(Math.log(payment / (payment - r * balance)) / Math.log(1 + r));
}

function calcStreak(streakDays) {
  if (!streakDays || streakDays.length === 0) return 0;
  const sorted = Array.from(new Set(streakDays)).sort().reverse();
  let streak = 0, check = new Date();
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

function calcRunway(balance, expenses) {
  if (expenses.length === 0) return null;
  const dailyBurn = expenses.reduce((a, e) => a + e.amount, 0) / Math.max(DAY, 1);
  if (dailyBurn <= 0) return null;
  return Math.floor(balance / dailyBurn);
}

function lifeHours(amount, monthlyIncome) {
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  return Math.round(amount / (monthlyIncome / (22 * 8)));
}

function semaphore(balance, totalInc, sc) {
  if (sc < 40 || (totalInc > 0 && balance <= totalInc * 0.25))
    return { color: "#F44336", label: "Alerta",     level: "red",    dark: "#0C0002" };
  if (totalInc > 0 && balance <= totalInc * 0.5)
    return { color: "#FFC107", label: "Precaución", level: "yellow", dark: "#0C0900" };
  return   { color: "#4CAF50", label: "Disponible", level: "green",  dark: "#001208" };
}

function lastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

function streakMessage(streak, registeredToday) {
  if (!registeredToday && streak === 0)
    return { msg: "Inicia tu racha hoy", sub: "Registra un movimiento para comenzar", color: "#55556A" };
  if (!registeredToday && streak > 0)
    return { msg: `No pierdas tu racha de ${streak} días`, sub: "Registra antes de medianoche", color: "#F44336" };
  if (streak >= 30) return { msg: `${streak} días consecutivos`, sub: "Disciplina de élite", color: "#F5B800" };
  if (streak >= 14) return { msg: `${streak} días activos`,     sub: "Dos semanas. Esto ya es hábito", color: "#FB923C" };
  if (streak >= 7)  return { msg: `${streak} días seguidos`,    sub: "Una semana completa", color: "#00E5B0" };
  if (streak >= 3)  return { msg: `${streak} días de racha`,    sub: "Vas bien, no lo rompas", color: "#00E5B0" };
  return { msg: "Racha iniciada", sub: "Continúa mañana", color: "#00E5B0" };
}

function weeklyBreakdown(expenses) {
  const weeks = [0, 0, 0, 0, 0];
  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth() !== TODAY.getMonth()) return;
    weeks[Math.min(Math.floor((d.getDate() - 1) / 7), 4)] += e.amount;
  });
  return weeks.slice(0, Math.ceil(DAYS_IN_MONTH / 7));
}

// ─────────────────────────────────────────────
// COMPONENTES BASE
// ─────────────────────────────────────────────
function Card({ children, style, accent, accentColor, glow, danger }) {
  const acCol    = accentColor || C.mint;
  const borderCol = danger ? C.rose + "60" : accent ? acCol + "50" : C.border;
  const bg        = danger ? C.roseBg : accent ? C.mintBg : C.card;
  return (
    <View style={[styles.card, { borderColor: borderCol, backgroundColor: bg }, style]}>
      {accent && <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
        backgroundColor: acCol, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />}
      {children}
    </View>
  );
}

function Btn({ label, onPress, primary, ghost, danger, disabled, style, small }) {
  const bg = disabled ? C.t4 : danger ? C.rose : primary !== false && !ghost ? C.mint : "transparent";
  const tc = disabled ? C.t3 : ghost ? C.t2 : danger ? "#fff" : "#000";
  return (
    <TouchableOpacity onPress={disabled ? null : onPress} activeOpacity={0.75}
      style={[styles.btn, { backgroundColor: bg, borderWidth: ghost ? 1 : 0, borderColor: C.border2 },
        small && { padding: 10 }, style]}>
      <Text style={[styles.btnText, { color: tc }, small && { fontSize: 13 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Input({ value, onChange, placeholder, numeric, style, multiline, editable = true }) {
  return (
    <TextInput style={[styles.input, !editable && { opacity: 0.4, backgroundColor: C.card3 }, style]}
      value={value} onChangeText={onChange} placeholder={placeholder}
      placeholderTextColor={C.t3} keyboardType={numeric ? "numeric" : "default"}
      multiline={multiline} editable={editable} />
  );
}

function Bar({ pct, color, h, showGlow }) {
  const p  = Math.min(Math.max(pct || 0, 0), 100);
  const bc = pct > 100 ? C.rose : pct > 85 ? C.gold : (color || C.mint);
  return (
    <View style={{ height: h || 5, borderRadius: 99, backgroundColor: C.border, overflow: "hidden" }}>
      <View style={{ height: "100%", width: p + "%", borderRadius: 99, backgroundColor: bc }} />
    </View>
  );
}

function Tag({ label, color, size }) {
  return (
    <View style={{ backgroundColor: color + "22", borderRadius: 7, borderWidth: 1,
      borderColor: color + "35", paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: size === "sm" ? 10 : 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: 12 }} />;
}

function CatIcon({ cat, size = 44 }) {
  const info = CATS[cat] || CATS["Otro"];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3,
      backgroundColor: info.color + "20", borderWidth: 1, borderColor: info.color + "30",
      alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.4, color: info.color, fontWeight: "900" }}>{info.icon}</Text>
    </View>
  );
}

function FadeIn({ children, delay = 0, style }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 340, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 340, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

// Toggle switch profesional
function Toggle({ value, onToggle, color, disabled }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [value]);
  const bg  = anim.interpolate({ inputRange: [0, 1], outputRange: [C.border2, color || C.mint] });
  const pos = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 21] });
  return (
    <TouchableOpacity onPress={disabled ? null : onToggle} activeOpacity={0.8}>
      <Animated.View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: bg,
        justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
        <Animated.View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff",
          position: "absolute", left: pos,
          shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2 }} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// LOADING
// ─────────────────────────────────────────────
function Loading() {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: DARK_THEME.bg, alignItems: "center", justifyContent: "center" }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_THEME.bg} />
      <Animated.View style={{ opacity: pulse, alignItems: "center" }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: DARK_THEME.mintBg2,
          borderWidth: 2, borderColor: DARK_THEME.mint + "40", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <Text style={{ fontSize: 32, color: DARK_THEME.mint, fontWeight: "900" }}>{ICON.chart}</Text>
        </View>
        <Text style={{ fontSize: 26, fontWeight: "900", color: DARK_THEME.t1, letterSpacing: -1 }}>
          Mi<Text style={{ color: DARK_THEME.mint }}>Finanzas</Text>
        </Text>
        <Text style={{ fontSize: 11, color: DARK_THEME.t3, marginTop: 8, letterSpacing: 2 }}>CARGANDO</Text>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = ["bienvenida", "perfil", "ingresos", "presupuesto", "metas", "fin"];

  const [userData,  setUserData]  = useState({ name: "", currency: "RD$", savingGoalPct: 20, darkMode: true });
  const [income,    setIncome]    = useState([]);
  const [gSource,   setGSource]   = useState("");
  const [gAmount,   setGAmount]   = useState("");
  const [gType,     setGType]     = useState("fijo");
  const [budgets,   setBudgets]   = useState({ ...DEF_BUDGETS });
  const [goals,     setGoals]     = useState([]);
  const [gName,     setGName]     = useState("");
  const [gEmoji,    setGEmoji]    = useState("◎");
  const [gTarget,   setGTarget]   = useState("");
  const [gWeeks,    setGWeeks]    = useState("12");

  const slideAnim = useRef(new Animated.Value(0)).current;
  const goNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -30, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start();
    setStep(s => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const dots = steps.map((_, i) => (
    <View key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3,
      backgroundColor: i === step ? C.mint : C.border2, marginHorizontal: 3 }} />
  ));

  const submit = () => {
    const next = {
      onboarded: true,
      user: { ...userData, darkMode: true },
      expenses: [], goals, debts: [], income, reminders: [], budgets, streakDays: [],
    };
    saveApp(next).then(() => onDone(next)).catch(() => onDone(next));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ flexDirection: "row", justifyContent: "center", paddingTop: 20, paddingBottom: 30 }}>
          {dots}
        </View>
        <Animated.View style={{ flex: 1, paddingHorizontal: 24, transform: [{ translateX: slideAnim }] }}>

          {step === 0 && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: C.mintBg2, borderWidth: 2,
                borderColor: C.mint + "40", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <Text style={{ fontSize: 36, color: C.mint, fontWeight: "900" }}>{ICON.chart}</Text>
              </View>
              <Text style={[styles.obH, { textAlign: "center", fontSize: 32 }]}>
                Mi<Text style={{ color: C.mint }}>Finanzas</Text>
              </Text>
              <Text style={[styles.obSub, { textAlign: "center", fontSize: 15, lineHeight: 24 }]}>
                Tu asistente financiero personal.{"\n"}Inteligente. Privado. Dominicano.
              </Text>
              <Btn label="Comenzar" onPress={goNext} style={{ marginTop: 32, width: "80%" }} />
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.obH}>Tu perfil</Text>
              <Text style={styles.obSub}>Cómo te llamas?</Text>
              <Text style={styles.lbl}>NOMBRE</Text>
              <Input value={userData.name} onChange={v => setUserData({ ...userData, name: v })} placeholder="ej: Erickson" />
              <Text style={[styles.lbl, { marginTop: 12 }]}>MONEDA</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[["RD$", "Peso DR"], ["$", "USD"], ["€", "EUR"]].map(([c, l]) => (
                  <TouchableOpacity key={c} onPress={() => setUserData({ ...userData, currency: c })}
                    style={{ flex: 1, padding: 12, borderRadius: 13, borderWidth: 1.5, alignItems: "center",
                      borderColor: userData.currency === c ? C.mint : C.border,
                      backgroundColor: userData.currency === c ? C.mintBg : C.card2 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: userData.currency === c ? C.mint : C.t2 }}>{c}</Text>
                    <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.lbl, { marginTop: 14 }]}>META DE AHORRO MENSUAL (%)</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {["10", "20", "30", "40", "50"].map(p => (
                  <TouchableOpacity key={p} onPress={() => setUserData({ ...userData, savingGoalPct: +p })}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                      borderColor: userData.savingGoalPct === +p ? C.mint : C.border,
                      backgroundColor: userData.savingGoalPct === +p ? C.mintBg : C.card2 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: userData.savingGoalPct === +p ? C.mint : C.t3 }}>{p}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.obH}>Tus ingresos</Text>
              <Text style={styles.obSub}>Agrega tus fuentes de ingreso mensual</Text>
              {income.map((inc, i) => (
                <View key={inc.id} style={{ flexDirection: "row", alignItems: "center", gap: 10,
                  backgroundColor: C.card2, borderRadius: 14, borderWidth: 1, borderColor: C.border2, padding: 12, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18, color: C.mint, fontWeight: "900" }}>{ICON.income}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{inc.source}</Text>
                    <Text style={{ fontSize: 11, color: C.mint }}>{money(inc.amount, userData.currency)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIncome(income.filter((_, j) => j !== i))}>
                    <Text style={{ color: C.t4, fontSize: 20 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Input value={gSource} onChange={setGSource} placeholder="Fuente (ej: Salario, Freelance)" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 2 }}>
                  <Input value={gAmount} onChange={setGAmount} placeholder="Monto" numeric />
                </View>
                {[["fijo", "Fijo"], ["variable", "Variable"]].map(([t, l]) => (
                  <TouchableOpacity key={t} onPress={() => setGType(t)}
                    style={{ flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 13, borderWidth: 1.5,
                      borderColor: gType === t ? C.mint : C.border, backgroundColor: gType === t ? C.mintBg : C.card2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: gType === t ? C.mint : C.t3 }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Btn label="Agregar ingreso" onPress={() => {
                if (!gSource || !gAmount) return;
                setIncome([...income, { id: Date.now(), source: gSource, amount: +gAmount, type: gType, date: TODAY.toISOString().split("T")[0] }]);
                setGSource(""); setGAmount("");
              }} ghost style={{ marginTop: 4 }} />
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.obH}>Presupuesto</Text>
              <Text style={styles.obSub}>Límites mensuales por categoría</Text>
              {Object.entries(budgets).map(([cat, val]) => {
                const info = CATS[cat] || CATS["Otro"];
                return (
                  <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <CatIcon cat={cat} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: C.t2, marginBottom: 4 }}>{cat}</Text>
                      <Input value={String(val)} onChange={v => setBudgets({ ...budgets, [cat]: +v || 0 })}
                        placeholder="0 = sin límite" numeric style={{ marginBottom: 0 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.obH}>Primera meta</Text>
              <Text style={styles.obSub}>Qué quieres lograr? (opcional)</Text>
              <Text style={styles.lbl}>QUÉ QUIERES LOGRAR?</Text>
              <Input value={gName} onChange={setGName} placeholder="ej: Laptop, Viaje, Fondo de emergencia..." />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbl}>SÍMBOLO</Text>
                  <Input value={gEmoji} onChange={setGEmoji} style={{ textAlign: "center", fontSize: 20 }} />
                </View>
                <View style={{ flex: 2.5 }}>
                  <Text style={styles.lbl}>CUÁNTO CUESTA ({userData.currency})</Text>
                  <Input value={gTarget} onChange={setGTarget} placeholder="ej: 50000" numeric />
                </View>
              </View>
              <Text style={styles.lbl}>PLAZO</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 año"]].map(([w, l]) => (
                  <TouchableOpacity key={w} onPress={() => setGWeeks(w)}
                    style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, alignItems: "center",
                      borderColor: gWeeks === w ? C.mint : C.border,
                      backgroundColor: gWeeks === w ? C.mintBg : C.card2 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: gWeeks === w ? C.mint : C.t3 }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {gName && gTarget && (
                <Btn label="Agregar meta" onPress={() => {
                  setGoals([...goals, { id: Date.now(), name: gName, emoji: gEmoji, target: +gTarget, saved: 0, weeks: +gWeeks }]);
                  setGName(""); setGTarget("");
                }} ghost style={{ marginTop: 12 }} />
              )}
              {goals.map(g => (
                <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 10,
                  backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.border2, padding: 12, marginTop: 8 }}>
                  <Text style={{ fontSize: 18, color: C.mint }}>{g.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{g.name}</Text>
                    <Text style={{ fontSize: 11, color: C.t3 }}>{money(g.target, userData.currency)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setGoals(goals.filter(x => x.id !== g.id))}>
                    <Text style={{ color: C.t4, fontSize: 20 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {step === 5 && (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: C.mintBg2, borderWidth: 2,
                borderColor: C.mint + "40", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <Text style={{ fontSize: 36, color: C.mint, fontWeight: "900" }}>{ICON.check}</Text>
              </View>
              <Text style={[styles.obH, { textAlign: "center" }]}>Listo, {userData.name || "bienvenido"}!</Text>
              <Text style={[styles.obSub, { textAlign: "center" }]}>Tu ecosistema financiero está configurado.</Text>
              <Btn label="Empezar" onPress={submit} style={{ marginTop: 24, width: "80%" }} />
            </View>
          )}
        </Animated.View>

        {step > 0 && step < steps.length - 1 && (
          <View style={{ flexDirection: "row", gap: 12, padding: 20 }}>
            <Btn label="Atrás" onPress={goBack} ghost style={{ flex: 1 }} />
            <Btn label={step === steps.length - 2 ? "Finalizar" : "Siguiente"} onPress={step === steps.length - 2 ? submit : goNext} style={{ flex: 2 }} />
          </View>
        )}
        {step === 0 && <View style={{ height: 20 }} />}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────
// STREAK BANNER
// ─────────────────────────────────────────────
function StreakBanner({ streakDays = [] }) {
  const today    = new Date().toISOString().split("T")[0];
  const streak   = calcStreak(streakDays);
  const regToday = streakDays.includes(today);
  const { msg, sub, color } = streakMessage(streak, regToday);
  const last7    = lastNDays(7);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 20, borderWidth: 1,
      borderColor: color + "45", backgroundColor: color + "0C",
      shadowColor: color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 10, gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color + "22",
          borderWidth: 1.5, borderColor: color + "40", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 20, color, fontWeight: "900" }}>{ICON.fire}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color, letterSpacing: -0.2 }}>{msg}</Text>
          <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{sub}</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 26, fontWeight: "900", color, letterSpacing: -1 }}>{streak}</Text>
          <Text style={{ fontSize: 8, color: C.t3, letterSpacing: 1.5, fontWeight: "700" }}>DÍAS</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: color + "20", marginHorizontal: 14 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 }}>
        {last7.map(day => {
          const done    = streakDays.includes(day);
          const isToday = day === today;
          const num     = new Date(day + "T12:00:00").getDate();
          const lbl     = new Date(day + "T12:00:00").toLocaleDateString("es", { weekday: "narrow" }).toUpperCase();
          return (
            <View key={day} style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 8, color: isToday ? color : C.t3, fontWeight: isToday ? "800" : "400" }}>{lbl}</Text>
              <View style={{ width: 30, height: 30, borderRadius: 9,
                backgroundColor: done ? color : isToday ? color + "18" : C.card2,
                borderWidth: isToday && !done ? 1.5 : 1, borderColor: isToday ? color + "60" : C.border,
                alignItems: "center", justifyContent: "center" }}>
                {done
                  ? <Text style={{ fontSize: 12, color: "#000", fontWeight: "900" }}>{ICON.check}</Text>
                  : <Text style={{ fontSize: 11, fontWeight: "700", color: isToday ? color : C.t4 }}>{num}</Text>}
              </View>
              {isToday && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// FAB MODAL — 3 opciones
// ─────────────────────────────────────────────
function FABModal({ visible, onClose, onSaveExpense, onSaveIncome, onSaveAbono, state, frenoActive }) {
  const cur     = state?.user?.currency || "RD$";
  const goals   = state?.goals || [];
  const debts   = state?.debts || [];

  const [mode,       setMode]       = useState(null);
  const [desc,       setDesc]       = useState("");
  const [amount,     setAmount]     = useState("");
  const [cat,        setCat]        = useState("Otro");
  const [showRound,  setShowRound]  = useState(false);
  const [roundGoal,  setRoundGoal]  = useState(goals[0]?.id || null);
  const [incSource,  setIncSource]  = useState("");
  const [debtId,     setDebtId]     = useState(debts[0]?.id || null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setMode(null); setDesc(""); setAmount(""); setCat("Otro"); setShowRound(false);
      Animated.spring(slideAnim, { toValue: 0, tension: 62, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const suggestRound = (() => {
    const n = +amount;
    if (!n || n <= 0) return null;
    const next = Math.ceil(n / 100) * 100;
    return next > n ? next - n : null;
  })();

  const saveGasto = () => {
    if (!amount || isNaN(+amount)) return;
    const today = new Date().toISOString().split("T")[0];
    onSaveExpense({ id: Date.now(), desc: desc.trim() || cat, amount: +amount, cat, date: today });
    if (showRound && suggestRound && roundGoal) {
      onSaveAbono && onSaveAbono(roundGoal, suggestRound, "meta");
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" }} onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }} onStartShouldSetResponder={() => true}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            borderWidth: 1, borderColor: C.border2, paddingBottom: 36 }}>
            <View style={{ width: 38, height: 4, borderRadius: 99, backgroundColor: C.border2, alignSelf: "center", marginTop: 14, marginBottom: 18 }} />

            {!mode && (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 17, fontWeight: "900", color: C.t1, marginBottom: 18, letterSpacing: -0.3 }}>
                  Registrar movimiento
                </Text>
                {[
                  ["gasto",   ICON.expense, "Registrar Gasto",   "Almuerzo, gasolina, compras...", C.rose  ],
                  ["ingreso", ICON.income,  "Registrar Ingreso", "Salario extra, freelance...",    C.mint  ],
                  ["abono",   ICON.debt,    "Abono a Deuda",     "Pago adelantado a tarjeta...",   C.violet],
                ].map(([m, ic, label, sub, col]) => (
                  <TouchableOpacity key={m} onPress={() => setMode(m)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: col + "12",
                      borderRadius: 16, borderWidth: 1, borderColor: col + "30", padding: 14, marginBottom: 10 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: col + "22",
                      alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 20, color: col, fontWeight: "900" }}>{ic}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: col }}>{label}</Text>
                      <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{sub}</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: C.t3 }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {mode === "gasto" && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setMode(null)}>
                    <Text style={{ fontSize: 22, color: C.t3 }}>{ICON.back}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: C.t1 }}>Registrar Gasto</Text>
                </View>

                {frenoActive && (
                  <View style={{ backgroundColor: C.roseBg2, borderRadius: 12, borderWidth: 1,
                    borderColor: C.rose + "50", padding: 12, marginBottom: 12, flexDirection: "row", gap: 8 }}>
                    <Text style={{ fontSize: 16, color: C.rose, fontWeight: "900" }}>{ICON.lock}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: C.rose }}>Freno activo</Text>
                      <Text style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>Ocio bloqueado por 48h</Text>
                    </View>
                  </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {Object.entries(CATS).map(([key, val]) => {
                      const blocked = frenoActive && BLOCKED_CATS.includes(key);
                      return (
                        <TouchableOpacity key={key} onPress={() => !blocked && setCat(key)}
                          style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, borderWidth: 1.5,
                            borderColor: blocked ? C.t4 : cat === key ? val.color : C.border,
                            backgroundColor: blocked ? C.t5 : cat === key ? val.color + "22" : C.card2,
                            opacity: blocked ? 0.45 : 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            {blocked && <Text style={{ fontSize: 10, color: C.t4, fontWeight: "900" }}>{ICON.lock}</Text>}
                            <Text style={{ fontSize: 11, fontWeight: "700", color: blocked ? C.t4 : cat === key ? val.color : C.t3 }}>
                              {val.icon} {key}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <Input value={desc} onChange={setDesc} placeholder="Descripción (ej: Almuerzo Mesón)" />
                <Input value={amount} onChange={setAmount} placeholder={`Monto (${cur})`} numeric />

                {suggestRound !== null && goals.length > 0 && (
                  <View style={{ backgroundColor: C.mintBg2, borderRadius: 12, borderWidth: 1,
                    borderColor: C.mint + "40", padding: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: C.mint }}>
                          {ICON.save} Redondeo automático
                        </Text>
                        <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                          Enviar {cur}{suggestRound} a meta de ahorro
                        </Text>
                      </View>
                      <Toggle value={showRound} onToggle={() => setShowRound(v => !v)} />
                    </View>
                  </View>
                )}

                <TouchableOpacity onPress={saveGasto}
                  style={{ backgroundColor: C.rose, borderRadius: 14, padding: 15, alignItems: "center",
                    shadowColor: C.rose, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>Registrar Gasto</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "ingreso" && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setMode(null)}>
                    <Text style={{ fontSize: 22, color: C.t3 }}>{ICON.back}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: C.t1 }}>Registrar Ingreso</Text>
                </View>
                <Input value={incSource} onChange={setIncSource} placeholder="Fuente (ej: Freelance, Bono)" />
                <Input value={amount} onChange={setAmount} placeholder={`Monto (${cur})`} numeric />
                <TouchableOpacity onPress={() => {
                  if (!amount || isNaN(+amount)) return;
                  onSaveIncome({ id: Date.now(), source: incSource.trim() || "Ingreso",
                    amount: +amount, date: new Date().toISOString().split("T")[0], type: "variable" });
                  onClose();
                }} style={{ backgroundColor: C.mint, borderRadius: 14, padding: 15, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#000" }}>Registrar Ingreso</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "abono" && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setMode(null)}>
                    <Text style={{ fontSize: 22, color: C.t3 }}>{ICON.back}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: C.t1 }}>Abono a Deuda</Text>
                </View>
                {debts.length === 0 ? (
                  <Text style={{ color: C.t3, textAlign: "center", paddingVertical: 20 }}>Sin deudas registradas.</Text>
                ) : (
                  <>
                    {debts.map(d => {
                      const t = TYPES.find(x => x.id === d.type) || TYPES[5];
                      return (
                        <TouchableOpacity key={d.id} onPress={() => setDebtId(d.id)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
                            borderRadius: 13, borderWidth: 1.5, marginBottom: 8,
                            borderColor: debtId === d.id ? (d.color || t.color) : C.border,
                            backgroundColor: debtId === d.id ? (d.color || t.color) + "18" : C.card2 }}>
                          <Text style={{ fontSize: 18, color: d.color || t.color, fontWeight: "900" }}>{t.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{d.name}</Text>
                            <Text style={{ fontSize: 10, color: C.t3 }}>Saldo: {money(d.balance, cur)}</Text>
                          </View>
                          {debtId === d.id && (
                            <Text style={{ color: d.color || t.color, fontSize: 16, fontWeight: "900" }}>{ICON.check}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    <Input value={amount} onChange={setAmount} placeholder={`Monto del abono (${cur})`} numeric />
                    <TouchableOpacity onPress={() => {
                      if (!amount || isNaN(+amount) || !debtId) return;
                      onSaveAbono && onSaveAbono(debtId, +amount, "deuda");
                      onClose();
                    }} style={{ backgroundColor: C.violet, borderRadius: 14, padding: 15, alignItems: "center" }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>Registrar Abono</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// HISTORIAL MODAL
// ─────────────────────────────────────────────
function HistorialModal({ visible, onClose, expenses, onDelete, cur }) {
  const [filterCat, setFilterCat] = useState("Todos");
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    else Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible) return null;
  const cats     = ["Todos", ...Object.keys(CATS)];
  const filtered = filterCat === "Todos" ? expenses : expenses.filter(e => e.cat === filterCat);
  const total    = filtered.reduce((a, e) => a + e.amount, 0);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000CC" }}>
        <Animated.View style={{ flex: 1, marginTop: 60, backgroundColor: C.bg,
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          borderWidth: 1, borderColor: C.border2, transform: [{ translateY: slideAnim }] }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            padding: 18, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "900", color: C.t1 }}>Historial</Text>
              <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{filtered.length} movimientos · {money(total, cur)}</Text>
            </View>
            <TouchableOpacity onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.t2, fontSize: 16, fontWeight: "700" }}>{ICON.close}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: 16, paddingVertical: 10, maxHeight: 50 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {cats.map(c => {
                const info   = CATS[c];
                const active = filterCat === c;
                const col    = info?.color || C.mint;
                return (
                  <TouchableOpacity key={c} onPress={() => setFilterCat(c)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5,
                      borderColor: active ? col : C.border, backgroundColor: active ? col + "22" : C.card2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: active ? col : C.t3 }}>
                      {info ? info.icon + " " : ""}{c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {filtered.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 32, color: C.t3, fontWeight: "900", marginBottom: 12 }}>{ICON.chart}</Text>
                <Text style={{ fontSize: 14, color: C.t3 }}>Sin registros en esta categoría</Text>
              </View>
            ) : (
              filtered.map((e, i) => {
                const info = CATS[e.cat] || CATS["Otro"];
                return (
                  <View key={e.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
                      <CatIcon cat={e.cat} size={42} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }} numberOfLines={1}>{e.desc}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: info.color }} />
                          <Text style={{ fontSize: 10, color: C.t3 }}>{e.cat} · {e.date}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: C.rose }}>-{money(e.amount, cur)}</Text>
                      <TouchableOpacity onPress={() => Alert.alert("Eliminar", `¿Eliminar "${e.desc}"?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Eliminar", style: "destructive", onPress: () => onDelete(e.id) },
                      ])} style={{ padding: 8 }}>
                        <Text style={{ color: C.t4, fontSize: 18 }}>{ICON.close}</Text>
                      </TouchableOpacity>
                    </View>
                    {i < filtered.length - 1 && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 54 }} />}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// INGRESOS MODAL
// ─────────────────────────────────────────────
function IngresosModal({ visible, onClose, income, onSave, cur }) {
  const [list,   setList]   = useState(income);
  const [adding, setAdding] = useState(false);
  const [form,   setForm]   = useState({ source: "", amount: "", type: "fijo" });
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => { setList(income); }, [income]);
  useEffect(() => {
    if (visible) Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    else Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible) return null;
  const total = list.reduce((a, i) => a + i.amount, 0);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000CC" }}>
        <Animated.View style={{ flex: 1, marginTop: 60, backgroundColor: C.bg,
          borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: C.border2,
          transform: [{ translateY: slideAnim }] }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            padding: 18, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "900", color: C.t1 }}>Ingresos</Text>
              <Text style={{ fontSize: 11, color: C.mint, marginTop: 2, fontWeight: "700" }}>
                Total: {money(total, cur)}/mes
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}
              style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.t2, fontSize: 16, fontWeight: "700" }}>{ICON.close}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {list.map(inc => (
              <View key={inc.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
                backgroundColor: C.card2, borderRadius: 14, borderWidth: 1, borderColor: C.border2, padding: 14 }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.mintBg2,
                  alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, color: C.mint, fontWeight: "900" }}>
                    {inc.type === "fijo" ? ICON.income : ICON.trend}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{inc.source}</Text>
                  <Tag label={inc.type === "fijo" ? "Fijo" : "Variable"} color={inc.type === "fijo" ? C.mint : C.gold} size="sm" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "800", color: C.mint }}>{money(inc.amount, cur)}</Text>
                <TouchableOpacity onPress={() => { const u = list.filter(x => x.id !== inc.id); setList(u); onSave(u); }}>
                  <Text style={{ color: C.t4, fontSize: 20 }}>{ICON.close}</Text>
                </TouchableOpacity>
              </View>
            ))}
            {adding ? (
              <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border2, padding: 16 }}>
                <Input value={form.source} onChange={v => setForm({ ...form, source: v })} placeholder="Nombre (ej: Salario, Freelance)" />
                <Input value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder={`Monto mensual (${cur})`} numeric />
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  {[["fijo", "Fijo"], ["variable", "Variable"]].map(([t, l]) => (
                    <TouchableOpacity key={t} onPress={() => setForm({ ...form, type: t })}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                        borderColor: form.type === t ? C.mint : C.border,
                        backgroundColor: form.type === t ? C.mintBg : C.card2 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: form.type === t ? C.mint : C.t3 }}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Btn label="Cancelar" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
                  <Btn label="Guardar" onPress={() => {
                    if (!form.source || !form.amount) return;
                    const updated = [...list, { id: Date.now(), source: form.source, amount: +form.amount,
                      date: new Date().toISOString().split("T")[0], type: form.type }];
                    setList(updated); onSave(updated);
                    setForm({ source: "", amount: "", type: "fijo" }); setAdding(false);
                  }} style={{ flex: 2 }} />
                </View>
              </View>
            ) : (
              <Btn label="+ Agregar ingreso" onPress={() => setAdding(true)} ghost />
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// SETTINGS MODAL
// ─────────────────────────────────────────────
function SettingsModal({ state, updateState, onClose, isDark, onToggleTheme, frenoState, onToggleFreno }) {
  const { user, income, budgets } = state;
  const cur      = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const [name,       setName]       = useState(user.name);
  const [salary,     setSalary]     = useState(totalInc > 0 ? String(totalInc) : "");
  const [savingGoal, setSavingGoal] = useState(String(user.savingGoalPct || 20));
  const [buds,       setBuds]       = useState({ ...budgets });

  function save() {
    const newInc = +salary > 0
      ? [{ id: 1, source: "Salario", amount: +salary, date: new Date().toISOString().split("T")[0], type: "fijo" }]
      : income;
    updateState({ user: { ...user, name: name.trim() || user.name, savingGoalPct: +savingGoal || 20 }, income: newInc, budgets: buds });
    onClose();
  }

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000000CC", justifyContent: "flex-end" }}>
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: C.border, maxHeight: "92%" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          padding: 18, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontSize: 17, fontWeight: "900", color: C.t1 }}>Configuración</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 20, color: C.t3, fontWeight: "700" }}>{ICON.close}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* TEMA */}
          <Text style={[styles.lbl, { marginBottom: 10 }]}>APARIENCIA</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {[[true, ICON.star, "Oscuro"], [false, ICON.chart, "Claro"]].map(([dark, ic, label]) => (
              <TouchableOpacity key={label} onPress={() => onToggleTheme(dark)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, alignItems: "center", gap: 6,
                  borderColor: isDark === dark ? C.mint : C.border,
                  backgroundColor: isDark === dark ? C.mintBg2 : C.card2 }}>
                <Text style={{ fontSize: 22, color: isDark === dark ? C.mint : C.t3, fontWeight: "900" }}>{ic}</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: isDark === dark ? C.mint : C.t3 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FRENO DE EMERGENCIA */}
          <Text style={[styles.lbl, { marginBottom: 10 }]}>FRENO DE EMERGENCIA</Text>
          <View style={{ backgroundColor: frenoState.active ? C.roseBg2 : C.card2, borderRadius: 16,
            borderWidth: 1, borderColor: frenoState.active ? C.rose + "50" : C.border2, padding: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: frenoState.active ? C.rose : C.t1 }}>
                  {ICON.lock} Bloqueo de 48 horas
                </Text>
                <Text style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 16 }}>
                  {frenoState.active
                    ? `Activo — ${frenoState.hoursLeft}h restantes. Ocio deshabilitado.`
                    : "Deshabilita Ocio por 48h cuando gastes de más."}
                </Text>
              </View>
              <Toggle value={frenoState.active} onToggle={onToggleFreno} color={C.rose} />
            </View>
            {frenoState.active && (
              <View style={{ backgroundColor: C.rose + "18", borderRadius: 10, padding: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: C.rose, fontWeight: "700" }}>
                  {ICON.alert} Categorías bloqueadas: {BLOCKED_CATS.join(", ")}
                </Text>
              </View>
            )}
          </View>

          {/* NOMBRE */}
          <Text style={[styles.lbl, { marginBottom: 6 }]}>NOMBRE</Text>
          <Input value={name} onChange={setName} placeholder="Tu nombre" />

          <Text style={[styles.lbl, { marginTop: 12, marginBottom: 6 }]}>INGRESO MENSUAL ({cur})</Text>
          <Input value={salary} onChange={setSalary} placeholder="ej: 45000" numeric />

          <Text style={[styles.lbl, { marginTop: 12, marginBottom: 6 }]}>META DE AHORRO (%)</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 18 }}>
            {["10","20","30","40","50"].map(p => (
              <TouchableOpacity key={p} onPress={() => setSavingGoal(p)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                  borderColor: savingGoal === p ? C.mint : C.border,
                  backgroundColor: savingGoal === p ? C.mintBg : C.card2 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: savingGoal === p ? C.mint : C.t3 }}>{p}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.lbl, { marginBottom: 10 }]}>LÍMITES DE PRESUPUESTO</Text>
          {Object.keys(CATS).slice(0, 6).map(cat => (
            <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <CatIcon cat={cat} size={34} />
              <View style={{ flex: 1 }}>
                <Input value={buds[cat] ? String(buds[cat]) : ""} onChange={v => setBuds({ ...buds, [cat]: +v || 0 })}
                  placeholder={`${cat} (0 = sin límite)`} numeric style={{ marginBottom: 0 }} />
              </View>
            </View>
          ))}

          <Btn label="Guardar cambios" onPress={save} style={{ marginTop: 12, marginBottom: 34 }} />
        </ScrollView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────
function HomeScreen({ state, openSettings, onAddExpense, onUpdateIncome, onDeleteExpense, isSurvival, frenoState }) {
  const { expenses, income, budgets, user, streakDays = [], goals = [] } = state;
  const cur      = user.currency;
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const balance  = totalInc - totalExp;
  const savePct  = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
  const { total: sc, grade } = score(expenses, totalInc, budgets);
  const sem      = semaphore(balance, totalInc, sc);
  const runway   = calcRunway(balance, expenses);
  const level    = Math.floor(sc / 20) + 1;

  const [incognito,    setIncognito]    = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showIngresos,  setShowIngresos]  = useState(false);

  // Pulso para alerta roja
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (sem.level === "red") {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [sem.level]);

  // Score circular mini
  const scoreColor = sc >= 70 ? "#4CAF50" : sc >= 40 ? "#FFC107" : "#F44336";
  const ScoreRing = () => (
    <Animated.View style={{ transform: [{ scale: sc < 40 ? pulseAnim : new Animated.Value(1) }] }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 3.5,
        borderColor: scoreColor, backgroundColor: scoreColor + "18",
        alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "900", color: scoreColor, letterSpacing: -0.5 }}>{sc}</Text>
      </View>
    </Animated.View>
  );

  // Ocultar monto — modo incógnito total
  const hidden = (val) => incognito ? "••••••" : val;

  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

          {/* HEADER */}
          <FadeIn delay={0}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
              paddingTop: 12, paddingBottom: 10, gap: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.card2,
                borderWidth: 1, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, color: C.t2, fontWeight: "900" }}>{ICON.profile}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 0.2 }}>
                  Nivel <Text style={{ color: C.gold, fontWeight: "700" }}>{level}</Text>
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "900", color: C.t1, letterSpacing: -0.4 }}>
                  {user.name || "Mi cuenta"}
                </Text>
              </View>
              {/* Score circular */}
              <View style={{ alignItems: "center", gap: 2 }}>
                <ScoreRing />
                <Text style={{ fontSize: 7, color: C.t3, letterSpacing: 1, fontWeight: "600" }}>SCORE</Text>
              </View>
              {/* Incógnito */}
              <TouchableOpacity onPress={() => setIncognito(v => !v)}
                style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: incognito ? C.mintBg2 : C.card2,
                  borderWidth: 1, borderColor: incognito ? C.mint + "50" : C.border2,
                  alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, color: incognito ? C.mint : C.t3, fontWeight: "900" }}>
                  {incognito ? ICON.eyeOff : ICON.eye}
                </Text>
              </TouchableOpacity>
              {/* Configuración */}
              <TouchableOpacity onPress={openSettings}
                style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.card2,
                  borderWidth: 1, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, color: C.t2, fontWeight: "700" }}>{ICON.settings}</Text>
              </TouchableOpacity>
            </View>
          </FadeIn>

          {/* BANNER SURVIVAL */}
          {isSurvival && (
            <FadeIn delay={40}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }], marginHorizontal: 16, marginBottom: 10,
                borderRadius: 14, backgroundColor: "#F4433618", borderWidth: 1.5, borderColor: "#F4433660",
                padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Text style={{ fontSize: 22, color: "#F44336", fontWeight: "900" }}>{ICON.alert}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#F44336", letterSpacing: 0.5 }}>
                    MODO SUPERVIVENCIA ACTIVO
                  </Text>
                  <Text style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>Score bajo de 40 pts. Revisa tus finanzas.</Text>
                </View>
              </Animated.View>
            </FadeIn>
          )}

          {/* HERO BALANCE */}
          <FadeIn delay={70}>
            <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 24, overflow: "hidden",
              borderWidth: 1.5, borderColor: sem.color + "55",
              shadowColor: sem.color, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 20 }}>
              <View style={{ backgroundColor: sem.dark, padding: 20, paddingBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 9, color: sem.color, letterSpacing: 3, fontWeight: "700" }}>
                    BALANCE DISPONIBLE
                  </Text>
                  <Animated.View style={{ transform: [{ scale: sem.level === "red" ? pulseAnim : new Animated.Value(1) }] }}>
                    <View style={{ backgroundColor: sem.color + "28", borderRadius: 9, borderWidth: 1,
                      borderColor: sem.color + "55", paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: sem.color }}>{sem.label}</Text>
                    </View>
                  </Animated.View>
                </View>
                <Text style={{ fontSize: 44, fontWeight: "900", color: sem.color, letterSpacing: -2, lineHeight: 50, marginBottom: 12 }}>
                  {hidden(money(balance, cur))}
                </Text>
                <Bar pct={Math.max(savePct, 0)} color={sem.color} h={5} />
              </View>
              <View style={{ backgroundColor: sem.color + "0E", flexDirection: "row",
                borderTopWidth: 1, borderTopColor: sem.color + "22" }}>
                {/* Tasa ahorro */}
                <View style={{ flex: 1, paddingVertical: 12, alignItems: "center",
                  borderRightWidth: 1, borderRightColor: sem.color + "18" }}>
                  <Text style={{ fontSize: 15, fontWeight: "900",
                    color: savePct >= 20 ? "#4CAF50" : savePct >= 0 ? "#FFC107" : "#F44336" }}>
                    {hidden(savePct + "%")}
                  </Text>
                  <Text style={{ fontSize: 9, color: C.t3, marginTop: 2, letterSpacing: 0.5 }}>Tasa Ahorro</Text>
                </View>
                {/* Runway con pulso */}
                <Animated.View style={{ flex: 1, transform: [{ scale: runway !== null && runway < 7 ? pulseAnim : new Animated.Value(1) }],
                  borderRightWidth: 1, borderRightColor: sem.color + "18" }}>
                  <View style={{ flex: 1, paddingVertical: 12, alignItems: "center",
                    borderWidth: runway !== null && runway < 7 ? 1.5 : 0,
                    borderColor: runway !== null && runway < 7 ? "#F44336" : "transparent",
                    borderRadius: 6, backgroundColor: runway !== null && runway < 7 ? "#F4433610" : "transparent" }}>
                    <Text style={{ fontSize: 15, fontWeight: "900",
                      color: !runway ? C.t3 : runway < 7 ? "#F44336" : runway < 15 ? "#FFC107" : "#4CAF50" }}>
                      {hidden(runway !== null ? runway + "d" : "—")}
                    </Text>
                    <Text style={{ fontSize: 9, color: runway !== null && runway < 7 ? "#F44336" : C.t3,
                      marginTop: 2, letterSpacing: 0.5, fontWeight: runway !== null && runway < 7 ? "700" : "400" }}>
                      {runway !== null && runway < 7 ? "URGENTE" : "Runway"}
                    </Text>
                  </View>
                </Animated.View>
                {/* Ingresos */}
                <TouchableOpacity onPress={() => setShowIngresos(true)}
                  style={{ flex: 1, paddingVertical: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: C.mint }}>
                    {hidden(money(totalInc, cur))}
                  </Text>
                  <Text style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>Ingresos</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>

          {/* FRENO ACTIVO BANNER */}
          {frenoState.active && (
            <FadeIn delay={90}>
              <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 14, backgroundColor: C.roseBg2,
                borderWidth: 1, borderColor: C.rose + "50", padding: 12, flexDirection: "row", gap: 10 }}>
                <Text style={{ fontSize: 18, color: C.rose, fontWeight: "900" }}>{ICON.lock}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: C.rose }}>Freno de emergencia activo</Text>
                  <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
                    Ocio bloqueado · {frenoState.hoursLeft}h restantes
                  </Text>
                </View>
              </View>
            </FadeIn>
          )}

          {/* STREAK BANNER */}
          <FadeIn delay={110}>
            <StreakBanner streakDays={streakDays} />
          </FadeIn>

          {/* GASTOS RECIENTES */}
          <FadeIn delay={150}>
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>Gastos Recientes</Text>
                {expenses.length > 0 && (
                  <TouchableOpacity onPress={() => setShowHistorial(true)}>
                    <Tag label={"Ver todos " + expenses.length} color={C.sky} />
                  </TouchableOpacity>
                )}
              </View>
              {expenses.length === 0 ? (
                <View style={{ paddingVertical: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 68, marginBottom: 16 }}>
                    {[32, 55, 20, 70, 42, 60, 35].map((h, i) => (
                      <View key={i} style={{ flex: 1, justifyContent: "flex-end", height: 68 }}>
                        <View style={{ width: "100%", height: h, borderRadius: 6,
                          backgroundColor: C.mint + "10", borderWidth: 1, borderColor: C.mint + "18" }} />
                      </View>
                    ))}
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: C.mint }}>Tu potencial de ahorro aquí</Text>
                    <Text style={{ fontSize: 11, color: C.t3, marginTop: 4, textAlign: "center", lineHeight: 17 }}>
                      Cada movimiento registrado construye{"\n"}tu historia financiera real.
                    </Text>
                  </View>
                </View>
              ) : (
                expenses.slice(0, 5).map((e, i) => {
                  const info = CATS[e.cat] || CATS["Otro"];
                  return (
                    <View key={e.id}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <CatIcon cat={e.cat} size={40} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }} numberOfLines={1}>{e.desc}</Text>
                          <Text style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{e.cat} · {e.date}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: sem.color }}>
                          {hidden("-" + money(e.amount, cur))}
                        </Text>
                      </View>
                      {i < Math.min(expenses.length, 5) - 1 && (
                        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 10, marginLeft: 52 }} />
                      )}
                    </View>
                  );
                })
              )}
            </Card>
          </FadeIn>

          {/* CATEGORÍAS */}
          {Object.keys(ct).length > 0 && (
            <FadeIn delay={190}>
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>Por Categoría</Text>
                  <Tag label={hidden(money(totalExp, cur))} color={sem.color} />
                </View>
                {Object.entries(ct).sort((a, b) => b[1] - a[1]).map(([cat, amt], idx, arr) => {
                  const info   = CATS[cat] || CATS["Otro"];
                  const budLim = budgets[cat];
                  const over   = budLim && amt > budLim;
                  const maxC   = Math.max(...Object.values(ct), 1);
                  return (
                    <View key={cat} style={{ marginBottom: idx < arr.length - 1 ? 12 : 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <CatIcon cat={cat} size={36} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                            <Text style={{ fontSize: 12, color: C.t2, fontWeight: "600" }}>{cat}</Text>
                            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                              {over && <Tag label="Excedido" color={C.rose} size="sm" />}
                              <Text style={{ fontSize: 12, fontWeight: "800", color: C.t1 }}>
                                {hidden(money(amt, cur))}
                              </Text>
                            </View>
                          </View>
                          <Bar pct={(amt / maxC) * 100} color={over ? C.rose : info.color} h={5} />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Card>
            </FadeIn>
          )}

        </ScrollView>
      </SafeAreaView>

      <HistorialModal visible={showHistorial} onClose={() => setShowHistorial(false)}
        expenses={expenses} onDelete={onDeleteExpense} cur={cur} />
      <IngresosModal visible={showIngresos} onClose={() => setShowIngresos(false)}
        income={income} onSave={onUpdateIncome} cur={cur} />
    </View>
  );
}

// ─────────────────────────────────────────────
// CHAT IA
// ─────────────────────────────────────────────
const API_KEY = "TU_API_KEY_AQUI"; // ← console.anthropic.com

function ChatScreen({ state, addExpense }) {
  const { user, income, debts, budgets, goals, expenses: allExp } = state;
  const cur      = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = allExp.reduce((a, e) => a + e.amount, 0);
  const balance  = totalInc - totalExp;

  const buildContext = () => {
    const ct  = {};
    allExp.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
    const runway  = calcRunway(balance, allExp);
    const savePct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
    const debtInt = debts.reduce((a, d) => a + (d.balance * d.rate / 100 / 12), 0);
    return `Eres TARS, asesor financiero de élite de ${user.name} en República Dominicana.
Moneda: ${cur}. Fecha: ${new Date().toLocaleDateString("es-DO", { weekday:"long", day:"numeric", month:"long" })}.
Balance: ${money(balance, cur)} | Ingresos: ${money(totalInc, cur)} | Gastos: ${money(totalExp, cur)} | Ahorro: ${savePct}%
Runway: ${runway ?? "N/A"} días | Intereses/mes: ${money(Math.round(debtInt), cur)}
Categorías: ${JSON.stringify(ct)}
Deudas: ${debts.map(d => `${d.name}: ${money(d.balance, cur)} al ${d.rate}%`).join(", ") || "ninguna"}
Metas: ${goals?.map(g => `${g.name}: ${Math.round((g.saved/g.target)*100)}%`).join(", ") || "ninguna"}
REGLAS: Responde en español dominicano coloquial. Máximo 3 párrafos cortos. Si gasto de lujo >RD$2000 en Ocio, menciona horas de trabajo. Si runway<30 días, advierte. Sé brutalmente honesto pero motivador.`;
  };

  const WELCOME = `Buenas, ${user.name}. Soy TARS, tu asesor financiero.\n\nBalance actual: ${money(balance, cur)}\nAhorro: ${totalInc > 0 ? Math.round((balance/totalInc)*100) : 0}%\n\nPuedo ayudarte con:\n• "Gasté 800 en gasolina"\n• "¿Cuánto llevo en comida?"\n• "Analiza mis finanzas"\n• "¿Cuántas horas vale esta compra de RD$3,500?"`;

  const [msgs,    setMsgs]    = useState([{ bot: true, text: WELCOME }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const scroll = useRef(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMsgs(m => [...m, { bot: false, text: msg }]);
    setLoading(true);
    const low    = msg.toLowerCase();
    const parsed = nlp(msg);
    const isEntry = /gast[eé]|pagu[eé]|compr[eé]|sali[oó]/.test(low);

    if (isEntry && parsed.amount) {
      const newE = { id: Date.now(), desc: parsed.desc, amount: parsed.amount, cat: parsed.cat, date: parsed.date };
      addExpense(newE);
      const hours    = lifeHours(parsed.amount, totalInc);
      const hoursMsg = hours && hours >= 2 ? `\n${ICON.run} Eso equivale a ${hours}h de trabajo.` : "";
      const budLim   = budgets[parsed.cat];
      const spent    = allExp.filter(e => e.cat === parsed.cat).reduce((a, e) => a + e.amount, 0) + parsed.amount;
      const budMsg   = budLim ? `\n${ICON.chart} ${parsed.cat}: ${money(spent, cur)} de ${money(budLim, cur)}` : "";
      setLoading(false);
      setMsgs(m => [...m, { bot: true, text: `Registrado.\n\n${parsed.desc}\n${money(parsed.amount, cur)} · ${parsed.cat} · ${parsed.date}${hoursMsg}${budMsg}` }]);
      return;
    }

    const catMatch = Object.keys(CATS).find(k => low.includes(k.toLowerCase()));
    if (/cuánto|cuanto|llevo|gast[eé] en|total/.test(low) && catMatch) {
      const spent = allExp.filter(e => e.cat === catMatch).reduce((a, e) => a + e.amount, 0);
      const bud   = budgets[catMatch];
      const pct   = bud ? Math.round((spent / bud) * 100) : null;
      setLoading(false);
      setMsgs(m => [...m, { bot: true, text: `${catMatch} este mes:\n\n${money(spent, cur)} gastados${bud ? ` de ${money(bud, cur)} (${pct}%)` : ""}\n\n${pct > 90 ? "Casi al límite." : pct > 70 ? "Vas bien pero vigila." : "Dentro del presupuesto."}` }]);
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
      setMsgs(m => [...m, { bot: true, text: data.content?.[0]?.text || "Sin respuesta." }]);
    } catch {
      const savePct = totalInc > 0 ? Math.round((balance/totalInc)*100) : 0;
      const runway  = calcRunway(balance, allExp);
      let fallback  = "TARS sin conexión.\n\n";
      if (/analiza|resumen|cómo estoy|como estoy/.test(low)) {
        fallback += `Balance: ${money(balance, cur)}\nAhorro: ${savePct}%${runway ? `\nRunway: ${runway} días` : ""}\n`;
        fallback += savePct >= 20 ? "\nVas excelente. Mantén ese ritmo." : "\nAhorro bajo. Revisa gastos de Ocio.";
      } else if (parsed.amount) {
        const hours = lifeHours(parsed.amount, totalInc);
        fallback += hours ? `${money(parsed.amount, cur)} = ${hours}h de trabajo.\n¿Vale ${hours} horas de tu vida?` : "Agrega tu API key para respuestas completas.";
      } else {
        fallback += "Agrega tu API key de console.anthropic.com para activar la IA.";
      }
      setMsgs(m => [...m, { bot: true, text: fallback }]);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View>
          <Text style={{ fontSize: 9, color: C.t3, letterSpacing: 2.5, fontWeight: "700" }}>ASISTENTE</Text>
          <Text style={{ fontSize: 19, fontWeight: "900", color: C.t1, letterSpacing: -0.4 }}>
            TARS <Text style={{ color: C.mint }}>IA</Text>
          </Text>
        </View>
        <View style={{ backgroundColor: C.mintBg2, borderRadius: 10, borderWidth: 1,
          borderColor: C.mint + "40", paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.mint }}>{money(balance, cur)}</Text>
          <Text style={{ fontSize: 9, color: C.t3, textAlign: "center" }}>disponible</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {msgs.map((m, i) => (
            <View key={i} style={{ marginBottom: 10, alignItems: m.bot ? "flex-start" : "flex-end" }}>
              {m.bot ? (
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: C.mintBg2,
                    borderWidth: 1, borderColor: C.mint + "40", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                    <Text style={{ fontSize: 12, color: C.mint, fontWeight: "900" }}>{ICON.ai}</Text>
                  </View>
                  <View style={{ maxWidth: "80%", padding: 12, borderRadius: 16, borderBottomLeftRadius: 4,
                    backgroundColor: C.card, borderWidth: 1, borderColor: C.border2 }}>
                    <Text style={{ fontSize: 13, color: C.t1, lineHeight: 21 }}>{m.text}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ maxWidth: "80%", padding: 12, borderRadius: 16, borderBottomRightRadius: 4, backgroundColor: C.mint }}>
                  <Text style={{ fontSize: 13, color: "#000", lineHeight: 21, fontWeight: "600" }}>{m.text}</Text>
                </View>
              )}
            </View>
          ))}
          {loading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: C.mintBg2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12, color: C.mint, fontWeight: "900" }}>{ICON.ai}</Text>
              </View>
              <View style={{ backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border2, padding: 12, flexDirection: "row", gap: 5 }}>
                {[0,1,2].map(j => <View key={j} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.mint, opacity: 0.5 }} />)}
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 14, paddingBottom: 6, maxHeight: 44 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["Analiza mis finanzas", "¿Cuánto llevo en comida?", "Consejo para ahorrar", "¿Cómo están mis deudas?"].map(s => (
              <TouchableOpacity key={s} onPress={() => setInput(s)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card2,
                  borderRadius: 10, borderWidth: 1, borderColor: C.border2 }}>
                <Text style={{ fontSize: 11, color: C.t2, fontWeight: "600" }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 10, padding: 14, paddingBottom: 20,
          backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Escribe un gasto o pregunta a TARS..."
            placeholderTextColor={C.t3} value={input} onChangeText={setInput}
            onSubmitEditing={send} returnKeyType="send" multiline maxHeight={90} />
          <TouchableOpacity onPress={send} disabled={loading}
            style={{ width: 46, height: 46, backgroundColor: loading ? C.t4 : C.mint, borderRadius: 13,
              alignItems: "center", justifyContent: "center",
              shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8 }}>
            <Text style={{ fontSize: 18, color: "#000", fontWeight: "900" }}>{ICON.income}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// DEUDAS SCREEN
// ─────────────────────────────────────────────
function DeudasScreen({ state, setDebts, embedded }) {
  const { user, debts = [], income } = state;
  const cur      = user.currency;
  const [adding, setAdding] = useState(false);
  const [extra,  setExtra]  = useState("");
  const [form,   setForm]   = useState({ name: "", type: "tarjeta", balance: "", rate: "", minPay: "", limit: "", color: C.rose });

  const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
  const totalInt  = debts.reduce((a, d) => a + (d.balance * d.rate / 100 / 12), 0);

  const content = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
      {!embedded && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Deudas</Text>
        </View>
      )}

      {/* Resumen */}
      {debts.length > 0 && (
        <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: "hidden",
          borderWidth: 1, borderColor: C.rose + "45" }}>
          <View style={{ backgroundColor: C.roseBg, padding: 16 }}>
            <Text style={{ fontSize: 9, color: C.rose, letterSpacing: 2.5, fontWeight: "700", marginBottom: 8 }}>
              RESUMEN DE DEUDAS
            </Text>
            <Text style={{ fontSize: 34, fontWeight: "900", color: C.rose, letterSpacing: -1 }}>
              {money(totalDebt, cur)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", backgroundColor: C.rose + "0E",
            borderTopWidth: 1, borderTopColor: C.rose + "22" }}>
            {[[money(Math.round(totalInt), cur), "Intereses/mes"], [debts.length + " deudas", "Activas"],
              [money(debts.reduce((a,d)=>a+d.minPay,0), cur), "Pago mín."]].map(([v, l], i) => (
              <View key={l} style={{ flex: 1, paddingVertical: 12, alignItems: "center",
                borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.rose + "18" }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: i === 0 ? C.rose : C.t1 }}>{v}</Text>
                <Text style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Pago extra */}
      {debts.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 12 }}>
            {ICON.save} Simulador de Pago Extra
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input value={extra} onChange={setExtra} placeholder={`Pago extra (${cur})`} numeric style={{ marginBottom: 0 }} />
            </View>
            <View style={{ flex: 1, backgroundColor: C.mintBg2, borderRadius: 12, alignItems: "center",
              justifyContent: "center", borderWidth: 1, borderColor: C.mint + "40" }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.mint, textAlign: "center" }}>
                Ahorro total estimado
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Lista de deudas */}
      {debts.map(d => {
        const t       = TYPES.find(x => x.id === d.type) || TYPES[5];
        const dc      = d.color || t.color;
        const pctPaid = d.limit > 0 ? Math.round(((d.limit - d.balance) / d.limit) * 100) : 0;
        const mo      = payoffMonths(d.balance, d.rate, d.minPay + Number(extra || 0));
        const tl      = mo === Infinity ? "Solo intereses" : mo > 24 ? (mo / 12).toFixed(1) + " años" : mo + " meses";
        return (
          <View key={d.id} style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: "hidden",
            borderWidth: 1, borderColor: dc + "45",
            shadowColor: dc, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 }}>
            <View style={{ backgroundColor: dc + "0C", padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: dc + "22",
                    borderWidth: 1.5, borderColor: dc + "40", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 20, color: dc, fontWeight: "900" }}>{t.icon}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>{d.name}</Text>
                    <Tag label={t.label} color={dc} size="sm" />
                  </View>
                </View>
                <TouchableOpacity onPress={() => setDebts(debts.filter(x => x.id !== d.id))}
                  style={{ padding: 6, borderRadius: 9, backgroundColor: C.roseBg }}>
                  <Text style={{ color: C.rose, fontSize: 14, fontWeight: "900" }}>{ICON.close}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", backgroundColor: C.bg + "80", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                {[["Saldo", money(d.balance, cur), C.rose], ["Tasa", d.rate + "% anual", C.gold],
                  ["Mín/mes", money(d.minPay, cur), C.t1]].map(([l, v, c], i) => (
                  <View key={l} style={{ flex: 1, paddingVertical: 10, alignItems: "center",
                    borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.border2 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: c }}>{v}</Text>
                    <Text style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{l}</Text>
                  </View>
                ))}
              </View>
              {d.limit > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                    <Text style={{ fontSize: 11, color: C.t3 }}>Progreso de pago</Text>
                    <Text style={{ fontSize: 11, color: dc, fontWeight: "700" }}>{pctPaid}% pagado</Text>
                  </View>
                  <Bar pct={pctPaid} color={dc} h={6} />
                </View>
              )}
              <View style={{ backgroundColor: dc + "14", borderRadius: 11, padding: 10, borderWidth: 1,
                borderColor: dc + "25", flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: C.t2 }}>
                  Libre en: <Text style={{ color: dc, fontWeight: "700" }}>{tl}</Text>
                </Text>
                {d.rate > 0 && (
                  <Text style={{ fontSize: 11, color: C.t3 }}>
                    <Text style={{ color: C.rose, fontWeight: "700" }}>{money(Math.round(d.balance * d.rate / 100), cur)}</Text>/año
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })}

      {/* Agregar deuda */}
      {adding ? (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nueva deuda</Text>
          <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Nombre (ej: Tarjeta BHD)" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {TYPES.map(t => (
              <TouchableOpacity key={t.id} onPress={() => setForm({ ...form, type: t.id, color: t.color })}
                style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
                  borderColor: form.type === t.id ? t.color : C.border,
                  backgroundColor: form.type === t.id ? t.color + "22" : C.card2 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: form.type === t.id ? t.color : C.t3 }}>
                  {t.icon} {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={styles.lbl}>SALDO ({cur})</Text>
              <Input value={form.balance} onChange={v => setForm({ ...form, balance: v })} placeholder="0" numeric />
            </View>
            <View style={{ flex: 1 }}><Text style={styles.lbl}>TASA (%)</Text>
              <Input value={form.rate} onChange={v => setForm({ ...form, rate: v })} placeholder="0" numeric />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={styles.lbl}>PAGO MÍN. ({cur})</Text>
              <Input value={form.minPay} onChange={v => setForm({ ...form, minPay: v })} placeholder="0" numeric />
            </View>
            <View style={{ flex: 1 }}><Text style={styles.lbl}>LÍMITE ({cur})</Text>
              <Input value={form.limit} onChange={v => setForm({ ...form, limit: v })} placeholder="0" numeric />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Btn label="Cancelar" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
            <Btn label="Guardar deuda" onPress={() => {
              if (!form.name || !form.balance) return;
              setDebts([...debts, { id: Date.now(), ...form, balance: +form.balance, rate: +form.rate, minPay: +form.minPay, limit: +form.limit }]);
              setAdding(false); setForm({ name: "", type: "tarjeta", balance: "", rate: "", minPay: "", limit: "", color: C.rose });
            }} style={{ flex: 2 }} />
          </View>
        </Card>
      ) : (
        <View style={{ marginHorizontal: 16 }}>
          <Btn label="+ Registrar deuda" onPress={() => setAdding(true)} ghost />
        </View>
      )}
    </ScrollView>
  );

  if (embedded) return <View style={{ flex: 1 }}>{content}</View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>{content}</SafeAreaView>;
}

// ─────────────────────────────────────────────
// METAS SCREEN
// ─────────────────────────────────────────────
function MetasScreen({ state, setGoals, embedded }) {
  const { user, goals = [], income } = state;
  const cur      = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const [adding,   setAdding]   = useState(false);
  const [selected, setSelected] = useState(0);
  const [form,     setForm]     = useState({ name: "", emoji: ICON.target, target: "", weeks: "12" });
  const goalColors = [C.sky, C.mint, C.violet, C.gold, C.orange, C.pink];
  const active     = goals.length > 0 ? goals[Math.min(selected, goals.length - 1)] : null;
  const activePct  = active ? Math.min((active.saved / active.target) * 100, 100) : 0;
  const activeColor = goalColors[selected % goalColors.length];

  function CircleProgress({ pct, size, color, children }) {
    const deg = Math.round((pct / 100) * 360);
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 10, borderColor: C.border2 }} />
        {deg > 0 && (
          <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 10,
            borderColor: "transparent",
            borderTopColor: color,
            borderRightColor: deg >= 90 ? color : "transparent",
            borderBottomColor: deg >= 180 ? color : "transparent",
            borderLeftColor: deg >= 270 ? color : "transparent",
            transform: [{ rotate: "-90deg" }] }} />
        )}
        <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
      </View>
    );
  }

  const content = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
      {!embedded && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Progreso de Ahorro</Text>
        </View>
      )}

      {goals.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 50, paddingHorizontal: 32 }}>
          <View style={{ width: 110, height: 110, borderRadius: 55, borderWidth: 10, borderColor: C.border2,
            alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <Text style={{ fontSize: 36, color: C.t3, fontWeight: "900" }}>{ICON.target}</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: "800", color: C.t1, textAlign: "center", marginBottom: 8 }}>Sin metas activas</Text>
          <Text style={{ fontSize: 12, color: C.t3, textAlign: "center", lineHeight: 19, marginBottom: 26 }}>
            Define tu primer objetivo y visualiza tu progreso cada día.
          </Text>
        </View>
      ) : (
        <>
          <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <CircleProgress pct={activePct} size={200} color={activeColor}>
              <Text style={{ fontSize: 28, color: activeColor, fontWeight: "900", marginBottom: 3 }}>{active.emoji}</Text>
              <Text style={{ fontSize: 38, fontWeight: "900", color: activeColor, letterSpacing: -2 }}>{Math.round(activePct)}%</Text>
              <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 0.5 }}>Progreso</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t2, marginTop: 3 }} numberOfLines={1}>{active.name}</Text>
            </CircleProgress>
            <View style={{ marginTop: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1 }}>{money(active.saved, cur)}</Text>
              <Text style={{ fontSize: 11, color: C.t3 }}>de {money(active.target, cur)}</Text>
            </View>
          </View>

          {goals.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {goals.map((g, i) => {
                  const pct = Math.min((g.saved / g.target) * 100, 100);
                  const col = goalColors[i % goalColors.length];
                  return (
                    <TouchableOpacity key={g.id} onPress={() => setSelected(i)}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13, borderWidth: 1.5,
                        borderColor: selected === i ? col : C.border,
                        backgroundColor: selected === i ? col + "20" : C.card2, alignItems: "center", minWidth: 86 }}>
                      <Text style={{ fontSize: 16, color: col, fontWeight: "900", marginBottom: 2 }}>{g.emoji}</Text>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: selected === i ? col : C.t3 }} numberOfLines={1}>{g.name}</Text>
                      <Text style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>{Math.round(pct)}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {goals.map((g, i) => {
            const pct    = Math.min((g.saved / g.target) * 100, 100);
            const col    = goalColors[i % goalColors.length];
            const weekly = ((g.target - g.saved) / Math.max(g.weeks, 1)).toFixed(0);
            return (
              <View key={g.id} style={{ marginHorizontal: 16, marginBottom: 10, borderRadius: 18,
                backgroundColor: C.card, borderWidth: 1, borderColor: selected === i ? col + "50" : C.border, padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: col + "20",
                    borderWidth: 1.5, borderColor: col + "40", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 20, color: col, fontWeight: "900" }}>{g.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>{g.name}</Text>
                    <Text style={{ fontSize: 11, color: C.t3, marginTop: 1 }}>{money(g.saved, cur)} de {money(g.target, cur)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Tag label={Math.round(pct) + "%"} color={col} />
                    <TouchableOpacity onPress={() => setGoals(goals.filter(x => x.id !== g.id))}>
                      <Text style={{ fontSize: 10, color: C.t4 }}>eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Bar pct={pct} color={col} h={6} showGlow />
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ fontSize: 10, color: C.t3 }}>Aparta {money(+weekly, cur)}/semana</Text>
                  <Text style={{ fontSize: 10, color: col, fontWeight: "700" }}>Faltan {money(g.target - g.saved, cur)}</Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {adding && (
        <Card style={{ marginHorizontal: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: C.t1, marginBottom: 14 }}>Nueva meta</Text>
          <Text style={styles.lbl}>QUÉ QUIERES LOGRAR</Text>
          <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="ej: Laptop, Viaje, Fondo..." />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lbl}>SÍMBOLO</Text>
              <Input value={form.emoji} onChange={v => setForm({ ...form, emoji: v })} style={{ textAlign: "center", fontSize: 18 }} />
            </View>
            <View style={{ flex: 2.5 }}>
              <Text style={styles.lbl}>COSTO ({cur})</Text>
              <Input value={form.target} onChange={v => setForm({ ...form, target: v })} placeholder="ej: 50000" numeric />
            </View>
          </View>
          <Text style={styles.lbl}>PLAZO</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 14 }}>
            {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 año"]].map(([w, l]) => (
              <TouchableOpacity key={w} onPress={() => setForm({ ...form, weeks: w })}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                  borderColor: form.weeks === w ? C.mint : C.border,
                  backgroundColor: form.weeks === w ? C.mintBg : C.card2 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: form.weeks === w ? C.mint : C.t3 }}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {form.name && form.target && (
            <View style={{ backgroundColor: C.mintBg2, borderRadius: 11, borderWidth: 1, borderColor: C.mint + "40", padding: 11, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: C.t2 }}>
                Aparta <Text style={{ color: C.mint, fontWeight: "700" }}>{cur}{Math.ceil(+form.target / +form.weeks).toLocaleString()}/semana</Text>
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Btn label="Atrás" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
            <Btn label="Guardar meta" onPress={() => {
              if (!form.name || !form.target) return;
              setGoals([...goals, { id: Date.now(), ...form, target: +form.target, saved: 0, weeks: +form.weeks }]);
              setAdding(false); setForm({ name: "", emoji: ICON.target, target: "", weeks: "12" });
            }} style={{ flex: 2 }} />
          </View>
        </Card>
      )}
    </ScrollView>
  );

  const fab = !adding && (
    <View style={{ position: "absolute", bottom: embedded ? 12 : 88, alignSelf: "center",
      shadowColor: C.mint, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 12 }}>
      <TouchableOpacity onPress={() => setAdding(true)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.mint,
          borderRadius: 18, paddingHorizontal: 22, paddingVertical: 13 }}>
        <Text style={{ fontSize: 18, color: "#000", fontWeight: "900" }}>+</Text>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#000" }}>Añadir meta</Text>
      </TouchableOpacity>
    </View>
  );

  if (embedded) return <View style={{ flex: 1 }}>{content}{fab}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {content}{fab}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// HERRAMIENTAS / PERFIL SCREEN
// ─────────────────────────────────────────────
function HerramientasScreen({ state, setReminders, embedded }) {
  const { user, expenses, income, budgets, reminders = [], streakDays = [], goals = [], debts = [] } = state;
  const cur      = user.currency;
  const [sub, setSub] = useState("score");
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const { total, s, grade } = score(expenses, totalInc, budgets);
  const savePct  = totalInc > 0 ? Math.round(((totalInc - totalExp) / totalInc) * 100) : 0;
  const dailyAvg = totalExp / Math.max(DAY, 1);
  const projected = totalExp + dailyAvg * (DAYS_IN_MONTH - DAY);
  const balEOM   = totalInc - projected;
  const runOut   = balEOM < 0 ? Math.round(DAY + (totalInc - totalExp) / Math.max(dailyAvg, 1)) : null;
  const pctSpent = Math.min((projected / Math.max(totalInc, 1)) * 100, 120);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ name: "", amount: "", day: "" });
  const today    = new Date().getDate();
  const totalRem = reminders.filter(r => r.active).reduce((a, r) => a + r.amount, 0);
  const upcoming = reminders.filter(r => r.active && r.day >= today).sort((a, b) => a.day - b.day);
  const past     = reminders.filter(r => r.active && r.day < today);
  const streak   = calcStreak(streakDays);
  const savingGoal = user.savingGoalPct || 20;
  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const overBudget     = Object.entries(budgets).some(([k, l]) => (ct[k] || 0) > l);
  const hasActiveGoal  = goals && goals.length > 0;
  const isSuperSaver   = savePct >= 30;
  const noNewDebts     = debts && debts.length === 0;
  const perfectMonth   = expenses.length >= 20 && !overBudget && savePct >= savingGoal;
  const weeklyExp      = weeklyBreakdown(expenses);
  const maxWeek        = Math.max(...weeklyExp, 1);
  const weekNames      = ["S1", "S2", "S3", "S4", "S5"];
  const bestWeekIdx    = weeklyExp.indexOf(Math.min(...weeklyExp.filter(w => w > 0)));
  const worstWeekIdx   = weeklyExp.indexOf(Math.max(...weeklyExp));
  const daysThisMonth  = (streakDays || []).filter(d => d.startsWith(TODAY.toISOString().slice(0, 7))).length;
  const consistency    = Math.round((daysThisMonth / DAY) * 100);
  const firstHalf      = expenses.filter(e => new Date(e.date).getDate() <= 15).reduce((a, e) => a + e.amount, 0);
  const secondHalf     = expenses.filter(e => new Date(e.date).getDate() > 15).reduce((a, e) => a + e.amount, 0);
  const trending       = secondHalf > firstHalf * 1.2 ? "up" : secondHalf < firstHalf * 0.8 ? "down" : "stable";
  const trendInfo      = trending === "up"
    ? { label: "Gasto acelerando",     color: C.rose,  icon: ICON.trendDown, desc: "Gastas más en la segunda quincena" }
    : trending === "down"
    ? { label: "Gasto desacelerando",  color: C.mint,  icon: ICON.trend,     desc: "Excelente control en segunda quincena" }
    : { label: "Gasto estable",        color: C.sky,   icon: ICON.stable,    desc: "Ritmo de gasto consistente" };
  const topCat = Object.entries(ct).sort((a, b) => b[1] - a[1])[0];

  const content = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card,
        borderRadius: 13, padding: 4, borderWidth: 1, borderColor: C.border }}>
        {[["score","Score"],["resumen","Resumen"],["predictor","Predictor"],["pagos","Pagos"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setSub(id)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10,
              backgroundColor: sub === id ? C.card2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: sub === id ? C.t1 : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── RESUMEN ── */}
      {sub === "resumen" && (
        <>
          <StreakBanner streakDays={streakDays} />
          <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: "hidden",
            borderWidth: 1, borderColor: C.violet + "40" }}>
            <View style={{ backgroundColor: C.violet + "0C", padding: 16 }}>
              <Text style={{ fontSize: 9, color: C.violet, letterSpacing: 2.5, fontWeight: "700", marginBottom: 12 }}>
                RESUMEN DEL MES
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[[daysThisMonth + "/" + DAY, "Días activos", C.mint],
                  [consistency + "%", "Consistencia", consistency >= 70 ? C.mint : consistency >= 40 ? C.gold : C.rose],
                  [streak + " d", "Racha actual", C.orange]].map(([v, l, c]) => (
                  <View key={l} style={{ flex: 1, backgroundColor: c + "12", borderRadius: 12, borderWidth: 1,
                    borderColor: c + "28", padding: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: c }}>{v}</Text>
                    <Text style={{ fontSize: 9, color: C.t3, marginTop: 3, textAlign: "center" }}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          {weeklyExp.some(w => w > 0) && (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>Gasto por semana</Text>
                <Tag label={money(totalExp, cur)} color={C.rose} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 90 }}>
                {weeklyExp.map((w, i) => {
                  const h      = maxWeek > 0 ? Math.max((w / maxWeek) * 72, w > 0 ? 8 : 0) : 0;
                  const isBest = i === bestWeekIdx && w > 0;
                  const isWorst= weeklyExp.filter(x => x > 0).length > 1 && i === worstWeekIdx;
                  const barCol = isBest ? C.mint : isWorst ? C.rose : C.sky;
                  return (
                    <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 90 }}>
                      {(isBest || isWorst) && (
                        <Text style={{ fontSize: 7, color: barCol, fontWeight: "700", marginBottom: 3 }}>
                          {isBest ? "MIN" : "MAX"}
                        </Text>
                      )}
                      <View style={{ width: "100%", height: h, borderRadius: 7, backgroundColor: barCol, opacity: w === 0 ? 0.15 : 1 }} />
                      <Text style={{ fontSize: 8, color: C.t3, marginTop: 4 }}>{weekNames[i]}</Text>
                      {w > 0 && <Text style={{ fontSize: 7, color: barCol, fontWeight: "700" }}>{money(w, cur)}</Text>}
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
          <Card style={{ marginBottom: 12, borderColor: trendInfo.color + "35" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: trendInfo.color + "18",
                borderWidth: 1, borderColor: trendInfo.color + "30", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 20, color: trendInfo.color, fontWeight: "900" }}>{trendInfo.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: trendInfo.color }}>{trendInfo.label}</Text>
                <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{trendInfo.desc}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 9, color: C.t3, marginBottom: 3 }}>1RA QUINCENA</Text>
                <Text style={{ fontSize: 13, fontWeight: "800", color: C.t1 }}>{money(firstHalf, cur)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 9, color: C.t3, marginBottom: 3 }}>2DA QUINCENA</Text>
                <Text style={{ fontSize: 13, fontWeight: "800", color: trending === "up" ? C.rose : trending === "down" ? C.mint : C.t1 }}>
                  {money(secondHalf, cur)}
                </Text>
              </View>
            </View>
          </Card>
          {topCat && (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 12 }}>Mayor gasto del mes</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <CatIcon cat={topCat[0]} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: C.t1 }}>{topCat[0]}</Text>
                  <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Mayor categoría este mes</Text>
                  <View style={{ marginTop: 8 }}>
                    <Bar pct={totalExp > 0 ? (topCat[1] / totalExp) * 100 : 0} color={CATS[topCat[0]]?.color || C.mint} h={5} />
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: CATS[topCat[0]]?.color || C.mint }}>
                    {money(topCat[1], cur)}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>
                    {totalExp > 0 ? Math.round((topCat[1] / totalExp) * 100) : 0}% del total
                  </Text>
                </View>
              </View>
            </Card>
          )}
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>Actividad del mes</Text>
              <Tag label={daysThisMonth + " días"} color={C.mint} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
              {Array.from({ length: DAYS_IN_MONTH }, (_, i) => {
                const dayNum = i + 1;
                const dayStr = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const done   = (streakDays || []).includes(dayStr);
                const isPast = dayNum <= DAY;
                const isT    = dayNum === DAY;
                return (
                  <View key={dayNum} style={{ width: 26, height: 26, borderRadius: 7,
                    backgroundColor: done ? C.mint : isT ? C.mintBg2 : isPast ? C.card3 : C.card2,
                    borderWidth: isT ? 1.5 : 0, borderColor: C.mint + "70",
                    alignItems: "center", justifyContent: "center" }}>
                    {done
                      ? <Text style={{ fontSize: 10, color: "#000", fontWeight: "900" }}>{ICON.check}</Text>
                      : <Text style={{ fontSize: 9, color: isPast ? C.t4 : C.t5, fontWeight: "600" }}>{dayNum}</Text>}
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}

      {/* ── SCORE ── */}
      {sub === "score" && (
        <>
          <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 22, overflow: "hidden",
            borderWidth: 1, borderColor: grade.color + "45" }}>
            <View style={{ backgroundColor: grade.color + "0C", padding: 26, alignItems: "center" }}>
              <Text style={{ fontSize: 22, color: grade.color, fontWeight: "900", marginBottom: 8 }}>{grade.icon}</Text>
              <Text style={{ fontSize: 68, fontWeight: "900", color: grade.color, letterSpacing: -3, lineHeight: 72 }}>{total}</Text>
              <Text style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>puntos de 100</Text>
              <View style={{ marginTop: 10 }}><Tag label={grade.label} color={grade.color} /></View>
              <Text style={{ fontSize: 10, color: C.t3, marginTop: 10 }}>Salud financiera este mes</Text>
            </View>
            <View style={{ flexDirection: "row", backgroundColor: grade.color + "10",
              borderTopWidth: 1, borderTopColor: grade.color + "22" }}>
              {[[streak + "d", "Racha", C.orange], [savePct + "%", "Ahorro", C.mint], [expenses.length + "", "Registros", C.sky]].map(([v, l, c], i) => (
                <View key={l} style={{ flex: 1, paddingVertical: 12, alignItems: "center",
                  borderRightWidth: i < 2 ? 1 : 0, borderRightColor: grade.color + "18" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: c }}>{v}</Text>
                  <Text style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{l}</Text>
                </View>
              ))}
            </View>
          </View>
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Desglose del Score</Text>
            {[["Tasa de ahorro", s.ahorro, C.mint], ["Control", s.presupuesto, C.sky],
              ["Registro", s.consistencia, C.violet], ["Manejo de deudas", s.deuda, C.gold]].map(([label, val, color], idx) => (
              <View key={label} style={{ marginBottom: idx < 3 ? 14 : 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: color + "18",
                    borderWidth: 1, borderColor: color + "28", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 14, color: color, fontWeight: "900" }}>{ICON.chart}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                      <Text style={{ fontSize: 12, color: C.t2 }}>{label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: "800", color }}>{Math.round(val)}pts</Text>
                    </View>
                    <Bar pct={val} color={color} h={5} />
                  </View>
                </View>
              </View>
            ))}
          </Card>
          <Card>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Logros</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                [ICON.fire,   "Racha activa",    streak + " días",          streak >= 3,        C.orange],
                [ICON.check,  "Sin exceder",     "Presupuesto OK",          !overBudget && expenses.length > 0, C.mint],
                [ICON.target, "Meta activa",     "Ahorro en curso",         hasActiveGoal,      C.sky],
                [ICON.save,   "Super ahorrador", "30%+ ahorro",             isSuperSaver,       C.gold],
                [ICON.shield, "Sin deudas",      "Lista limpia",            noNewDebts,         C.green],
                [ICON.star,   "Mes perfecto",    "20+ registros",           perfectMonth,       C.violet],
              ].map(([ic, label, desc, done, col]) => (
                <View key={label} style={{ width: "47%", backgroundColor: done ? col + "14" : C.card2,
                  borderRadius: 14, borderWidth: 1, borderColor: done ? col + "40" : C.border,
                  padding: 13, opacity: done ? 1 : 0.28 }}>
                  <Text style={{ fontSize: 18, color: done ? col : C.t3, fontWeight: "900", marginBottom: 6 }}>{ic}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: done ? col : C.t3 }}>{label}</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{desc}</Text>
                  {done && <View style={{ position: "absolute", top: 10, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: col }} />}
                </View>
              ))}
            </View>
          </Card>
        </>
      )}

      {/* ── PREDICTOR ── */}
      {sub === "predictor" && (
        <>
          <Card style={{ marginBottom: 12, borderColor: runOut ? C.rose + "50" : C.mint + "40",
            backgroundColor: runOut ? C.roseBg : C.mintBg }}>
            <Text style={{ fontSize: 9, color: runOut ? C.rose : C.mint, letterSpacing: 2.5, marginBottom: 8, fontWeight: "700" }}>
              {runOut ? "ALERTA" : "PROYECCION FAVORABLE"}
            </Text>
            {runOut ? (
              <Text style={{ fontSize: 14, color: C.rose, fontWeight: "700", lineHeight: 22 }}>
                A este ritmo quedarás en cero el día <Text style={{ fontSize: 22 }}>{runOut}</Text>
              </Text>
            ) : (
              <>
                <Text style={{ fontSize: 10, color: C.t3, marginBottom: 4 }}>Balance al día {DAYS_IN_MONTH}</Text>
                <Text style={{ fontSize: 36, fontWeight: "900", color: C.mint, letterSpacing: -1 }}>{money(Math.round(balEOM), cur)}</Text>
                <Text style={{ fontSize: 12, color: C.t3, marginTop: 6 }}>
                  Ritmo: <Text style={{ color: C.t1, fontWeight: "600" }}>{money(Math.round(dailyAvg), cur)}/día</Text>
                </Text>
              </>
            )}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 10, color: C.t3 }}>Día {DAY} de {DAYS_IN_MONTH}</Text>
                <Text style={{ fontSize: 10, fontWeight: "700",
                  color: pctSpent > 100 ? C.rose : pctSpent > 80 ? C.gold : C.mint }}>{Math.round(pctSpent)}% proyectado</Text>
              </View>
              <Bar pct={pctSpent} color={C.mint} h={5} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
                <Text style={{ fontSize: 9, color: C.t3 }}>Gastado: {money(totalExp, cur)}</Text>
                <Text style={{ fontSize: 9, color: C.t3 }}>Proyectado: {money(Math.round(projected), cur)}</Text>
              </View>
            </View>
          </Card>
          <Card style={{ flexDirection: "row", padding: 0, overflow: "hidden", marginBottom: 12 }}>
            {[[money(Math.round(dailyAvg), cur), "Por día", C.gold],
              [money(Math.round(dailyAvg * 7), cur), "Por semana", C.sky],
              [(DAYS_IN_MONTH - DAY) + " días", "Restantes", C.violet]].map(([v, l, c], i) => (
              <View key={l} style={{ flex: 1, padding: 14, alignItems: "center",
                borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.border }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: c, marginBottom: 2 }}>{v}</Text>
                <Text style={{ fontSize: 9, color: C.t3 }}>{l}</Text>
              </View>
            ))}
          </Card>
          {totalInc > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Líneas de referencia</Text>
              {(() => {
                const goalAmt    = totalInc * (savingGoal / 100);
                const maxGastable = totalInc - goalAmt;
                const pctG       = Math.min((totalExp / maxGastable) * 100, 120);
                const pctI       = Math.min((totalExp / totalInc) * 100, 100);
                return (
                  <>
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, color: C.t2 }}>Meta ahorro ({savingGoal}%)</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: pctG > 100 ? C.rose : C.green }}>{Math.round(pctG)}%</Text>
                      </View>
                      <Bar pct={pctG} color={C.green} h={5} />
                      <Text style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>
                        Puedes gastar hasta {money(Math.round(maxGastable), cur)} para alcanzar tu meta
                      </Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, color: C.t2 }}>Límite de ingresos</Text>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: C.sky }}>{money(totalInc, cur)}</Text>
                      </View>
                      <Bar pct={pctI} color={C.sky} h={5} />
                      <Text style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>
                        Gastado: {Math.round(pctI)}% de tus ingresos totales
                      </Text>
                    </View>
                  </>
                );
              })()}
            </Card>
          )}
        </>
      )}

      {/* ── PAGOS ── */}
      {sub === "pagos" && (
        <>
          {reminders.length > 0 && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: "hidden",
              borderWidth: 1, borderColor: C.gold + "40" }}>
              <View style={{ backgroundColor: C.goldBg, padding: 16 }}>
                <Text style={{ fontSize: 9, color: C.gold, letterSpacing: 2.5, fontWeight: "700", marginBottom: 6 }}>
                  COMPROMISOS ESTE MES
                </Text>
                <Text style={{ fontSize: 30, fontWeight: "900", color: C.gold, letterSpacing: -1 }}>{money(totalRem, cur)}</Text>
                <Text style={{ fontSize: 12, color: C.t3, marginTop: 4 }}>{reminders.filter(r => r.active).length} pagos programados</Text>
              </View>
            </View>
          )}
          {upcoming.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 12 }}>Próximos pagos</Text>
              {upcoming.map((r, i) => (
                <View key={r.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.mintBg2,
                      alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 16, color: C.mint, fontWeight: "900" }}>{ICON.check}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{r.name}</Text>
                      <Text style={{ fontSize: 10, color: C.t3 }}>Día {r.day}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: C.mint }}>{money(r.amount, cur)}</Text>
                    <TouchableOpacity onPress={() => setReminders(reminders.filter(x => x.id !== r.id))}>
                      <Text style={{ color: C.t4, fontSize: 18 }}>{ICON.close}</Text>
                    </TouchableOpacity>
                  </View>
                  {i < upcoming.length - 1 && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 48 }} />}
                </View>
              ))}
            </Card>
          )}
          {past.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 12 }}>Ya pagados</Text>
              {past.map((r, i) => (
                <View key={r.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: C.mintBg,
                      alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 14, color: C.mint, fontWeight: "900" }}>{ICON.check}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: C.t2, textDecorationLine: "line-through" }}>{r.name}</Text>
                      <Text style={{ fontSize: 10, color: C.t3 }}>Día {r.day}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: C.t3 }}>{money(r.amount, cur)}</Text>
                    <TouchableOpacity onPress={() => setReminders(reminders.filter(x => x.id !== r.id))}>
                      <Text style={{ color: C.t4, fontSize: 18 }}>{ICON.close}</Text>
                    </TouchableOpacity>
                  </View>
                  {i < past.length - 1 && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 48 }} />}
                </View>
              ))}
            </Card>
          )}
          {adding ? (
            <Card style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1, marginBottom: 12 }}>Nuevo recordatorio</Text>
              <Input value={form.name}   onChange={v => setForm({ ...form, name: v })}   placeholder="Nombre (ej: Netflix, Préstamo)" />
              <Input value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder={`Monto (${cur})`} numeric />
              <Input value={form.day}    onChange={v => setForm({ ...form, day: v })}    placeholder="Día del mes (1-31)" numeric />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Btn label="Cancelar" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
                <Btn label="Guardar" onPress={() => {
                  if (!form.name || !form.amount || !form.day) return;
                  setReminders([...reminders, { id: Date.now(), name: form.name, amount: +form.amount, day: +form.day, active: true }]);
                  setAdding(false); setForm({ name: "", amount: "", day: "" });
                }} style={{ flex: 2 }} />
              </View>
            </Card>
          ) : (
            <View style={{ marginHorizontal: 16 }}>
              <Btn label="+ Nuevo recordatorio" onPress={() => setAdding(true)} ghost />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  if (embedded) return <View style={{ flex: 1 }}>{content}</View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>{content}</SafeAreaView>;
}

// ─────────────────────────────────────────────
// ESTRATEGIA SCREEN
// ─────────────────────────────────────────────
function EstrategiaScreen({ state, setGoals, setDebts }) {
  const [subTab, setSubTab] = useState("metas");
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Estrategia</Text>
        <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Destruye deudas. Construye riqueza.</Text>
      </View>
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 8, backgroundColor: C.card,
        borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border }}>
        {[["metas", "Metas de Ahorro"], ["deudas", "Deudas"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setSubTab(id)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: subTab === id ? C.card2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: subTab === id ? C.t1 : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {subTab === "metas"  && <MetasScreen  state={state} setGoals={setGoals}  embedded />}
      {subTab === "deudas" && <DeudasScreen state={state} setDebts={setDebts}  embedded />}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// PERFIL SCREEN
// ─────────────────────────────────────────────
function PerfilScreen({ state, openSettings, setReminders }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1 }}>Perfil</Text>
        <TouchableOpacity onPress={openSettings}
          style={{ backgroundColor: C.card2, borderRadius: 11, borderWidth: 1, borderColor: C.border2, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.t2 }}>{ICON.settings} Configurar</Text>
        </TouchableOpacity>
      </View>
      <HerramientasScreen state={state} setReminders={setReminders} embedded />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// NAV BAR — 4 ítems + FAB central
// ─────────────────────────────────────────────
function NavBar({ tab, setTab, onFAB }) {
  const insets = useSafeAreaInsets();
  const left  = [{ id: "home", icon: ICON.home, label: "Inicio" }, { id: "estrategia", icon: ICON.strategy, label: "Estrategia" }];
  const right = [{ id: "chat", icon: ICON.ai, label: "IA" }, { id: "perfil", icon: ICON.profile, label: "Perfil" }];

  const Item = ({ item }) => {
    const active = tab === item.id;
    return (
      <TouchableOpacity onPress={() => setTab(item.id)}
        style={{ flex: 1, alignItems: "center", paddingVertical: 5 }} activeOpacity={0.7}>
        {active && <View style={{ position: "absolute", top: 0, width: 28, height: 2.5, backgroundColor: C.mint, borderRadius: 99 }} />}
        <View style={{ marginTop: 6, width: 32, height: 26, alignItems: "center", justifyContent: "center",
          backgroundColor: active ? C.mintBg2 : "transparent", borderRadius: 9 }}>
          <Text style={{ fontSize: 17, color: active ? C.mint : C.t3, fontWeight: "900" }}>{item.icon}</Text>
        </View>
        <Text style={{ fontSize: 9, fontWeight: "700", color: active ? C.mint : C.t3, marginTop: 2, letterSpacing: 0.3 }}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border2,
      paddingTop: 4, paddingBottom: insets.bottom + 6, alignItems: "center" }}>
      {left.map(item => <Item key={item.id} item={item} />)}
      <View style={{ width: 66, alignItems: "center", paddingBottom: 4 }}>
        <TouchableOpacity onPress={onFAB} activeOpacity={0.85}
          style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.mint, alignItems: "center", justifyContent: "center",
            shadowColor: C.mint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
            borderWidth: 2, borderColor: C.mintDim }}>
          <Text style={{ fontSize: 28, color: "#000", fontWeight: "900", lineHeight: 32 }}>+</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 8, color: C.t3, letterSpacing: 0.3, fontWeight: "600", marginTop: 2 }}>REGISTRAR</Text>
      </View>
      {right.map(item => <Item key={item.id} item={item} />)}
    </View>
  );
}

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  card:    { backgroundColor: "#0F0F18", borderRadius: 20, borderWidth: 1, borderColor: "#22223A", padding: 16, marginHorizontal: 16, marginBottom: 12 },
  btn:     { borderRadius: 13, padding: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  btnText: { fontSize: 14, fontWeight: "700" },
  input:   { backgroundColor: "#161620", borderWidth: 1, borderColor: "#2E2E48", borderRadius: 12, padding: 13, color: "#F0F0FA", fontSize: 14, marginBottom: 10 },
  obWrap:  { flex: 1, backgroundColor: "#060608", padding: 24, paddingTop: 52 },
  obH:     { fontSize: 26, fontWeight: "900", color: "#F0F0FA", marginBottom: 6, letterSpacing: -0.8 },
  obSub:   { fontSize: 13, color: "#9898B8", marginBottom: 22, lineHeight: 20 },
  lbl:     { fontSize: 9, color: "#55556A", letterSpacing: 2, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
});

// ─────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────
export default function App() {
  const [appState,      setAppState]      = useState(null);
  const [tab,           setTab]           = useState("home");
  const [showSettings,  setShowSettings]  = useState(false);
  const [showFABGlobal, setShowFABGlobal] = useState(false);
  const [isDark,        setIsDark]        = useState(true);
  const [themeKey,      setThemeKey]      = useState(0);
  const [isSurvival,    setIsSurvival]    = useState(false);
  const [frenoState,    setFrenoState]    = useState({ active: false, hoursLeft: 0 });
  const saveTimer = useRef(null);

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
    setThemeKey(k => k + 1);
  }, [isDark]);

  // Cargar app y freno simultáneamente
  useEffect(() => {
    Promise.all([loadApp(), loadFreno()]).then(([saved, freno]) => {
      setFrenoState(freno);
      if (saved && saved.onboarded && saved.user) {
        const userIsDark = saved.user.darkMode !== false;
        setIsDark(userIsDark);
        applyTheme(userIsDark ? "dark" : "light");
        setAppState(saved);
      } else {
        setAppState({ onboarded: false });
      }
    }).catch(() => setAppState({ onboarded: false }));
  }, []);

  // Actualizar modo supervivencia cuando cambia el estado
  useEffect(() => {
    if (!appState?.expenses || !appState?.income || !appState?.budgets) return;
    const totalInc = appState.income.reduce((a, i) => a + i.amount, 0);
    const totalExp = appState.expenses.reduce((a, e) => a + e.amount, 0);
    const { total: sc } = score(appState.expenses, totalInc, appState.budgets);
    const survival = sc < 40;
    setIsSurvival(survival);
    applyTheme(survival ? "survival" : isDark ? "dark" : "light");
    setThemeKey(k => k + 1);
  }, [appState?.expenses, appState?.income, appState?.budgets]);

  function updateState(changes) {
    setAppState(prev => {
      const next = { ...prev, ...changes };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveApp(next), 800);
      return next;
    });
  }

  function toggleTheme(dark) {
    setIsDark(dark);
    applyTheme(isSurvival ? "survival" : dark ? "dark" : "light");
    updateState({ user: { ...appState.user, darkMode: dark } });
  }

  async function handleToggleFreno() {
    if (frenoState.active) {
      await deactivateFreno();
      setFrenoState({ active: false, hoursLeft: 0 });
    } else {
      await activateFreno();
      setFrenoState({ active: true, hoursLeft: FRENO_HOURS });
    }
  }

  function onDone(data) {
    setAppState(data);
  }

  if (appState === null) return <SafeAreaProvider><Loading /></SafeAreaProvider>;
  if (!appState.onboarded) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={DARK_THEME.bg} />
        <Onboarding onDone={onDone} />
      </SafeAreaProvider>
    );
  }

  const s = appState;

  const addExpenseWithStreak = (e) => {
    const today  = new Date().toISOString().split("T")[0];
    const streak = s.streakDays || [];
    updateState({ expenses: [e, ...s.expenses], streakDays: streak.includes(today) ? streak : [...streak, today] });
  };

  return (
    <SafeAreaProvider key={themeKey}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar barStyle={isDark && !isSurvival ? "light-content" : isSurvival ? "light-content" : "dark-content"} backgroundColor={C.bg} />
        {tab === "home"       && <HomeScreen state={s} openSettings={() => setShowSettings(true)}
          onAddExpense={addExpenseWithStreak}
          onUpdateIncome={inc => updateState({ income: inc })}
          onDeleteExpense={id => updateState({ expenses: s.expenses.filter(e => e.id !== id) })}
          isSurvival={isSurvival} frenoState={frenoState} />}
        {tab === "estrategia" && <EstrategiaScreen state={s}
          setGoals={v => updateState({ goals: v })} setDebts={v => updateState({ debts: v })} />}
        {tab === "chat"       && <ChatScreen state={s} addExpense={addExpenseWithStreak} />}
        {tab === "perfil"     && <PerfilScreen state={s} openSettings={() => setShowSettings(true)}
          setReminders={v => updateState({ reminders: v })} />}
        <NavBar tab={tab} setTab={setTab} onFAB={() => setShowFABGlobal(true)} />
        <FABModal visible={showFABGlobal} onClose={() => setShowFABGlobal(false)}
          onSaveExpense={addExpenseWithStreak}
          onSaveIncome={inc => updateState({ income: [...s.income, inc] })}
          onSaveAbono={(targetId, amount, type) => {
            if (type === "deuda") {
              updateState({ debts: s.debts.map(d => d.id === targetId ? { ...d, balance: Math.max(0, d.balance - amount) } : d) });
            } else {
              updateState({ goals: s.goals.map(g => g.id === targetId ? { ...g, saved: g.saved + amount } : g) });
            }
          }}
          state={s} frenoActive={frenoState.active} />
        {showSettings && <SettingsModal state={s} updateState={updateState} onClose={() => setShowSettings(false)}
          isDark={isDark} onToggleTheme={toggleTheme} frenoState={frenoState} onToggleFreno={handleToggleFreno} />}
      </View>
    </SafeAreaProvider>
  );
}
