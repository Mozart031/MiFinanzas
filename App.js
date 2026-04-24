import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Alert, Dimensions, Animated,
  Modal, Pressable, Switch, Vibration,
} from "react-native";
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────
// TEMA — dark / light con paletas completas
// ─────────────────────────────────────────────
const DARK_THEME = {
  bg:       "#060608", card:    "#0F0F18", card2:   "#161620",
  card3:    "#1C1C28", border:  "#22223A", border2: "#2E2E48",
  mint:     "#00E5B0", mintDim: "#00C49A", mintBg:  "#00E5B012", mintBg2: "#00E5B025",
  gold:     "#F5B800", goldDim: "#D4A000", goldBg:  "#F5B80012", goldBg2: "#F5B80028",
  rose:     "#FF4D6D", roseDim: "#E03358", roseBg:  "#FF4D6D12", roseBg2: "#FF4D6D28",
  sky:      "#38BDF8", skyDim:  "#22A8E8", skyBg:   "#38BDF812", skyBg2:  "#38BDF828",
  violet:   "#A78BFA", violetBg:"#A78BFA12",
  green:    "#10B981", greenBg: "#10B98112",
  orange:   "#FB923C", orangeBg:"#FB923C12",
  pink:     "#EC4899",
  t1: "#F0F0FA", t2: "#9898B8", t3: "#55556A", t4: "#28283A", t5: "#1A1A28",
};

const LIGHT_THEME = {
  bg:       "#F0F4F8", card:    "#FFFFFF", card2:   "#F7F9FC",
  card3:    "#EDF0F5", border:  "#DDE2EA", border2: "#C8D0DC",
  mint:     "#00B88A", mintDim: "#009A74", mintBg:  "#00B88A14", mintBg2: "#00B88A28",
  gold:     "#D4920A", goldDim: "#B87E08", goldBg:  "#D4920A14", goldBg2: "#D4920A28",
  rose:     "#E8274B", roseDim: "#C82040", roseBg:  "#E8274B14", roseBg2: "#E8274B28",
  sky:      "#0EA5E9", skyDim:  "#0284C7", skyBg:   "#0EA5E914", skyBg2:  "#0EA5E928",
  violet:   "#7C3AED", violetBg:"#7C3AED14",
  green:    "#059669", greenBg: "#05966914",
  orange:   "#EA580C", orangeBg:"#EA580C14",
  pink:     "#DB2777",
  t1: "#0F172A", t2: "#475569", t3: "#94A3B8", t4: "#CBD5E1", t5: "#E2E8F0",
};

// C es un proxy mutable — se actualiza cuando cambia el tema
let C = { ...DARK_THEME };
function applyTheme(isDark) {
  const src = isDark ? DARK_THEME : LIGHT_THEME;
  Object.keys(src).forEach(k => { C[k] = src[k]; });
}

// ─────────────────────────────────────────────
// DATOS POR DEFECTO — limpios, sin datos de ejemplo
// ─────────────────────────────────────────────
const DEF_BUDGETS = { Alimentacion: 8000, Transporte: 4000, Ocio: 3000, Suscripciones: 1500 };

const CATS = {
  Alimentacion:  { icon: "🛒", color: C.mint,   isEssential: true  },
  Transporte:    { icon: "⛽", color: C.sky,    isEssential: true  },
  Ocio:          { icon: "🎮", color: C.pink,   isEssential: false },
  Salud:         { icon: "💊", color: C.green,  isEssential: true  },
  Suscripciones: { icon: "📱", color: C.violet, isEssential: false },
  Hogar:         { icon: "🏠", color: C.orange, isEssential: true  },
  Educacion:     { icon: "📚", color: C.gold,   isEssential: true  },
  Lujos:         { icon: "💎", color: C.rose,   isEssential: false },
  Otro:          { icon: "💸", color: C.t3,     isEssential: false },
};

// Categorias bloqueables en modo emergencia
const BLOCKABLE_CATS = ["Ocio", "Suscripciones", "Lujos"];

// ─────────────────────────────────────────────
// STORAGE — guardado simple y directo
// ─────────────────────────────────────────────
const STORE_KEY = "mifinanzas_v7";

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

function money(n, cur, hideAmount = false) {
  if (hideAmount) return (cur || "RD$") + "••••";
  return (cur || "RD$") + Math.abs(Math.round(n)).toLocaleString();
}

function nlp(text) {
  const low = text.toLowerCase();
  const m = text.match(/[\d,]+(\.\d+)?/);
  const amount = m ? parseFloat(m[0].replace(",", "")) : null;
  let cat = "Otro";
  if (/gasolina|uber|combustible|transport/.test(low)) cat = "Transporte";
  else if (/comida|supermercado|nacional|bravo|restaurante|almuerzo|cena/.test(low)) cat = "Alimentacion";
  else if (/netflix|spotify|suscripci|disney|amazon|hbo|youtube|prime/.test(low)) cat = "Suscripciones";
  else if (/farmacia|medic|doctor|salud|pastilla/.test(low)) cat = "Salud";
  else if (/ocio|fiesta|cine|bar|juego|entretenimiento/.test(low)) cat = "Ocio";
  else if (/casa|hogar|alquiler|luz|agua/.test(low)) cat = "Hogar";
  else if (/lujo|joya|reloj|marca|gucci|louis/.test(low)) cat = "Lujos";
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const date = /ayer/.test(low) ? yesterday : today;
  const dm = text.match(/en\s+(.+?)(\s+hoy|\s+ayer|$)/i);
  const raw = dm ? dm[1].trim() : cat;
  return { amount, cat, date, desc: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

// Score financiero con semaforo
function score(expenses, income, budgets, debts = [], goals = []) {
  const exp = expenses.reduce((a, e) => a + e.amount, 0);
  const save = income > 0 ? ((income - exp) / income) * 100 : 0;
  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const cats = Object.entries(budgets);
  const over = cats.filter(([k, l]) => (ct[k] || 0) > l).length;
  
  // Calcular score de deuda
  const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
  const debtScore = income > 0 ? Math.max(0, 100 - (totalDebt / income) * 20) : 85;
  
  // Calcular score de metas
  const goalProgress = goals.length > 0 
    ? goals.reduce((a, g) => a + (g.saved / g.target), 0) / goals.length * 100 
    : 50;
  
  const s = {
    ahorro:      Math.min(100, Math.max(0, save * 2.5)),
    presupuesto: cats.length ? Math.max(0, 100 - (over / cats.length) * 100) : 80,
    consistencia:Math.min(100, (expenses.length / 15) * 100),
    deuda:       Math.min(100, debtScore),
    metas:       Math.min(100, goalProgress),
  };
  const total = Math.round(s.ahorro * .35 + s.presupuesto * .25 + s.consistencia * .15 + s.deuda * .15 + s.metas * .10);
  const grade = total >= 85 ? { label: "Excelente", color: C.green,  emoji: "🏆" }
              : total >= 70 ? { label: "Bueno",     color: C.mint,   emoji: "✅" }
              : total >= 50 ? { label: "Regular",   color: C.gold,   emoji: "⚠️" }
              : total >= 25 ? { label: "Critico",   color: C.rose,   emoji: "🚨" }
              :               { label: "Peligro",   color: C.rose,   emoji: "🔥" };
  return { total, s, grade };
}

// Sistema semaforo para balance
function getTrafficLight(balance, income) {
  if (income <= 0) return { status: "unknown", color: C.t3, label: "Sin datos" };
  const pct = (balance / income) * 100;
  if (pct >= 50) return { status: "green", color: C.green, label: "Disponible", emoji: "🟢" };
  if (pct >= 25) return { status: "yellow", color: C.gold, label: "Precaucion", emoji: "🟡" };
  return { status: "red", color: C.rose, label: "Alerta", emoji: "🔴" };
}

function payoffMonths(balance, rate, payment) {
  const r = rate / 100 / 12;
  if (payment <= r * balance) return Infinity;
  if (r === 0) return Math.ceil(balance / payment);
  return Math.ceil(Math.log(payment / (payment - r * balance)) / Math.log(1 + r));
}

// ─────────────────────────────────────────────
// UTILIDAD: calcular racha real de dias
// ─────────────────────────────────────────────
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

// Días de runway: cuántos días sobrevives sin ingresos
function calcRunway(balance, expenses) {
  if (expenses.length === 0) return null;
  const days = Math.max(DAY, 1);
  const dailyBurn = expenses.reduce((a, e) => a + e.amount, 0) / days;
  if (dailyBurn <= 0) return null;
  return Math.floor(balance / dailyBurn);
}

// Horas de trabajo que cuesta algo (filtro de arrepentimiento)
function lifeHours(amount, monthlyIncome) {
  if (!monthlyIncome || monthlyIncome <= 0) return null;
  const hourlyRate = monthlyIncome / (22 * 8); // 22 días laborales × 8h
  return Math.round(amount / hourlyRate);
}

// Modo supervivencia: % gastado vs ingresos antes de quincena
function survivalMode(expenses, income, day) {
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  if (totalInc <= 0) return false;
  if (day <= 15) {
    const halfInc = totalInc * 0.5;
    return totalExp >= halfInc * 0.8;
  }
  return totalExp >= totalInc * 0.9;
}

// Detectar suscripciones recurrentes
function detectSubscriptions(expenses) {
  const recurring = {};
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  expenses.forEach(e => {
    if (e.cat === "Suscripciones" || /netflix|spotify|disney|hbo|amazon|prime|youtube|gym|gimnasio/i.test(e.desc)) {
      const key = e.desc.toLowerCase().trim();
      if (!recurring[key]) {
        recurring[key] = { desc: e.desc, amount: e.amount, count: 1, lastDate: e.date };
      } else {
        recurring[key].count++;
        if (e.date > recurring[key].lastDate) recurring[key].lastDate = e.date;
      }
    }
  });
  
  return Object.values(recurring).filter(r => r.count >= 1);
}

// Calcular redondeo sugerido
function calcRoundUp(amount, roundTo = 100) {
  const rounded = Math.ceil(amount / roundTo) * roundTo;
  return rounded - amount;
}

// Verificar si el freno de emergencia esta activo
function isEmergencyBrakeActive(brakeUntil) {
  if (!brakeUntil) return false;
  return new Date(brakeUntil) > new Date();
}

// ─────────────────────────────────────────────
// COMPONENTES BASE — diseño premium
// ─────────────────────────────────────────────
function Card({ children, style, accent, accentColor, glow, danger }) {
  const acCol = accentColor || C.mint;
  const borderCol = danger ? C.rose + "60" : accent ? acCol + "50" : C.border;
  const bg = danger ? "#180008" : accent ? "#00120E" : C.card;
  const shadowStyle = glow ? {
    shadowColor: acCol,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  } : {};
  return (
    <View style={[styles.card, { borderColor: borderCol, backgroundColor: bg }, shadowStyle, style]}>
      {accent && <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: acCol, borderTopLeftRadius: 20, borderTopRightRadius: 20, opacity: 0.7 }} />}
      {children}
    </View>
  );
}

function Btn({ label, onPress, primary, ghost, danger, disabled, style, small, icon }) {
  const bg = disabled ? C.t4 : danger ? C.rose : primary !== false && !ghost ? C.mint : "transparent";
  const tc = disabled ? C.t3 : (ghost || danger) ? (danger ? C.rose : C.t2) : "#000";
  const bw = ghost ? 1 : 0;
  return (
    <TouchableOpacity
      onPress={disabled ? null : onPress}
      activeOpacity={0.75}
      style={[styles.btn, { backgroundColor: bg, borderWidth: bw, borderColor: ghost ? C.border2 : C.border }, small && { padding: 10 }, style]}
    >
      {icon ? <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text> : null}
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
      placeholderTextColor={C.t3}
      keyboardType={numeric ? "numeric" : "default"}
      multiline={multiline}
    />
  );
}

// Barra de progreso con gradiente semántico y altura configurable
function Bar({ pct, color, h, bg, showGlow }) {
  const p = Math.min(Math.max(pct || 0, 0), 100);
  const bc = pct > 100 ? C.rose : pct > 85 ? C.gold : (color || C.mint);
  return (
    <View style={{ height: h || 5, borderRadius: 99, backgroundColor: bg || C.border, overflow: "hidden" }}>
      <View style={{
        height: "100%", width: p + "%", borderRadius: 99, backgroundColor: bc,
        shadowColor: showGlow ? bc : "transparent",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 4,
      }} />
    </View>
  );
}

// Circulo de Score Financiero con animacion de pulso
function ScoreCircle({ score, grade, size = 80, showPulse = false }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (showPulse && score < 40) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [showPulse, score]);
  
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * 360;
  
  return (
    <Animated.View style={{ 
      width: size, height: size, alignItems: "center", justifyContent: "center",
      transform: [{ scale: pulseAnim }]
    }}>
      {/* Background ring */}
      <View style={{ 
        position: "absolute", width: size, height: size, borderRadius: size / 2, 
        borderWidth: strokeWidth, borderColor: C.border2 
      }} />
      {/* Progress ring */}
      <View style={{ 
        position: "absolute", width: size, height: size, borderRadius: size / 2, 
        borderWidth: strokeWidth, borderColor: grade.color,
        borderTopColor: progress >= 0 ? grade.color : "transparent",
        borderRightColor: progress >= 90 ? grade.color : "transparent",
        borderBottomColor: progress >= 180 ? grade.color : "transparent",
        borderLeftColor: progress >= 270 ? grade.color : "transparent",
        transform: [{ rotate: "-90deg" }],
        opacity: score > 0 ? 1 : 0,
      }} />
      {/* Center content */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {score < 40 && <Text style={{ fontSize: size * 0.18, marginBottom: -2 }}>🚨</Text>}
        <Text style={{ fontSize: size * 0.35, fontWeight: "900", color: grade.color }}>{score}</Text>
        <Text style={{ fontSize: size * 0.1, color: C.t3, letterSpacing: 0.5 }}>SCORE</Text>
      </View>
    </Animated.View>
  );
}

function Tag({ label, color, size }) {
  const fs = size === "sm" ? 10 : 11;
  return (
    <View style={{ backgroundColor: color + "22", borderRadius: 7, borderWidth: 1, borderColor: color + "35", paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontSize: fs, fontWeight: "700", color, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

// Separador decorativo
function Divider({ color }) {
  return <View style={{ height: 1, backgroundColor: color || C.border, marginVertical: 12 }} />;
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

// Icono de categoría con fondo de color
function CatIcon({ cat, size, blocked }) {
  const s = size || 44;
  const info = CATS[cat] || CATS["Otro"];
  return (
    <View style={{ 
      width: s, height: s, borderRadius: s * 0.3, 
      backgroundColor: blocked ? C.t4 : info.color + "20", 
      borderWidth: 1, borderColor: blocked ? C.t3 : info.color + "30", 
      alignItems: "center", justifyContent: "center",
      opacity: blocked ? 0.5 : 1,
    }}>
      <Text style={{ fontSize: s * 0.42 }}>{blocked ? "🚫" : info.icon}</Text>
    </View>
  );
}

// Stat box — para métricas en fila
function StatBox({ label, value, color, sub, style }) {
  return (
    <View style={[{ flex: 1, alignItems: "center", paddingVertical: 12 }, style]}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: color || C.t1, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ fontSize: 10, color: C.t3, marginTop: 3, letterSpacing: 0.5 }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: color || C.t2, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

// ─────────────────────────────────────────────
// ANIMACIÓN — wrapper de entrada
// ─────────────────────────────────────────────
function FadeIn({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// FAB — Modal de registro rápido con Redondeo
// ─────────────────────────────────────────────
function FABModal({ visible, onClose, onSave, cur, goals, emergencyBrakeActive, onRoundUp }) {
  const [desc,   setDesc]   = useState("");
  const [amount, setAmount] = useState("");
  const [cat,    setCat]    = useState("Otro");
  const [showRoundUp, setShowRoundUp] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const roundUpAmount = amount ? calcRoundUp(+amount) : 0;

  const save = () => {
    if (!amount || isNaN(+amount)) return;
    const today = new Date().toISOString().split("T")[0];
    
    // Verificar si la categoria esta bloqueada
    if (emergencyBrakeActive && BLOCKABLE_CATS.includes(cat)) {
      Alert.alert(
        "🚫 Categoria Bloqueada",
        `El Freno de Emergencia esta activo. No puedes registrar gastos en "${cat}" hasta que termine el periodo de bloqueo.`,
        [{ text: "Entendido", style: "cancel" }]
      );
      return;
    }
    
    onSave({ id: Date.now(), desc: desc.trim() || cat, amount: +amount, cat, date: today });
    
    // Mostrar opcion de redondeo si hay metas y el redondeo es > 0
    if (roundUpAmount > 0 && goals && goals.length > 0) {
      setShowRoundUp(true);
    } else {
      resetAndClose();
    }
  };
  
  const handleRoundUp = () => {
    if (selectedGoal && roundUpAmount > 0) {
      onRoundUp(selectedGoal, roundUpAmount);
      Vibration.vibrate(50);
    }
    resetAndClose();
  };
  
  const resetAndClose = () => {
    setDesc(""); setAmount(""); setCat("Otro");
    setShowRoundUp(false); setSelectedGoal(null);
    onClose();
  };

  if (!visible) return null;
  
  // Pantalla de redondeo
  if (showRoundUp) {
    return (
      <Modal transparent animationType="none" visible={visible} onRequestClose={resetAndClose}>
        <Pressable style={{ flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" }} onPress={resetAndClose}>
          <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.mint + "50", padding: 20, paddingBottom: 36 }}>
              <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: C.border2, alignSelf: "center", marginBottom: 18 }} />
              
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.mintBg2, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Text style={{ fontSize: 32 }}>💰</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: "900", color: C.t1, textAlign: "center" }}>Redondeo Inteligente</Text>
                <Text style={{ fontSize: 13, color: C.t2, textAlign: "center", marginTop: 6 }}>
                  Gastaste {cur}{amount}. Redondea a {cur}{Math.ceil(+amount / 100) * 100} y ahorra:
                </Text>
                <Text style={{ fontSize: 32, fontWeight: "900", color: C.mint, marginTop: 8 }}>{cur}{roundUpAmount}</Text>
              </View>
              
              <Text style={{ fontSize: 12, color: C.t3, marginBottom: 10, fontWeight: "700" }}>ENVIAR A:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(goals || []).map(g => (
                    <TouchableOpacity key={g.id} onPress={() => setSelectedGoal(g.id)}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 2,
                        borderColor: selectedGoal === g.id ? C.mint : C.border,
                        backgroundColor: selectedGoal === g.id ? C.mintBg2 : C.card2,
                        alignItems: "center", minWidth: 100 }}>
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>{g.emoji}</Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: selectedGoal === g.id ? C.mint : C.t2 }}>{g.name}</Text>
                      <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{Math.round((g.saved / g.target) * 100)}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Btn label="No gracias" onPress={resetAndClose} ghost style={{ flex: 1 }} />
                <Btn label="Ahorrar" onPress={handleRoundUp} disabled={!selectedGoal} style={{ flex: 2 }} icon="💰" />
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }
  
  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" }} onPress={onClose}>
        <Animated.View
          style={{ transform: [{ translateY: slideAnim }] }}
          onStartShouldSetResponder={() => true}
        >
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.border2, padding: 20, paddingBottom: 36 }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: C.border2, alignSelf: "center", marginBottom: 18 }} />
            <Text style={{ fontSize: 18, fontWeight: "900", color: C.t1, marginBottom: 16, letterSpacing: -0.5 }}>⚡ Registro rápido</Text>

            {/* Categoría chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {Object.entries(CATS).map(([key, val]) => {
                  const isBlocked = emergencyBrakeActive && BLOCKABLE_CATS.includes(key);
                  return (
                    <TouchableOpacity key={key} onPress={() => !isBlocked && setCat(key)}
                      disabled={isBlocked}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5,
                        borderColor: isBlocked ? C.t4 : cat === key ? val.color : C.border,
                        backgroundColor: isBlocked ? C.t5 : cat === key ? val.color + "22" : C.card2,
                        opacity: isBlocked ? 0.5 : 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: isBlocked ? C.t4 : cat === key ? val.color : C.t3 }}>
                        {isBlocked ? "🚫" : val.icon} {key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {emergencyBrakeActive && (
              <View style={{ backgroundColor: C.roseBg2, borderRadius: 12, padding: 10, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16 }}>🚨</Text>
                <Text style={{ fontSize: 11, color: C.rose, flex: 1 }}>Freno de emergencia activo. Ocio, Suscripciones y Lujos bloqueados.</Text>
              </View>
            )}

            <Input value={desc} onChange={setDesc} placeholder={`Descripción (ej: Almuerzo, Uber...)`} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input value={amount} onChange={setAmount} placeholder={`Monto en ${cur}`} numeric />
              </View>
              <TouchableOpacity onPress={save} style={{ width: 54, height: 54, backgroundColor: C.mint, borderRadius: 16,
                alignItems: "center", justifyContent: "center",
                shadowColor: C.mint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 }}>
                <Text style={{ fontSize: 24, color: "#000", fontWeight: "900" }}>✓</Text>
              </TouchableOpacity>
            </View>
            
            {/* Preview de redondeo */}
            {amount && +amount > 0 && roundUpAmount > 0 && goals && goals.length > 0 && (
              <View style={{ backgroundColor: C.mintBg, borderRadius: 12, padding: 12, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 18 }}>💡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.mint, fontWeight: "700" }}>Redondeo disponible</Text>
                  <Text style={{ fontSize: 10, color: C.t3 }}>Ahorra {cur}{roundUpAmount} al confirmar</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// FAB BUTTON — botón flotante persistente
// ─────────────────────────────────────────────
function FAB({ onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ position: "absolute", bottom: 88, right: 20, transform: [{ scale }],
      shadowColor: C.mint, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 12 }}>
      <TouchableOpacity onPress={pulse} activeOpacity={1}
        style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: C.mint, alignItems: "center", justifyContent: "center",
          borderWidth: 1.5, borderColor: "#00FFD0" }}>
        <Text style={{ fontSize: 28, color: "#000", fontWeight: "900", lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────
// HISTORIAL MODAL — gastos completos con filtros y eliminar
// ─────────────────────────────────────────────
function HistorialModal({ visible, onClose, expenses, onDelete, cur, hideAmounts }) {
  const [filterCat, setFilterCat] = useState("Todos");
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    else Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible) return null;

  const cats = ["Todos", ...Object.keys(CATS)];
  const filtered = filterCat === "Todos" ? expenses : expenses.filter(e => e.cat === filterCat);
  const total = filtered.reduce((a, e) => a + e.amount, 0);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000CC" }}>
        <Animated.View style={{ flex: 1, marginTop: 60, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderWidth: 1, borderColor: C.border2, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Historial completo</Text>
              <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{filtered.length} movimientos · {money(total, cur, hideAmounts)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.t2, fontSize: 18, fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filtros */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingVertical: 12, maxHeight: 52 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {cats.map(c => {
                const info = CATS[c];
                const active = filterCat === c;
                const col = info?.color || C.mint;
                return (
                  <TouchableOpacity key={c} onPress={() => setFilterCat(c)}
                    style={{ paddingHorizontal: 13, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5,
                      borderColor: active ? col : C.border, backgroundColor: active ? col + "22" : C.card2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: active ? col : C.t3 }}>
                      {info ? info.icon + " " : ""}{c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Lista */}
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {filtered.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                <Text style={{ fontSize: 15, color: C.t3 }}>Sin registros en esta categoria</Text>
              </View>
            ) : (
              filtered.map((e, i) => {
                const info = CATS[e.cat] || CATS["Otro"];
                return (
                  <View key={e.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: info.color + "18",
                        borderWidth: 1, borderColor: info.color + "30", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 20 }}>{info.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }} numberOfLines={1}>{e.desc}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: info.color }} />
                          <Text style={{ fontSize: 10, color: C.t3 }}>{e.cat} · {e.date}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: C.rose }}>-{money(e.amount, cur, hideAmounts)}</Text>
                      <TouchableOpacity onPress={() => Alert.alert("Eliminar gasto", `¿Eliminar "${e.desc}"?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Eliminar", style: "destructive", onPress: () => onDelete(e.id) },
                      ])} style={{ padding: 8 }}>
                        <Text style={{ color: C.t4, fontSize: 18 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                    {i < filtered.length - 1 && <View style={{ height: 1, backgroundColor: C.border, marginLeft: 56 }} />}
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
// INGRESOS MODAL — gestión de ingresos
// ─────────────────────────────────────────────
function IngresosModal({ visible, onClose, income, onSave, cur, hideAmounts }) {
  const [list,    setList]    = useState(income);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ source: "", amount: "", type: "fijo" });
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => { setList(income); }, [income]);
  useEffect(() => {
    if (visible) Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }).start();
    else Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }).start();
  }, [visible]);

  if (!visible) return null;
  const total = list.reduce((a, i) => a + i.amount, 0);

  const save = () => {
    if (!form.source || !form.amount) return;
    const updated = [...list, { id: Date.now(), source: form.source, amount: +form.amount,
      date: new Date().toISOString().split("T")[0], type: form.type }];
    setList(updated); onSave(updated);
    setForm({ source: "", amount: "", type: "fijo" }); setAdding(false);
  };

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000CC" }}>
        <Animated.View style={{ flex: 1, marginTop: 60, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderWidth: 1, borderColor: C.border2, transform: [{ translateY: slideAnim }] }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1 }}>Mis Ingresos 💼</Text>
              <Text style={{ fontSize: 11, color: C.mint, marginTop: 2, fontWeight: "700" }}>Total: {money(total, cur, hideAmounts)}/mes</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.t2, fontSize: 18, fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {list.map((inc, i) => (
              <View key={inc.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12,
                backgroundColor: C.card2, borderRadius: 16, borderWidth: 1, borderColor: C.border2, padding: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.mintBg2, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 20 }}>{inc.type === "fijo" ? "💼" : "⚡"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>{inc.source}</Text>
                  <Tag label={inc.type === "fijo" ? "Fijo" : "Variable"} color={inc.type === "fijo" ? C.mint : C.gold} size="sm" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "800", color: C.mint }}>{money(inc.amount, cur, hideAmounts)}</Text>
                <TouchableOpacity onPress={() => { const u = list.filter(x => x.id !== inc.id); setList(u); onSave(u); }}>
                  <Text style={{ color: C.t4, fontSize: 20 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {adding ? (
              <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border2, padding: 16, marginTop: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nueva fuente de ingreso</Text>
                <Input value={form.source} onChange={v => setForm({ ...form, source: v })} placeholder="Nombre (ej: Salario, Freelance...)" />
                <Input value={form.amount} onChange={v => setForm({ ...form, amount: v })} placeholder={`Monto mensual (${cur})`} numeric />
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {[["fijo", "💼 Fijo"], ["variable", "⚡ Variable"]].map(([t, l]) => (
                    <TouchableOpacity key={t} onPress={() => setForm({ ...form, type: t })}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                        borderColor: form.type === t ? C.mint : C.border, backgroundColor: form.type === t ? C.mintBg : C.card2 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: form.type === t ? C.mint : C.t3 }}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Btn label="Cancelar" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
                  <Btn label="Guardar" onPress={save} style={{ flex: 2 }} />
                </View>
              </View>
            ) : (
              <Btn label="+ Agregar ingreso" onPress={() => setAdding(true)} ghost style={{ marginTop: 4 }} />
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// FRENO DE EMERGENCIA MODAL
// ─────────────────────────────────────────────
function EmergencyBrakeModal({ visible, onClose, onActivate, brakeUntil }) {
  const isActive = isEmergencyBrakeActive(brakeUntil);
  const timeLeft = isActive ? Math.max(0, Math.ceil((new Date(brakeUntil) - new Date()) / (1000 * 60 * 60))) : 0;
  
  if (!visible) return null;
  
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#000000DD", justifyContent: "center", alignItems: "center", padding: 24 }} onPress={onClose}>
        <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, borderWidth: 2, borderColor: isActive ? C.rose : C.gold }}
          onStartShouldSetResponder={() => true}>
          
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: isActive ? C.roseBg2 : C.goldBg2, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 40 }}>{isActive ? "🛑" : "🚨"}</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: "900", color: C.t1, textAlign: "center" }}>
              Freno de Emergencia
            </Text>
            <Text style={{ fontSize: 13, color: C.t2, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
              {isActive 
                ? `Activo. Las categorias de Ocio, Suscripciones y Lujos estan bloqueadas.`
                : "Activa el freno para bloquear gastos innecesarios durante 48 horas."
              }
            </Text>
          </View>
          
          {isActive && (
            <View style={{ backgroundColor: C.roseBg, borderRadius: 16, padding: 16, marginBottom: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: C.rose, fontWeight: "700", marginBottom: 4 }}>TIEMPO RESTANTE</Text>
              <Text style={{ fontSize: 32, fontWeight: "900", color: C.rose }}>{timeLeft}h</Text>
            </View>
          )}
          
          <View style={{ backgroundColor: C.card2, borderRadius: 14, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: C.t1, marginBottom: 8 }}>Categorias bloqueadas:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {BLOCKABLE_CATS.map(cat => (
                <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.roseBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 14 }}>🚫</Text>
                  <Text style={{ fontSize: 12, color: C.rose, fontWeight: "600" }}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Btn label="Cerrar" onPress={onClose} ghost style={{ flex: 1 }} />
            {!isActive && (
              <Btn 
                label="Activar 48h" 
                onPress={() => { onActivate(); onClose(); }} 
                danger 
                style={{ flex: 2 }} 
                icon="🛑" 
              />
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// SUSCRIPCIONES MODAL (Corte de Grasa)
// ─────────────────────────────────────────────
function SubscriptionsModal({ visible, onClose, expenses, cur }) {
  const subscriptions = detectSubscriptions(expenses);
  const totalMonthly = subscriptions.reduce((a, s) => a + s.amount, 0);
  
  if (!visible) return null;
  
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000CC" }}>
        <View style={{ flex: 1, marginTop: 80, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.border2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1 }}>Corte de Grasa ✂️</Text>
              <Text style={{ fontSize: 11, color: C.violet, marginTop: 2, fontWeight: "700" }}>
                {subscriptions.length} suscripciones detectadas
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.t2, fontSize: 18, fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {totalMonthly > 0 && (
            <View style={{ margin: 16, backgroundColor: C.violetBg, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.violet + "40" }}>
              <Text style={{ fontSize: 11, color: C.violet, letterSpacing: 1.5, marginBottom: 4 }}>GASTO MENSUAL EN SUSCRIPCIONES</Text>
              <Text style={{ fontSize: 28, fontWeight: "900", color: C.violet }}>{money(totalMonthly, cur)}</Text>
              <Text style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>{money(totalMonthly * 12, cur)} al año</Text>
            </View>
          )}
          
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {subscriptions.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>✨</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: C.t1, marginBottom: 6 }}>Sin suscripciones detectadas</Text>
                <Text style={{ fontSize: 13, color: C.t3, textAlign: "center" }}>Registra tus gastos de servicios como Netflix, Spotify, etc.</Text>
              </View>
            ) : (
              subscriptions.map((sub, i) => (
                <View key={i} style={{ backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.violetBg, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 22 }}>📱</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>{sub.desc}</Text>
                      <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>Ultimo pago: {sub.lastDate}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: C.violet }}>{money(sub.amount, cur)}</Text>
                      <Text style={{ fontSize: 10, color: C.t3 }}>/mes</Text>
                    </View>
                  </View>
                  
                  <View style={{ marginTop: 12, backgroundColor: C.card2, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 11, color: C.gold, fontWeight: "700" }}>¿Has usado este servicio en los ultimos 15 dias?</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: C.mintBg, alignItems: "center" }}>
                        <Text style={{ fontSize: 11, color: C.mint, fontWeight: "700" }}>Si, lo uso</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: C.roseBg, alignItems: "center" }}>
                        <Text style={{ fontSize: 11, color: C.rose, fontWeight: "700" }}>No, cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: DARK_THEME.bg, alignItems: "center", justifyContent: "center" }}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_THEME.bg} />
      <Animated.View style={{ opacity: pulse, alignItems: "center" }}>
        <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: DARK_THEME.mintBg2,
          borderWidth: 2, borderColor: DARK_THEME.mint + "50", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
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
    const userData = { name: name.trim() || "Usuario", currency: cur };
    const goals = gName && gTarget
      ? [{ id: 1, name: gName, emoji: gEmoji, target: +gTarget, saved: 0, weeks: +gWeeks }]
      : [];
    const income = [];
    if (inc)   income.push({ id: 1, source: "Salario",   amount: +inc,   date: new Date().toISOString().split("T")[0], type: "fijo"     });
    if (extra) income.push({ id: 2, source: "Variable",  amount: +extra, date: new Date().toISOString().split("T")[0], type: "variable" });
    const budgets = {};
    Object.entries(bud).forEach(([k, v]) => { if (v) budgets[k] = +v; });

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
            ["🚨", "Sistema semaforo y freno de emergencia"],
            ["📊", "Alertas inteligentes de presupuesto"],
            ["💎", "Redondeo automatico para ahorro"],
            ["🔒", "Modo privacidad para ocultar balances"],
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
          <Text style={{ fontSize: 12, color: C.t2, lineHeight: 18 }}>Calculamos tu tasa de ahorro, sistema semaforo y alertas personalizadas.</Text>
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

  // PANTALLA 4 — META DE AHORRO
  if (step === 4) return (
    <SafeAreaView style={styles.obWrap}>
      {dots}
      <Text style={styles.obH}>Tu primera meta 🎯</Text>
      <Text style={styles.obSub}>Define un objetivo de ahorro. (opcional)</Text>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.lbl}>NOMBRE DE LA META</Text>
        <Input value={gName} onChange={setGName} placeholder="ej: Fondo de Emergencia, Viaje..." />
        <Text style={[styles.lbl, { marginTop: 12 }]}>EMOJI</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["🎯", "🏠", "✈️", "🚗", "💻", "📱", "🎓", "💍", "🏖️", "🎸"].map(e => (
              <TouchableOpacity key={e} onPress={() => setGEmoji(e)}
                style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 2,
                  borderColor: gEmoji === e ? C.mint : C.border,
                  backgroundColor: gEmoji === e ? C.mintBg : C.card2,
                  alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.lbl}>MONTO OBJETIVO ({cur})</Text>
        <Input value={gTarget} onChange={setGTarget} placeholder="ej: 50000" numeric />
        <Text style={[styles.lbl, { marginTop: 12 }]}>PLAZO EN SEMANAS</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {["12", "24", "36", "52"].map(w => (
            <TouchableOpacity key={w} onPress={() => setGWeeks(w)}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                borderColor: gWeeks === w ? C.mint : C.border,
                backgroundColor: gWeeks === w ? C.mintBg : C.card2 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: gWeeks === w ? C.mint : C.t3 }}>{w} sem</Text>
            </TouchableOpacity>
          ))}
        </View>
        {gName && gTarget && (
          <View style={{ backgroundColor: C.mintBg, borderRadius: 14, padding: 14, marginTop: 16 }}>
            <Text style={{ fontSize: 12, color: C.mint, fontWeight: "700" }}>Ahorro semanal sugerido:</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: C.mint }}>{cur}{Math.ceil(+gTarget / +gWeeks).toLocaleString()}</Text>
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Btn label="Atras" onPress={() => setStep(3)} ghost style={{ flex: 1 }} />
        <Btn label="Finalizar ✓" onPress={submit} style={{ flex: 2 }} />
      </View>
    </SafeAreaView>
  );

  return null;
}

// ─────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────
function HomeScreen({ state, openSettings, onAddExpense, onUpdateIncome, onDeleteExpense, onTogglePrivacy, onActivateEmergencyBrake, onRoundUp }) {
  const { expenses, income, budgets, user, streakDays = [], goals = [], debts = [], hideAmounts = false, emergencyBrakeUntil } = state;
  const cur = user.currency;
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const balance  = totalInc - totalExp;
  const savePct  = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
  const ct = {};
  expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
  const maxCat = Math.max(...Object.values(ct), 1);
  const { total: sc, grade } = score(expenses, totalInc, budgets, debts, goals);
  const trafficLight = getTrafficLight(balance, totalInc);
  const alerts = Object.entries(budgets)
    .map(([cat, lim]) => ({ cat, pct: ((ct[cat] || 0) / lim) * 100 }))
    .filter(a => a.pct >= 70)
    .sort((a, b) => b.pct - a.pct);
  const runway   = calcRunway(balance, expenses);
  const isSurvival = survivalMode(expenses, income, DAY);
  const emergencyBrakeActive = isEmergencyBrakeActive(emergencyBrakeUntil);

  const [showFAB,         setShowFAB]         = useState(false);
  const [showHistorial,   setShowHistorial]   = useState(false);
  const [showIngresos,    setShowIngresos]    = useState(false);
  const [showEmergency,   setShowEmergency]   = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: isSurvival ? "#0A0006" : C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

          {/* Header con Score */}
          <FadeIn delay={0}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ScoreCircle score={sc} grade={grade} size={56} showPulse={sc < 40} />
                <View>
                  <Text style={{ fontSize: 12, color: C.t3, letterSpacing: 0.5 }}>Hola, <Text style={{ color: C.t2, fontWeight: "600" }}>{user.name}</Text> 👋</Text>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Mi<Text style={{ color: isSurvival ? C.rose : C.mint }}>Finanzas</Text></Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {/* Boton privacidad */}
                <TouchableOpacity onPress={onTogglePrivacy} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: hideAmounts ? C.mintBg2 : C.card2, borderWidth: 1, borderColor: hideAmounts ? C.mint : C.border2, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>{hideAmounts ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openSettings} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>

          {/* FRENO DE EMERGENCIA BANNER */}
          {emergencyBrakeActive && (
            <FadeIn delay={30}>
              <TouchableOpacity onPress={() => setShowEmergency(true)} style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: C.roseBg2, borderWidth: 1.5, borderColor: C.rose + "60", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 24 }}>🛑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: C.rose }}>FRENO DE EMERGENCIA ACTIVO</Text>
                  <Text style={{ fontSize: 11, color: C.t2 }}>Ocio, Suscripciones y Lujos bloqueados</Text>
                </View>
                <Text style={{ fontSize: 12, color: C.rose, fontWeight: "700" }}>Ver →</Text>
              </TouchableOpacity>
            </FadeIn>
          )}

          {/* MODO SUPERVIVENCIA — banner urgente */}
          {isSurvival && !emergencyBrakeActive && (
            <FadeIn delay={50}>
              <TouchableOpacity onPress={() => setShowEmergency(true)} style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 18, backgroundColor: C.roseBg2,
                borderWidth: 1.5, borderColor: C.rose + "60", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 28 }}>🚨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: C.rose, letterSpacing: -0.3 }}>MODO SUPERVIVENCIA</Text>
                  <Text style={{ fontSize: 11, color: C.t2, marginTop: 2, lineHeight: 16 }}>Has gastado el 80%+. Activa el freno de emergencia.</Text>
                </View>
                <View style={{ backgroundColor: C.rose, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>Activar</Text>
                </View>
              </TouchableOpacity>
            </FadeIn>
          )}

          {/* Hero Balance con Semaforo */}
          <FadeIn delay={80}>
            <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 24, overflow: "hidden", borderWidth: 1,
              borderColor: trafficLight.color + "50",
              shadowColor: trafficLight.color,
              shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8 }}>
              <View style={{ backgroundColor: trafficLight.status === "red" ? "#140008" : trafficLight.status === "yellow" ? "#14100A" : "#00140F", padding: 20, paddingBottom: 0 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 10, color: trafficLight.color, letterSpacing: 3, fontWeight: "700" }}>BALANCE DISPONIBLE</Text>
                      <View style={{ backgroundColor: trafficLight.color + "25", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, color: trafficLight.color, fontWeight: "800" }}>{trafficLight.label}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 42, fontWeight: "900", color: trafficLight.color, letterSpacing: -2, lineHeight: 48 }}>
                      {money(balance, cur, hideAmounts)}
                    </Text>
                  </View>
                  {/* Runway badge */}
                  {runway !== null && (
                    <TouchableOpacity style={{ backgroundColor: (runway < 15 ? C.rose : runway < 30 ? C.gold : C.mint) + "20",
                      borderRadius: 14, borderWidth: 1, borderColor: (runway < 15 ? C.rose : runway < 30 ? C.gold : C.mint) + "45",
                      padding: 10, alignItems: "center" }}>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: runway < 15 ? C.rose : runway < 30 ? C.gold : C.mint }}>{runway}</Text>
                      <Text style={{ fontSize: 8, color: C.t3, letterSpacing: 1, fontWeight: "700" }}>DÍAS</Text>
                      <Text style={{ fontSize: 8, color: C.t3, letterSpacing: 0.5 }}>RUNWAY</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ marginTop: 14, marginBottom: 0 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, color: C.t3 }}>Tasa de ahorro</Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: savePct >= 20 ? C.mint : savePct >= 10 ? C.gold : C.rose }}>{savePct}%</Text>
                  </View>
                  <Bar pct={savePct} color={savePct >= 20 ? C.mint : savePct >= 10 ? C.gold : C.rose} h={6} showGlow />
                </View>
              </View>
              {/* Stats row */}
              <View style={{ backgroundColor: trafficLight.status === "red" ? "#1A0010" : trafficLight.status === "yellow" ? "#1A1408" : "#001A14", flexDirection: "row", borderTopWidth: 1, borderTopColor: trafficLight.color + "20" }}>
                <TouchableOpacity onPress={() => setShowIngresos(true)} style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderRightWidth: 1, borderRightColor: trafficLight.color + "20" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: C.mint }}>{money(totalInc, cur, hideAmounts)}</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Ingresos ✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHistorial(true)} style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderRightWidth: 1, borderRightColor: trafficLight.color + "20" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: C.rose }}>{money(totalExp, cur, hideAmounts)}</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Gastos 📋</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: savePct >= 20 ? C.gold : C.t2 }}>{savePct}%</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Ahorro</Text>
                </View>
              </View>
            </View>
          </FadeIn>

          {/* Acciones Rapidas */}
          <FadeIn delay={100}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 10, paddingRight: 16 }}>
                <TouchableOpacity onPress={() => setShowEmergency(true)} style={{ backgroundColor: emergencyBrakeActive ? C.roseBg2 : C.card, borderRadius: 14, borderWidth: 1, borderColor: emergencyBrakeActive ? C.rose + "50" : C.border, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>🚨</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: emergencyBrakeActive ? C.rose : C.t2 }}>Freno</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSubscriptions(true)} style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>✂️</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.t2 }}>Suscripciones</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </FadeIn>

          {/* Alertas */}
          {alerts.length > 0 && (
            <FadeIn delay={160}>
              <Card danger={alerts.some(a => a.pct > 100)} style={{ marginBottom: 14, borderColor: C.gold + "45" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.goldBg2, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16 }}>⚡</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.gold }}>Alertas de Presupuesto</Text>
                </View>
                {alerts.map(({ cat, pct }, idx) => (
                  <View key={cat}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <CatIcon cat={cat} size={36} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: C.t1 }}>{cat}</Text>
                          <Tag label={Math.round(pct) + "%"} color={pct > 100 ? C.rose : C.gold} />
                        </View>
                        <Bar pct={pct} color={CATS[cat]?.color} h={6} showGlow />
                      </View>
                    </View>
                    {idx < alerts.length - 1 && <Divider />}
                  </View>
                ))}
              </Card>
            </FadeIn>
          )}

          {/* Gastos del mes */}
          {Object.keys(ct).length > 0 && (
            <FadeIn delay={200}>
              <Card style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Gastos del mes</Text>
                  <Tag label={money(totalExp, cur, hideAmounts)} color={C.rose} />
                </View>
                {Object.entries(ct).sort((a, b) => b[1] - a[1]).map(([cat, amt], idx) => {
                  const info = CATS[cat] || CATS["Otro"];
                  const pct = totalExp > 0 ? (amt / totalExp) * 100 : 0;
                  return (
                    <View key={cat} style={{ marginBottom: idx < Object.keys(ct).length - 1 ? 14 : 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 }}>
                        <CatIcon cat={cat} size={38} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: C.t2 }}>{cat}</Text>
                            <Text style={{ fontSize: 13, fontWeight: "800", color: C.t1 }}>{money(amt, cur, hideAmounts)}</Text>
                          </View>
                          <Bar pct={(amt / maxCat) * 100} color={info.color} h={5} showGlow />
                        </View>
                        <Text style={{ fontSize: 11, color: C.t3, width: 34, textAlign: "right" }}>{Math.round(pct)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </Card>
            </FadeIn>
          )}

          {/* Últimos movimientos */}
          <FadeIn delay={240}>
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Últimos movimientos</Text>
                {expenses.length > 0
                  ? <TouchableOpacity onPress={() => setShowHistorial(true)}>
                      <Tag label={"Ver todos (" + expenses.length + ")"} color={C.sky} />
                    </TouchableOpacity>
                  : null}
              </View>

              {expenses.length === 0 ? (
                <View style={{ paddingVertical: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 80, marginBottom: 10 }}>
                    {[40, 65, 30, 80, 50, 70, 45].map((h, i) => (
                      <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 80 }}>
                        <View style={{ width: "100%", height: h, borderRadius: 8, backgroundColor: C.mint + "15",
                          borderWidth: 1, borderColor: C.mint + "25", borderStyle: "dashed" }} />
                      </View>
                    ))}
                  </View>
                  <View style={{ alignItems: "center", paddingVertical: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: C.mint, letterSpacing: -0.3 }}>Tu potencial de ahorro aqui</Text>
                    <Text style={{ fontSize: 11, color: C.t3, marginTop: 4, textAlign: "center", lineHeight: 17 }}>
                      Cada gasto registrado construye{"\n"}tu mapa financiero real.
                    </Text>
                    <TouchableOpacity onPress={() => setShowFAB(true)} style={{ marginTop: 14, backgroundColor: C.mintBg2,
                      borderRadius: 12, borderWidth: 1, borderColor: C.mint + "45", paddingHorizontal: 18, paddingVertical: 9 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.mint }}>+ Registrar primer gasto</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                expenses.slice(0, 6).map((e, i) => {
                  const info = CATS[e.cat] || CATS["Otro"];
                  return (
                    <View key={e.id}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: info.color + "18",
                          borderWidth: 1, borderColor: info.color + "30", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 20 }}>{info.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }} numberOfLines={1}>{e.desc}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: info.color }} />
                            <Text style={{ fontSize: 10, color: C.t3 }}>{e.cat} · {e.date}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "800", color: C.rose }}>-{money(e.amount, cur, hideAmounts)}</Text>
                      </View>
                      {i < Math.min(expenses.length, 6) - 1 && <View style={{ height: 1, backgroundColor: C.border, marginVertical: 11, marginLeft: 56 }} />}
                    </View>
                  );
                })
              )}
            </Card>
          </FadeIn>

        </ScrollView>
      </SafeAreaView>

      {/* FAB Modal */}
      <FABModal 
        visible={showFAB} 
        onClose={() => setShowFAB(false)} 
        onSave={onAddExpense} 
        cur={cur} 
        goals={goals}
        emergencyBrakeActive={emergencyBrakeActive}
        onRoundUp={onRoundUp}
      />
      <HistorialModal visible={showHistorial} onClose={() => setShowHistorial(false)}
        expenses={expenses} onDelete={onDeleteExpense} cur={cur} hideAmounts={hideAmounts} />
      <IngresosModal visible={showIngresos} onClose={() => setShowIngresos(false)}
        income={income} onSave={onUpdateIncome} cur={cur} hideAmounts={hideAmounts} />
      <EmergencyBrakeModal 
        visible={showEmergency} 
        onClose={() => setShowEmergency(false)} 
        onActivate={onActivateEmergencyBrake}
        brakeUntil={emergencyBrakeUntil}
      />
      <SubscriptionsModal 
        visible={showSubscriptions} 
        onClose={() => setShowSubscriptions(false)} 
        expenses={expenses}
        cur={cur}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// ESTRATEGIA SCREEN (Metas + Deudas Unificado)
// ─────────────────────────────────────────────
function EstrategiaScreen({ state, setGoals, setDebts }) {
  const { user, goals, debts, income } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  
  const [view, setView] = useState("resumen"); // resumen | metas | deudas
  const [addingGoal, setAddingGoal] = useState(false);
  const [addingDebt, setAddingDebt] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", emoji: "🎯", target: "", weeks: "24" });
  const [debtForm, setDebtForm] = useState({ type: "tarjeta", name: "", balance: "", rate: "", minPay: "" });
  
  const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = goals.reduce((a, g) => a + g.target, 0);
  const netWorth = totalSaved - totalDebt;
  
  const DEBT_TYPES = [
    { id: "tarjeta",  icon: "💳", label: "Tarjeta",  color: C.rose   },
    { id: "prestamo", icon: "🏦", label: "Prestamo", color: C.gold   },
    { id: "hipoteca", icon: "🏠", label: "Hipoteca", color: C.sky    },
    { id: "auto",     icon: "🚗", label: "Auto",     color: C.violet },
    { id: "informal", icon: "🤝", label: "Informal", color: C.green  },
  ];
  
  const goalColors = [C.sky, C.mint, C.violet, C.gold, C.orange, C.pink];
  
  const addGoal = () => {
    if (!goalForm.name || !goalForm.target) return;
    setGoals([...goals, { 
      id: Date.now(), 
      name: goalForm.name, 
      emoji: goalForm.emoji, 
      target: +goalForm.target, 
      saved: 0, 
      weeks: +goalForm.weeks 
    }]);
    setAddingGoal(false);
    setGoalForm({ name: "", emoji: "🎯", target: "", weeks: "24" });
  };
  
  const addDebt = () => {
    if (!debtForm.name || !debtForm.balance) return;
    const t = DEBT_TYPES.find(x => x.id === debtForm.type) || DEBT_TYPES[0];
    setDebts([...debts, { 
      id: Date.now(), 
      ...debtForm, 
      balance: +debtForm.balance, 
      rate: +debtForm.rate || 0, 
      minPay: +debtForm.minPay || 0,
      color: t.color 
    }]);
    setAddingDebt(false);
    setDebtForm({ type: "tarjeta", name: "", balance: "", rate: "", minPay: "" });
  };
  
  const addToGoal = (goalId, amount) => {
    setGoals(goals.map(g => g.id === goalId ? { ...g, saved: g.saved + amount } : g));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <Section sup="PATRIMONIO" title="Mi Estrategia 📊" />
      
      {/* Tabs */}
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 14, backgroundColor: C.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border }}>
        {[["resumen","📊 Resumen"],["metas","🎯 Metas"],["deudas","💳 Deudas"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setView(id)} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: view === id ? C.mintBg2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: view === id ? C.mint : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        
        {/* RESUMEN */}
        {view === "resumen" && (
          <>
            {/* Patrimonio Neto */}
            <Card accent accentColor={netWorth >= 0 ? C.mint : C.rose} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2, marginBottom: 4 }}>PATRIMONIO NETO</Text>
              <Text style={{ fontSize: 36, fontWeight: "900", color: netWorth >= 0 ? C.mint : C.rose, letterSpacing: -1 }}>
                {netWorth >= 0 ? "" : "-"}{money(Math.abs(netWorth), cur)}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 16, backgroundColor: C.card2, borderRadius: 12, overflow: "hidden" }}>
                <View style={{ flex: 1, paddingVertical: 12, alignItems: "center", borderRightWidth: 1, borderRightColor: C.border }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: C.mint }}>{money(totalSaved, cur)}</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Ahorrado</Text>
                </View>
                <View style={{ flex: 1, paddingVertical: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: C.rose }}>{money(totalDebt, cur)}</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Deudas</Text>
                </View>
              </View>
            </Card>
            
            {/* Metas Preview */}
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Metas de Ahorro</Text>
                <TouchableOpacity onPress={() => setView("metas")}>
                  <Tag label={goals.length + " activas"} color={C.sky} />
                </TouchableOpacity>
              </View>
              {goals.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🎯</Text>
                  <Text style={{ fontSize: 13, color: C.t3 }}>Sin metas definidas</Text>
                </View>
              ) : (
                goals.slice(0, 3).map((g, i) => {
                  const pct = Math.min((g.saved / g.target) * 100, 100);
                  const col = goalColors[i % goalColors.length];
                  return (
                    <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: i < Math.min(goals.length, 3) - 1 ? 12 : 0 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: col + "20", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 18 }}>{g.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: C.t1 }}>{g.name}</Text>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: col }}>{Math.round(pct)}%</Text>
                        </View>
                        <Bar pct={pct} color={col} h={5} />
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
            
            {/* Deudas Preview */}
            <Card style={{ marginBottom: 14, borderColor: totalDebt > 0 ? C.rose + "30" : C.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Deudas</Text>
                <TouchableOpacity onPress={() => setView("deudas")}>
                  <Tag label={debts.length + " activas"} color={C.rose} />
                </TouchableOpacity>
              </View>
              {debts.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🎉</Text>
                  <Text style={{ fontSize: 13, color: C.mint, fontWeight: "600" }}>Sin deudas</Text>
                </View>
              ) : (
                debts.slice(0, 3).map((d, i) => {
                  const t = DEBT_TYPES.find(x => x.id === d.type) || DEBT_TYPES[0];
                  return (
                    <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: i < Math.min(debts.length, 3) - 1 ? 12 : 0 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.color + "20", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: C.t1 }}>{d.name}</Text>
                        <Text style={{ fontSize: 11, color: C.t3 }}>{d.rate}% anual</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: C.rose }}>{money(d.balance, cur)}</Text>
                    </View>
                  );
                })
              )}
            </Card>
          </>
        )}
        
        {/* METAS */}
        {view === "metas" && (
          <>
            {goals.length === 0 && !addingGoal ? (
              <Card style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1, marginBottom: 6 }}>Sin metas aun</Text>
                <Text style={{ fontSize: 13, color: C.t3, textAlign: "center", marginBottom: 24 }}>Define tu primer objetivo de ahorro</Text>
                <Btn label="+ Nueva meta" onPress={() => setAddingGoal(true)} style={{ paddingHorizontal: 24 }} />
              </Card>
            ) : (
              <>
                {goals.map((g, i) => {
                  const pct = Math.min((g.saved / g.target) * 100, 100);
                  const col = goalColors[i % goalColors.length];
                  const weekly = Math.ceil((g.target - g.saved) / Math.max(g.weeks, 1));
                  return (
                    <Card key={g.id} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: col + "20", borderWidth: 1, borderColor: col + "40", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: C.t1 }}>{g.name}</Text>
                          <Text style={{ fontSize: 12, color: C.t3 }}>{g.weeks} semanas restantes</Text>
                        </View>
                        <TouchableOpacity onPress={() => setGoals(goals.filter(x => x.id !== g.id))} style={{ padding: 8 }}>
                          <Text style={{ color: C.t4, fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ fontSize: 12, color: C.t3 }}>{money(g.saved, cur)} de {money(g.target, cur)}</Text>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: col }}>{Math.round(pct)}%</Text>
                        </View>
                        <Bar pct={pct} color={col} h={8} showGlow />
                      </View>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1, backgroundColor: col + "15", borderRadius: 10, padding: 10 }}>
                          <Text style={{ fontSize: 10, color: C.t3 }}>Ahorro semanal</Text>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: col }}>{money(weekly, cur)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => {
                          Alert.prompt("Agregar ahorro", `Cuanto agregaste a "${g.name}"?`, [
                            { text: "Cancelar", style: "cancel" },
                            { text: "Agregar", onPress: (val) => val && addToGoal(g.id, +val) }
                          ], "plain-text", "", "numeric");
                        }} style={{ backgroundColor: col, borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#000", fontWeight: "800", fontSize: 13 }}>+ Agregar</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  );
                })}
                
                {addingGoal ? (
                  <Card>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nueva meta</Text>
                    <Input value={goalForm.name} onChange={v => setGoalForm({ ...goalForm, name: v })} placeholder="Nombre (ej: Fondo Emergencia...)" />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        {["🎯", "🏠", "✈️", "🚗", "💻", "📱", "🎓", "💍"].map(e => (
                          <TouchableOpacity key={e} onPress={() => setGoalForm({ ...goalForm, emoji: e })}
                            style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: goalForm.emoji === e ? C.mint : C.border, backgroundColor: goalForm.emoji === e ? C.mintBg : C.card2, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 20 }}>{e}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <Input value={goalForm.target} onChange={v => setGoalForm({ ...goalForm, target: v })} placeholder={`Meta en ${cur}`} numeric />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Btn label="Cancelar" onPress={() => setAddingGoal(false)} ghost style={{ flex: 1 }} />
                      <Btn label="Crear meta" onPress={addGoal} style={{ flex: 2 }} />
                    </View>
                  </Card>
                ) : (
                  <View style={{ marginHorizontal: 16 }}>
                    <Btn label="+ Nueva meta" onPress={() => setAddingGoal(true)} ghost />
                  </View>
                )}
              </>
            )}
          </>
        )}
        
        {/* DEUDAS */}
        {view === "deudas" && (
          <>
            {totalDebt > 0 && (
              <Card style={{ marginBottom: 14, backgroundColor: C.roseBg, borderColor: C.rose + "40" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 1.5, marginBottom: 4 }}>DEUDA TOTAL</Text>
                    <Text style={{ fontSize: 32, fontWeight: "800", color: C.rose, letterSpacing: -0.5 }}>{money(totalDebt, cur)}</Text>
                  </View>
                </View>
              </Card>
            )}
            
            {debts.length === 0 && !addingDebt ? (
              <Card style={{ alignItems: "center", paddingVertical: 48 }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1, marginBottom: 6 }}>Sin deudas</Text>
                <Text style={{ fontSize: 13, color: C.mint, fontWeight: "600" }}>Excelente senal financiera</Text>
              </Card>
            ) : (
              <>
                {debts.map(d => {
                  const t = DEBT_TYPES.find(x => x.id === d.type) || DEBT_TYPES[0];
                  const mo = payoffMonths(d.balance, d.rate, d.minPay);
                  const tl = mo === Infinity ? "Solo intereses" : mo > 24 ? (mo / 12).toFixed(1) + " años" : mo + " meses";
                  return (
                    <Card key={d.id} style={{ marginBottom: 12, borderLeftWidth: 3, borderLeftColor: t.color }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: t.color + "20", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: "800", color: C.t1 }}>{d.name}</Text>
                          <Tag label={t.label} color={t.color} size="sm" />
                        </View>
                        <TouchableOpacity onPress={() => setDebts(debts.filter(x => x.id !== d.id))} style={{ padding: 8 }}>
                          <Text style={{ color: C.t4, fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: "row", backgroundColor: C.card2, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                        {[["Saldo", money(d.balance, cur), C.rose], ["Tasa", d.rate + "%", C.gold], ["Min/mes", money(d.minPay, cur), C.t1]].map(([l, v, c], i) => (
                          <View key={l} style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.border }}>
                            <Text style={{ fontSize: 12, fontWeight: "800", color: c }}>{v}</Text>
                            <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{l}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={{ backgroundColor: t.color + "15", borderRadius: 10, padding: 10 }}>
                        <Text style={{ fontSize: 12, color: C.t2 }}>⏱ Libre en: <Text style={{ color: t.color, fontWeight: "700" }}>{tl}</Text></Text>
                      </View>
                    </Card>
                  );
                })}
                
                {addingDebt ? (
                  <Card>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Nueva deuda</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                      {DEBT_TYPES.map(t => (
                        <TouchableOpacity key={t.id} onPress={() => setDebtForm({ ...debtForm, type: t.id })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: debtForm.type === t.id ? t.color : C.border, backgroundColor: debtForm.type === t.id ? t.color + "20" : C.card }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: debtForm.type === t.id ? t.color : C.t3 }}>{t.icon} {t.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Input placeholder="Nombre del credito" value={debtForm.name} onChange={v => setDebtForm({ ...debtForm, name: v })} />
                    <Input placeholder="Saldo actual" value={debtForm.balance} onChange={v => setDebtForm({ ...debtForm, balance: v })} numeric />
                    <Input placeholder="Tasa anual (%)" value={debtForm.rate} onChange={v => setDebtForm({ ...debtForm, rate: v })} numeric />
                    <Input placeholder="Pago minimo mensual" value={debtForm.minPay} onChange={v => setDebtForm({ ...debtForm, minPay: v })} numeric />
                    <View style={{ flexDirection: "row", gap: 10 }}>
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
        
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// CHAT IA — Motor completo con acciones
// ─────────────────────────────────────────────
const API_KEY = "TU_API_KEY_AQUI"; // ← Reemplaza con tu key de console.anthropic.com

function ChatScreen({ state, addExpense, onActivateEmergencyBrake, onAddToGoal }) {
  const { user, income, debts, budgets, goals, expenses: allExp, emergencyBrakeUntil } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = allExp.reduce((a, e) => a + e.amount, 0);
  const balance  = totalInc - totalExp;
  const trafficLight = getTrafficLight(balance, totalInc);
  const emergencyBrakeActive = isEmergencyBrakeActive(emergencyBrakeUntil);

  // Construir contexto financiero completo para la IA
  const buildContext = () => {
    const ct = {};
    allExp.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
    const runway = calcRunway(balance, allExp);
    const savePct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
    const debtTotal = debts.reduce((a, d) => a + d.balance, 0);

    return `Eres TARS, el asistente financiero de elite de ${user.name} en Republica Dominicana.
Moneda: ${cur}. Fecha actual: ${new Date().toLocaleDateString("es-DO", { weekday:"long", day:"numeric", month:"long" })}.

SITUACION FINANCIERA ACTUAL:
- Balance disponible: ${money(balance, cur)} (Estado: ${trafficLight.label})
- Ingresos mensuales: ${money(totalInc, cur)}
- Gastos del mes: ${money(totalExp, cur)}
- Tasa de ahorro: ${savePct}%
- Dias de runway: ${runway ?? "N/A"} dias
- Deuda total: ${money(debtTotal, cur)}
- Freno de emergencia: ${emergencyBrakeActive ? "ACTIVO" : "Disponible"}
- Gastos por categoria: ${JSON.stringify(ct)}

INSTRUCCIONES:
- Responde SIEMPRE en español dominicano coloquial con emojis
- Maximo 3 parrafos cortos, directos y accionables
- Si el estado es "Alerta" (rojo), sugiere activar el freno de emergencia
- Si detectas gasto de lujo (>RD$2000 en Ocio/Lujos), menciona las horas de trabajo que cuesta
- Se brutalmente honesto pero motivador`;
  };

  const WELCOME = `¡Que lo que, ${user.name}! 🚀 Soy TARS, tu asesor financiero.

Tu situacion:
💰 Balance: ${money(balance, cur)} (${trafficLight.emoji} ${trafficLight.label})
📊 Ahorro: ${totalInc > 0 ? Math.round((balance/totalInc)*100) : 0}%

Puedo ayudarte con:
• "Gaste 800 en gasolina"
• "¿Como voy este mes?"
• "Activa el freno de emergencia"
• "Cuanto ahorro si cancelo Netflix?"`;

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

    const low = msg.toLowerCase();

    // Comandos especiales con acciones
    if (/freno|emergencia|bloquear|parar/.test(low) && !emergencyBrakeActive) {
      setMsgs(m => [...m, { 
        bot: true, 
        text: "🚨 ¿Quieres activar el Freno de Emergencia?\n\nEsto bloqueara gastos en Ocio, Suscripciones y Lujos por 48 horas.",
        action: { type: "emergency_brake", label: "🛑 Activar Freno 48h" }
      }]);
      setLoading(false);
      return;
    }

    // NLP local para gastos
    const { amount, cat, desc } = nlp(msg);
    if (amount && (amount > 0 || /gast|pag|compre/.test(low))) {
      const today = new Date().toISOString().split("T")[0];
      const expense = { id: Date.now(), desc, amount, cat, date: today };
      addExpense(expense);
      
      const hours = lifeHours(amount, totalInc);
      const hoursText = hours ? ` Eso son ${hours} horas de tu trabajo 💼.` : "";
      
      setMsgs(m => [...m, { 
        bot: true, 
        text: `✅ Registrado: ${money(amount, cur)} en ${cat}.${hoursText}\n\nNuevo balance: ${money(balance - amount, cur)}`
      }]);
      setLoading(false);
      return;
    }

    // Sugerencias de ahorro
    if (goals.length > 0 && /ahorra|mover|transferir/.test(low)) {
      const goal = goals[0];
      setMsgs(m => [...m, { 
        bot: true, 
        text: `💰 ¿Quieres agregar dinero a tu meta "${goal.emoji} ${goal.name}"?\n\nProgreso actual: ${Math.round((goal.saved / goal.target) * 100)}%`,
        action: { type: "add_saving", goalId: goal.id, label: `+ Agregar a ${goal.name}` }
      }]);
      setLoading(false);
      return;
    }

    // Respuesta generica mejorada
    const responses = [
      `📊 Tu balance esta en ${trafficLight.label}. ${trafficLight.status === "red" ? "Te recomiendo activar el freno de emergencia." : "Vas bien, sigue asi!"}`,
      `💡 Este mes llevas ${money(totalExp, cur)} gastados. ${totalInc > 0 && (totalExp / totalInc) > 0.8 ? "Cuidado, estas gastando mas del 80% de tus ingresos." : "Mantente dentro del presupuesto."}`,
      `🎯 ${goals.length > 0 ? `Tienes ${goals.length} metas activas. La mas cercana es "${goals[0]?.name}" al ${Math.round((goals[0]?.saved / goals[0]?.target) * 100)}%.` : "Considera crear una meta de ahorro para mantenerte motivado."}`,
    ];
    
    setMsgs(m => [...m, { bot: true, text: responses[Math.floor(Math.random() * responses.length)] }]);
    setLoading(false);
  };

  // Ejecutar accion desde el chat
  const executeAction = (action) => {
    if (action.type === "emergency_brake") {
      onActivateEmergencyBrake();
      setMsgs(m => [...m, { bot: true, text: "✅ Freno de emergencia activado por 48 horas. Las categorias de Ocio, Suscripciones y Lujos estan bloqueadas." }]);
    } else if (action.type === "add_saving") {
      Alert.prompt("Agregar ahorro", "¿Cuanto quieres agregar?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Agregar", onPress: (val) => {
          if (val && +val > 0) {
            onAddToGoal(action.goalId, +val);
            setMsgs(m => [...m, { bot: true, text: `✅ Agregaste ${money(+val, cur)} a tu meta!` }]);
          }
        }}
      ], "plain-text", "", "numeric");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.mintBg2, borderWidth: 1, borderColor: C.mint + "50", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: C.t1 }}>TARS</Text>
          <Text style={{ fontSize: 11, color: C.mint }}>Tu asesor financiero IA</Text>
        </View>
        <View style={{ backgroundColor: trafficLight.color + "20", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, color: trafficLight.color, fontWeight: "700" }}>{trafficLight.emoji} {trafficLight.label}</Text>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {msgs.map((m, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <View style={{ alignSelf: m.bot ? "flex-start" : "flex-end", maxWidth: "85%",
              backgroundColor: m.bot ? C.card : C.mint, borderRadius: 18, padding: 14,
              borderWidth: 1, borderColor: m.bot ? C.border : C.mint,
              borderBottomLeftRadius: m.bot ? 4 : 18, borderBottomRightRadius: m.bot ? 18 : 4 }}>
              <Text style={{ fontSize: 14, color: m.bot ? C.t1 : "#000", lineHeight: 20 }}>{m.text}</Text>
              
              {/* Boton de accion */}
              {m.action && (
                <TouchableOpacity 
                  onPress={() => executeAction(m.action)} 
                  style={{ marginTop: 12, backgroundColor: m.action.type === "emergency_brake" ? C.rose : C.mint, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{m.action.label}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {loading && (
          <View style={{ alignSelf: "flex-start", backgroundColor: C.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.border }}>
            <ActivityIndicator size="small" color={C.mint} />
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 24, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border }}>
          <Input value={input} onChange={setInput} placeholder="Escribe algo..." style={{ flex: 1, marginBottom: 0 }} />
          <TouchableOpacity onPress={send} disabled={loading} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: C.mint, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20, color: "#000" }}>➤</Text>
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
  const { user, income, budgets } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const [name,       setName]      = useState(user.name);
  const [salary,     setSalary]    = useState(totalInc > 0 ? String(totalInc) : "");
  const [savingGoal, setSavingGoal]= useState(String(user.savingGoalPct || 20));
  const [buds,       setBuds]      = useState({ ...budgets });

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
      <View style={{ backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: C.border, maxHeight: "90%" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1 }}>Centro de Mando ⚙️</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 22, color: C.t3 }}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* TEMA */}
          <Text style={[styles.lbl, { marginBottom: 10 }]}>APARIENCIA</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {[[true, "🌙", "Oscuro"], [false, "☀️", "Claro"]].map(([dark, ic, label]) => (
              <TouchableOpacity key={label} onPress={() => onToggleTheme(dark)}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 2, alignItems: "center", gap: 4,
                  borderColor: isDark === dark ? C.mint : C.border,
                  backgroundColor: isDark === dark ? C.mintBg2 : C.card2 }}>
                <Text style={{ fontSize: 24 }}>{ic}</Text>
                <Text style={{ fontSize: 12, fontWeight: "800", color: isDark === dark ? C.mint : C.t3 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.lbl, { marginBottom: 6 }]}>TU NOMBRE</Text>
          <Input value={name} onChange={setName} placeholder="Tu nombre" />

          <Text style={[styles.lbl, { marginTop: 12, marginBottom: 6 }]}>INGRESO MENSUAL ({cur})</Text>
          <Input value={salary} onChange={setSalary} placeholder="ej: 45000" numeric />

          <Text style={[styles.lbl, { marginTop: 12, marginBottom: 6 }]}>META DE AHORRO (%)</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {["10","20","30","40","50"].map(p => (
              <TouchableOpacity key={p} onPress={() => setSavingGoal(p)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, alignItems: "center",
                  borderColor: savingGoal === p ? C.mint : C.border,
                  backgroundColor: savingGoal === p ? C.mintBg : C.card2 }}>
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
// NAV BAR — 3 Tabs
// ─────────────────────────────────────────────
function NavBar({ tab, setTab, isDark }) {
  const insets = useSafeAreaInsets();
  const items = [
    { id: "home",       icon: "🏠", label: "Inicio"     },
    { id: "estrategia", icon: "📊", label: "Estrategia" },
    { id: "chat",       icon: "🤖", label: "Asistente"  },
  ];
  return (
    <View style={{ flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border2,
      paddingTop: 4, paddingBottom: insets.bottom + 8 }}>
      {items.map(item => {
        const active = tab === item.id;
        return (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4, position: "relative" }} activeOpacity={0.7}>
            {active && <View style={{ position: "absolute", top: 0, width: 36, height: 2.5, backgroundColor: C.mint, borderRadius: 99 }} />}
            <View style={{ marginTop: 6, width: 36, height: 28, alignItems: "center", justifyContent: "center",
              backgroundColor: active ? C.mintBg2 : "transparent", borderRadius: 10 }}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <Text style={{ fontSize: 9, fontWeight: "700", color: active ? C.mint : C.t3, marginTop: 2, letterSpacing: 0.5 }}>{item.label}</Text>
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
  const [appState,      setAppState]      = useState(null);
  const [tab,           setTab]           = useState("home");
  const [showSettings,  setShowSettings]  = useState(false);
  const [showFABGlobal, setShowFABGlobal] = useState(false);
  const [isDark,        setIsDark]        = useState(true);
  const [themeKey,      setThemeKey]      = useState(0);
  const saveTimer = useRef(null);

  // Aplicar tema al montar y cuando cambia
  useEffect(() => {
    applyTheme(isDark);
    setThemeKey(k => k + 1);
  }, [isDark]);

  // Cargar al iniciar
  useEffect(() => {
    loadApp().then(saved => {
      if (saved && saved.onboarded && saved.user) {
        if (saved.user.darkMode === false) {
          setIsDark(false);
          applyTheme(false);
        }
        setAppState(saved);
      } else {
        setAppState({ onboarded: false });
      }
    }).catch(() => {
      setAppState({ onboarded: false });
    });
  }, []);

  // Guardar con debounce
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

  // Cambiar tema
  function toggleTheme(dark) {
    setIsDark(dark);
    applyTheme(dark);
    updateState({ user: { ...appState.user, darkMode: dark } });
  }

  // Toggle privacidad
  function togglePrivacy() {
    updateState({ hideAmounts: !appState.hideAmounts });
    Vibration.vibrate(30);
  }

  // Activar freno de emergencia (48 horas)
  function activateEmergencyBrake() {
    const brakeUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    updateState({ emergencyBrakeUntil: brakeUntil });
    Vibration.vibrate([0, 100, 50, 100]);
    Alert.alert("🛑 Freno Activado", "Las categorias de Ocio, Suscripciones y Lujos estan bloqueadas por 48 horas.");
  }

  // Agregar a meta (round-up o desde chat)
  function addToGoal(goalId, amount) {
    const goals = (appState.goals || []).map(g => 
      g.id === goalId ? { ...g, saved: g.saved + amount } : g
    );
    updateState({ goals });
  }

  // Onboarding completado
  function onDone(data) {
    const next = {
      onboarded: true,
      user:      { ...data.user, darkMode: true },
      expenses:  [],
      goals:     data.goals,
      debts:     [],
      income:    data.income,
      reminders: [],
      budgets:   data.budgets,
      streakDays:[],
      hideAmounts: false,
      emergencyBrakeUntil: null,
    };
    saveApp(next).then(() => {
      setAppState(next);
    }).catch(() => {
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

  const addExpenseWithStreak = (e) => {
    const today = new Date().toISOString().split("T")[0];
    const streak = s.streakDays || [];
    const newStreak = streak.includes(today) ? streak : [...streak, today];
    updateState({ expenses: [e, ...s.expenses], streakDays: newStreak });
  };

  const deleteExpense = (id) => {
    updateState({ expenses: s.expenses.filter(e => e.id !== id) });
  };

  const updateIncome = (inc) => updateState({ income: inc });
  const setGoals = (g) => updateState({ goals: g });
  const setDebts = (d) => updateState({ debts: d });

  return (
    <SafeAreaProvider key={themeKey}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />
        
        {tab === "home" && (
          <HomeScreen 
            state={s} 
            openSettings={() => setShowSettings(true)}
            onAddExpense={addExpenseWithStreak} 
            onUpdateIncome={updateIncome} 
            onDeleteExpense={deleteExpense}
            onTogglePrivacy={togglePrivacy}
            onActivateEmergencyBrake={activateEmergencyBrake}
            onRoundUp={addToGoal}
          />
        )}
        {tab === "estrategia" && (
          <EstrategiaScreen 
            state={s} 
            setGoals={setGoals} 
            setDebts={setDebts} 
          />
        )}
        {tab === "chat" && (
          <ChatScreen 
            state={s} 
            addExpense={addExpenseWithStreak}
            onActivateEmergencyBrake={activateEmergencyBrake}
            onAddToGoal={addToGoal}
          />
        )}
        
        <NavBar tab={tab} setTab={setTab} isDark={isDark} />
        
        {tab !== "chat" && <FAB onPress={() => setShowFABGlobal(true)} />}
        
        <FABModal 
          visible={showFABGlobal} 
          onClose={() => setShowFABGlobal(false)} 
          onSave={addExpenseWithStreak} 
          cur={s.user?.currency || "RD$"} 
          goals={s.goals}
          emergencyBrakeActive={isEmergencyBrakeActive(s.emergencyBrakeUntil)}
          onRoundUp={addToGoal}
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

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  card:    { backgroundColor: C.card, borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 18, marginHorizontal: 16, marginBottom: 12 },
  btn:     { borderRadius: 14, padding: 15, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  btnText: { fontSize: 15, fontWeight: "700" },
  input:   { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, borderRadius: 13, padding: 14, color: C.t1, fontSize: 14, marginBottom: 10 },
  obWrap:  { flex: 1, backgroundColor: C.bg, padding: 24, paddingTop: 52 },
  obH:     { fontSize: 28, fontWeight: "900", color: C.t1, marginBottom: 6, letterSpacing: -0.8 },
  obSub:   { fontSize: 13, color: C.t2, marginBottom: 24, lineHeight: 20 },
  lbl:     { fontSize: 10, color: C.t3, letterSpacing: 2, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
});
