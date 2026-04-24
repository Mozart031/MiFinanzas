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
  Alimentacion:  { icon: "🛒", color: C.mint   },
  Transporte:    { icon: "⛽", color: C.sky    },
  Ocio:          { icon: "🎮", color: C.pink   },
  Salud:         { icon: "💊", color: C.green  },
  Suscripciones: { icon: "📱", color: C.violet },
  Hogar:         { icon: "🏠", color: C.orange },
  Educacion:     { icon: "📚", color: C.gold   },
  Otro:          { icon: "💸", color: C.t3     },
};

// ─────────────────────────────────────────────
// STORAGE — guardado simple y directo
// ─────────────────────────────────────────────
const STORE_KEY = "mifinanzas_v6";

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

// Donut circular para metas / score
function Donut({ pct, size, strokeWidth, color, children }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(pct / 100, 1);
  // SVG-like via borderRadius trick
  const deg = (pct / 100) * 360;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Background ring */}
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: C.border2 }} />
      {/* Progress arc using rotation clipping trick */}
      <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: color,
        borderTopColor: deg > 90 ? color : "transparent",
        borderRightColor: deg > 180 ? color : "transparent",
        borderBottomColor: deg > 270 ? color : "transparent",
        borderLeftColor: deg > 360 ? color : "transparent",
        transform: [{ rotate: "-90deg" }],
        opacity: pct > 0 ? 1 : 0,
      }} />
      <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
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
function CatIcon({ cat, size }) {
  const s = size || 44;
  const info = CATS[cat] || CATS["Otro"];
  return (
    <View style={{ width: s, height: s, borderRadius: s * 0.3, backgroundColor: info.color + "20", borderWidth: 1, borderColor: info.color + "30", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: s * 0.42 }}>{info.icon}</Text>
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
// FAB EXPANDIBLE — 3 opciones + redondeo
// ─────────────────────────────────────────────
function FABModal({ visible, onClose, onSaveExpense, onSaveIncome, onSaveAbono, state }) {
  const cur     = state?.user?.currency || "RD$";
  const goals   = state?.goals || [];
  const debts   = state?.debts || [];
  const income  = state?.income || [];
  const totalInc= income.reduce((a, i) => a + i.amount, 0);

  const [mode,        setMode]        = useState(null); // null | "gasto" | "ingreso" | "abono"
  const [desc,        setDesc]        = useState("");
  const [amount,      setAmount]      = useState("");
  const [cat,         setCat]         = useState("Otro");
  const [roundTarget, setRoundTarget] = useState(null); // meta para redondeo
  const [showRound,   setShowRound]   = useState(false);
  const [roundGoalId, setRoundGoalId] = useState(goals[0]?.id || null);
  const [incSource,   setIncSource]   = useState("");
  const [debtId,      setDebtId]      = useState(debts[0]?.id || null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setMode(null); setDesc(""); setAmount(""); setCat("Otro"); setShowRound(false);
      Animated.spring(slideAnim, { toValue: 0, tension: 62, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 500, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  // Sugerir redondeo cuando cambia el monto
  const suggestedRound = (() => {
    const n = +amount;
    if (!n || n <= 0) return null;
    const next = Math.ceil(n / 100) * 100;
    return next > n ? next - n : null;
  })();

  const saveGasto = () => {
    if (!amount || isNaN(+amount)) return;
    const today = new Date().toISOString().split("T")[0];
    onSaveExpense({ id: Date.now(), desc: desc.trim() || cat, amount: +amount, cat, date: today });
    // Redondeo automático a meta
    if (showRound && suggestedRound && roundGoalId) {
      const g = goals.find(x => x.id === roundGoalId);
      if (g) {
        // guardamos el redondeo como abono a la meta — lo manejará el padre
        onSaveAbono && onSaveAbono(roundGoalId, suggestedRound);
      }
    }
    onClose();
  };

  const saveIngreso = () => {
    if (!amount || isNaN(+amount)) return;
    const today = new Date().toISOString().split("T")[0];
    onSaveIncome({ id: Date.now(), source: incSource.trim() || "Ingreso", amount: +amount, date: today, type: "variable" });
    onClose();
  };

  const saveAbono = () => {
    if (!amount || isNaN(+amount) || !debtId) return;
    onSaveAbono && onSaveAbono(debtId, +amount, "deuda");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "#000000BB", justifyContent: "flex-end" }} onPress={onClose}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }} onStartShouldSetResponder={() => true}>
          <View style={{ backgroundColor: C.card, borderTopLeftRadius: 30, borderTopRightRadius: 30,
            borderWidth: 1, borderColor: C.border2, paddingBottom: 36 }}>
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: C.border2, alignSelf: "center", marginTop: 14, marginBottom: 20 }} />

            {/* Selector de modo si no hay modo elegido */}
            {!mode && (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: C.t1, marginBottom: 20, letterSpacing: -0.5 }}>¿Qué vamos a registrar?</Text>
                {[
                  ["gasto",   "💸", "Registrar Gasto",    "Almuerzo, gasolina, compras...", C.rose  ],
                  ["ingreso", "💰", "Registrar Ingreso",  "Salario extra, freelance...",    C.mint  ],
                  ["abono",   "💳", "Abono a Deuda",      "Pago adelantado a tarjeta...",   C.violet],
                ].map(([m, ic, label, sub, col]) => (
                  <TouchableOpacity key={m} onPress={() => setMode(m)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: col + "14",
                      borderRadius: 18, borderWidth: 1, borderColor: col + "35", padding: 16, marginBottom: 10 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: col + "22", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 24 }}>{ic}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: col }}>{label}</Text>
                      <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{sub}</Text>
                    </View>
                    <Text style={{ marginLeft: "auto", fontSize: 20, color: C.t3 }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* MODO GASTO */}
            {mode === "gasto" && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <TouchableOpacity onPress={() => setMode(null)}>
                    <Text style={{ fontSize: 22, color: C.t3 }}>‹</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: C.t1 }}>💸 Registrar Gasto</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {Object.entries(CATS).map(([key, val]) => (
                      <TouchableOpacity key={key} onPress={() => setCat(key)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5,
                          borderColor: cat === key ? val.color : C.border,
                          backgroundColor: cat === key ? val.color + "22" : C.card2 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: cat === key ? val.color : C.t3 }}>
                          {val.icon} {key}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <Input value={desc} onChange={setDesc} placeholder="Descripción (ej: Almuerzo en Juan Dolio)" />
                <Input value={amount} onChange={setAmount} placeholder={`Monto (${cur})`} numeric />

                {/* Sugerencia de redondeo */}
                {suggestedRound !== null && goals.length > 0 && (
                  <View style={{ backgroundColor: C.mintBg2, borderRadius: 14, borderWidth: 1, borderColor: C.mint + "45", padding: 14, marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: C.mint }}>💡 Redondeo automático</Text>
                        <Text style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>
                          Envia {cur}{suggestedRound} a tu meta de ahorro
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowRound(!showRound)}
                        style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: showRound ? C.mint : C.border2, justifyContent: "center", paddingHorizontal: 3 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff",
                          alignSelf: showRound ? "flex-end" : "flex-start" }} />
                      </TouchableOpacity>
                    </View>
                    {showRound && goals.length > 1 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {goals.map(g => (
                            <TouchableOpacity key={g.id} onPress={() => setRoundGoalId(g.id)}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, borderWidth: 1.5,
                                borderColor: roundGoalId === g.id ? C.mint : C.border,
                                backgroundColor: roundGoalId === g.id ? C.mintBg : C.card2 }}>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: roundGoalId === g.id ? C.mint : C.t3 }}>
                                {g.emoji} {g.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                )}

                <TouchableOpacity onPress={saveGasto}
                  style={{ backgroundColor: C.rose, borderRadius: 16, padding: 15, alignItems: "center",
                    shadowColor: C.rose, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>Registrar Gasto</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MODO INGRESO */}
            {mode === "ingreso" && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <TouchableOpacity onPress={() => setMode(null)}>
                    <Text style={{ fontSize: 22, color: C.t3 }}>‹</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: C.t1 }}>💰 Registrar Ingreso</Text>
                </View>
                <Input value={incSource} onChange={setIncSource} placeholder="Fuente (ej: Freelance, Bono...)" />
                <Input value={amount} onChange={setAmount} placeholder={`Monto (${cur})`} numeric />
                <TouchableOpacity onPress={saveIngreso}
                  style={{ backgroundColor: C.mint, borderRadius: 16, padding: 15, alignItems: "center",
                    shadowColor: C.mint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#000" }}>Registrar Ingreso</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MODO ABONO A DEUDA */}
            {mode === "abono" && (
              <View style={{ paddingHorizontal: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <TouchableOpacity onPress={() => setMode(null)}>
                    <Text style={{ fontSize: 22, color: C.t3 }}>‹</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 17, fontWeight: "900", color: C.t1 }}>💳 Abono a Deuda</Text>
                </View>
                {debts.length === 0 ? (
                  <Text style={{ color: C.t3, textAlign: "center", paddingVertical: 20 }}>No tienes deudas registradas.</Text>
                ) : (
                  <>
                    <View style={{ flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      {debts.map(d => {
                        const t = TYPES.find(x => x.id === d.type) || TYPES[5];
                        return (
                          <TouchableOpacity key={d.id} onPress={() => setDebtId(d.id)}
                            style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5,
                              borderColor: debtId === d.id ? (d.color || t.color) : C.border,
                              backgroundColor: debtId === d.id ? (d.color || t.color) + "18" : C.card2 }}>
                            <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }}>{d.name}</Text>
                              <Text style={{ fontSize: 10, color: C.t3 }}>Saldo: {money(d.balance, cur)}</Text>
                            </View>
                            {debtId === d.id && <Text style={{ color: d.color || t.color, fontSize: 18 }}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Input value={amount} onChange={setAmount} placeholder={`Monto del abono (${cur})`} numeric />
                    <TouchableOpacity onPress={saveAbono}
                      style={{ backgroundColor: C.violet, borderRadius: 16, padding: 15, alignItems: "center",
                        shadowColor: C.violet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>Registrar Abono</Text>
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

// FAB is now embedded in NavBar — see NavBar component

// ─────────────────────────────────────────────
// HISTORIAL MODAL — gastos completos con filtros y eliminar
// ─────────────────────────────────────────────
function HistorialModal({ visible, onClose, expenses, onDelete, cur }) {
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
              <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{filtered.length} movimientos · {money(total, cur)}</Text>
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
                <Text style={{ fontSize: 15, color: C.t3 }}>Sin registros en esta categoría</Text>
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
                      <Text style={{ fontSize: 14, fontWeight: "800", color: C.rose }}>-{money(e.amount, cur)}</Text>
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
function IngresosModal({ visible, onClose, income, onSave, cur }) {
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
              <Text style={{ fontSize: 11, color: C.mint, marginTop: 2, fontWeight: "700" }}>Total: {money(total, cur)}/mes</Text>
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
                <Text style={{ fontSize: 16, fontWeight: "800", color: C.mint }}>{money(inc.amount, cur)}</Text>
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
// UTILIDADES DE RACHA Y RESUMEN
// ─────────────────────────────────────────────

// Devuelve los últimos N días como strings YYYY-MM-DD
function lastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

// Mensaje motivacional basado en racha
function streakMessage(streak, registeredToday) {
  if (!registeredToday && streak === 0) return { msg: "Empieza tu racha hoy 💪", sub: "Registra un gasto para comenzar", color: C.t3, emoji: "🌱" };
  if (!registeredToday && streak > 0) return { msg: `¡No pierdas tu racha de ${streak} días!`, sub: "Registra algo hoy antes de medianoche", color: C.rose, emoji: "⚠️" };
  if (streak >= 30) return { msg: `${streak} días imparable 🔥`, sub: "Eres una máquina financiera. ¡Increíble!", color: C.gold, emoji: "👑" };
  if (streak >= 14) return { msg: `${streak} días en racha`, sub: "Dos semanas seguidas. ¡Eso es hábito!", color: C.orange, emoji: "🔥" };
  if (streak >= 7)  return { msg: `${streak} días seguidos`, sub: "Una semana completa. ¡Sigue así!", color: C.mint, emoji: "🔥" };
  if (streak >= 3)  return { msg: `${streak} días de racha`, sub: "Vas bien, no lo rompas hoy", color: C.mint, emoji: "🔥" };
  if (streak === 1) return { msg: "¡Primer día registrado!", sub: "El primer paso es el más importante", color: C.sky, emoji: "✨" };
  return { msg: "Racha iniciada", sub: "Sigue registrando cada día", color: C.mint, emoji: "🔥" };
}

// Calcula gastos por semana del mes actual
function weeklyBreakdown(expenses) {
  const weeks = [0, 0, 0, 0, 0];
  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth() !== TODAY.getMonth() || d.getFullYear() !== TODAY.getFullYear()) return;
    const wk = Math.min(Math.floor((d.getDate() - 1) / 7), 4);
    weeks[wk] += e.amount;
  });
  return weeks.slice(0, Math.ceil(DAYS_IN_MONTH / 7));
}

// ─────────────────────────────────────────────
// STREAK BANNER — estilo Duolingo
// ─────────────────────────────────────────────
function StreakBanner({ streakDays = [], onPress }) {
  const today     = new Date().toISOString().split("T")[0];
  const streak    = calcStreak(streakDays);
  const regToday  = streakDays.includes(today);
  const { msg, sub, color, emoji } = streakMessage(streak, regToday);
  const last7     = lastNDays(7);

  // Tamaño del fuego según racha
  const fireSize  = streak >= 14 ? 44 : streak >= 7 ? 40 : streak >= 3 ? 36 : 30;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        marginHorizontal: 16, marginBottom: 14, borderRadius: 22,
        borderWidth: 1, borderColor: color + "50",
        backgroundColor: color + "0D",
        shadowColor: color, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2, shadowRadius: 14, elevation: 6,
        overflow: "hidden",
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 12, gap: 14 }}>
        {/* Flame icon con ring */}
        <View style={{
          width: fireSize + 20, height: fireSize + 20, borderRadius: (fireSize + 20) / 2,
          backgroundColor: color + "20", borderWidth: 2, borderColor: color + "45",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: fireSize }}>{emoji}</Text>
        </View>
        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color, letterSpacing: -0.3 }}>{msg}</Text>
          <Text style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 15 }}>{sub}</Text>
        </View>
        {/* Contador grande */}
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color, letterSpacing: -1 }}>{streak}</Text>
          <Text style={{ fontSize: 9, color: C.t3, letterSpacing: 1, fontWeight: "700" }}>DÍAS</Text>
        </View>
      </View>

      {/* Separador */}
      <View style={{ height: 1, backgroundColor: color + "25", marginHorizontal: 16 }} />

      {/* Mini calendario últimos 7 días */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        {last7.map((day, i) => {
          const done      = streakDays.includes(day);
          const isToday   = day === today;
          const dayLabel  = new Date(day + "T12:00:00").toLocaleDateString("es", { weekday: "narrow" });
          const dayNum    = new Date(day + "T12:00:00").getDate();
          return (
            <View key={day} style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 9, color: isToday ? color : C.t3, fontWeight: isToday ? "800" : "400", letterSpacing: 0.5 }}>
                {dayLabel.toUpperCase()}
              </Text>
              <View style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: done ? color : (isToday ? color + "18" : C.card2),
                borderWidth: isToday && !done ? 1.5 : done ? 0 : 1,
                borderColor: isToday && !done ? color + "60" : C.border,
                alignItems: "center", justifyContent: "center",
              }}>
                {done
                  ? <Text style={{ fontSize: 14 }}>🔥</Text>
                  : <Text style={{ fontSize: 12, fontWeight: "700", color: isToday ? color : C.t4 }}>{dayNum}</Text>
                }
              </View>
              {isToday && (
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: done ? color : C.t4 }} />
              )}
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// SEMÁFORO — color reactivo según balance/score
// ─────────────────────────────────────────────
function semaphore(balance, totalInc, sc) {
  if (sc < 40 || (totalInc > 0 && balance <= totalInc * 0.25))
    return { color: "#F44336", label: "Alerta", emoji: "🚨", dark: "#140004" };
  if (totalInc > 0 && balance <= totalInc * 0.5)
    return { color: "#FFC107", label: "Precaución", emoji: "⚠️", dark: "#141000" };
  return { color: "#4CAF50", label: "Disponible", emoji: "✅", dark: "#00140A" };
}

// ─────────────────────────────────────────────
// HOME — Wireframe exacto
// ─────────────────────────────────────────────
function HomeScreen({ state, openSettings, onAddExpense, onUpdateIncome, onDeleteExpense }) {
  const { expenses, income, budgets, user, streakDays = [], goals = [] } = state;
  const cur      = user.currency;
  const totalExp = expenses.reduce((a, e) => a + e.amount, 0);
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const balance  = totalInc - totalExp;
  const savePct  = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
  const { total: sc, grade, s: scoreBreak } = score(expenses, totalInc, budgets);
  const sem      = semaphore(balance, totalInc, sc);
  const runway   = calcRunway(balance, expenses);
  const isSurvival = sc < 40;

  const [balanceHidden, setBalanceHidden] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showIngresos,  setShowIngresos]  = useState(false);

  // Animación de pulso para modo alerta
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (sem.color === "#F44336") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sem.color]);

  // Score circular mini (en header)
  const ScoreCircle = () => {
    const scoreColor = sc >= 70 ? "#4CAF50" : sc >= 40 ? "#FFC107" : "#F44336";
    return (
      <Animated.View style={{ transform: [{ scale: sc < 40 ? pulseAnim : new Animated.Value(1) }] }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 4,
          borderColor: scoreColor, backgroundColor: scoreColor + "18",
          alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: scoreColor, letterSpacing: -0.5 }}>{sc}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: isSurvival ? "#0A0004" : C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

          {/* ── HEADER ── */}
          <FadeIn delay={0}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, gap: 12 }}>
              {/* Avatar + Nombre + Nivel */}
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.card2, borderWidth: 1.5, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 22 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.t3, letterSpacing: 0.3 }}>
                  Nivel <Text style={{ color: C.gold, fontWeight: "700" }}>{Math.floor(sc / 20) + 1}</Text>
                </Text>
                <Text style={{ fontSize: 17, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>
                  Hola, {user.name} 👋
                </Text>
              </View>
              {/* Score Circular — centro del header */}
              <View style={{ alignItems: "center", gap: 3 }}>
                <ScoreCircle />
                <Text style={{ fontSize: 8, color: C.t3, letterSpacing: 0.5, fontWeight: "600" }}>SCORE</Text>
              </View>
              {/* Ajustes */}
              <TouchableOpacity onPress={openSettings}
                style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </FadeIn>

          {/* ── HERO BALANCE ── */}
          <FadeIn delay={60}>
            <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 26, overflow: "hidden",
              borderWidth: 1.5, borderColor: sem.color + "55",
              shadowColor: sem.color, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 24 }}>
              <View style={{ backgroundColor: sem.dark, padding: 22, paddingBottom: 16 }}>
                {/* Fila label + badge estado */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, color: sem.color, letterSpacing: 2.5, fontWeight: "700" }}>BALANCE DISPONIBLE</Text>
                  <Animated.View style={{ transform: [{ scale: sc < 40 ? pulseAnim : new Animated.Value(1) }] }}>
                    <View style={{ backgroundColor: sem.color + "28", borderRadius: 10, borderWidth: 1, borderColor: sem.color + "55",
                      paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: sem.color }}>{sem.label}</Text>
                    </View>
                  </Animated.View>
                </View>
                {/* Monto — tap para ocultar */}
                <TouchableOpacity onPress={() => setBalanceHidden(h => !h)} activeOpacity={0.7}>
                  {balanceHidden ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <View style={{ height: 44, width: 200, borderRadius: 12, backgroundColor: C.border2 }} />
                      <Text style={{ fontSize: 13, color: C.t3 }}>👁 Mostrar</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 46, fontWeight: "900", color: sem.color, letterSpacing: -2, lineHeight: 52, marginBottom: 8 }}>
                      {money(balance, cur)}
                    </Text>
                  )}
                </TouchableOpacity>
                {/* Barra de salud */}
                <Bar pct={Math.max(savePct, 0)} color={sem.color} h={5} showGlow />
              </View>
              {/* Stats row */}
              <View style={{ flexDirection: "row", backgroundColor: sem.color + "10", borderTopWidth: 1, borderTopColor: sem.color + "25" }}>
                {/* Tasa ahorro */}
                <View style={{ flex: 1, paddingVertical: 13, alignItems: "center", borderRightWidth: 1, borderRightColor: sem.color + "20" }}>
                  <Text style={{ fontSize: 14, fontWeight: "900",
                    color: savePct >= 20 ? "#4CAF50" : savePct >= 0 ? "#FFC107" : "#F44336" }}>{savePct}%</Text>
                  <Text style={{ fontSize: 9, color: C.t3, marginTop: 3, letterSpacing: 0.5 }}>Tasa Ahorro</Text>
                </View>
                {/* Runway */}
                <View style={{ flex: 1, paddingVertical: 13, alignItems: "center", borderRightWidth: 1, borderRightColor: sem.color + "20" }}>
                  {runway !== null ? (
                    <>
                      <Text style={{ fontSize: 14, fontWeight: "900",
                        color: runway < 7 ? "#F44336" : runway < 15 ? "#FFC107" : "#4CAF50" }}>
                        {runway}d
                      </Text>
                      <Text style={{ fontSize: 9, color: C.t3, marginTop: 3, letterSpacing: 0.5 }}>Runway</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: C.t3 }}>—</Text>
                      <Text style={{ fontSize: 9, color: C.t3, marginTop: 3 }}>Runway</Text>
                    </>
                  )}
                </View>
                {/* Ingresos — clickeable */}
                <TouchableOpacity onPress={() => setShowIngresos(true)}
                  style={{ flex: 1, paddingVertical: 13, alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: C.mint }}>{money(totalInc, cur)}</Text>
                  <Text style={{ fontSize: 9, color: C.t3, marginTop: 3 }}>Ingresos ✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>

          {/* ── ALERTA RUNWAY < 7 días ── */}
          {runway !== null && runway < 7 && (
            <FadeIn delay={100}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }],
                marginHorizontal: 16, marginBottom: 12, borderRadius: 16, backgroundColor: "#F4433618",
                borderWidth: 1.5, borderColor: "#F4433660", padding: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 28 }}>🚨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#F44336" }}>SUPERVIVENCIA: {runway} DÍAS</Text>
                  <Text style={{ fontSize: 11, color: C.t2, marginTop: 2, lineHeight: 16 }}>
                    A este ritmo de gasto te quedas en cero el día {DAY + runway} del mes.
                  </Text>
                </View>
              </Animated.View>
            </FadeIn>
          )}

          {/* ── STREAK BANNER ── */}
          <FadeIn delay={120}>
            <StreakBanner streakDays={streakDays} onPress={openSettings} />
          </FadeIn>

          {/* ── GASTOS RECIENTES ── */}
          <FadeIn delay={160}>
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: C.t1 }}>Gastos Recientes</Text>
                {expenses.length > 0 && (
                  <TouchableOpacity onPress={() => setShowHistorial(true)}>
                    <Tag label={"Ver todos " + expenses.length} color={C.sky} />
                  </TouchableOpacity>
                )}
              </View>

              {expenses.length === 0 ? (
                <View style={{ paddingVertical: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 72, marginBottom: 14 }}>
                    {[35, 58, 22, 72, 44, 62, 38].map((h, i) => (
                      <View key={i} style={{ flex: 1, justifyContent: "flex-end", height: 72 }}>
                        <View style={{ width: "100%", height: h, borderRadius: 7,
                          backgroundColor: C.mint + "12", borderWidth: 1, borderColor: C.mint + "20", borderStyle: "dashed" }} />
                      </View>
                    ))}
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: C.mint }}>Tu potencial de ahorro aquí</Text>
                    <Text style={{ fontSize: 11, color: C.t3, marginTop: 4, textAlign: "center", lineHeight: 17 }}>
                      Cada gasto registrado construye tu historia financiera real.
                    </Text>
                  </View>
                </View>
              ) : (
                expenses.slice(0, 5).map((e, i) => {
                  const info = CATS[e.cat] || CATS["Otro"];
                  return (
                    <View key={e.id}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: info.color + "18",
                          borderWidth: 1, borderColor: info.color + "28", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 19 }}>{info.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: C.t1 }} numberOfLines={1}>{e.desc}</Text>
                          <Text style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{e.cat} · {e.date}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: sem.color }}>-{money(e.amount, cur)}</Text>
                      </View>
                      {i < Math.min(expenses.length, 5) - 1 && (
                        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 10, marginLeft: 54 }} />
                      )}
                    </View>
                  );
                })
              )}
            </Card>
          </FadeIn>

          {/* ── CATEGORÍAS CON BARRAS ── */}
          {Object.keys((() => { const ct={}; expenses.forEach(e=>{ct[e.cat]=(ct[e.cat]||0)+e.amount}); return ct; })()).length > 0 && (
            <FadeIn delay={200}>
              {(() => {
                const ct = {};
                expenses.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
                const maxC = Math.max(...Object.values(ct), 1);
                return (
                  <Card style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>Por Categoría</Text>
                      <Tag label={money(totalExp, cur)} color={sem.color} />
                    </View>
                    {Object.entries(ct).sort((a, b) => b[1] - a[1]).map(([cat, amt], idx, arr) => {
                      const info = CATS[cat] || CATS["Otro"];
                      const budLim = budgets[cat];
                      const overBud = budLim && amt > budLim;
                      return (
                        <View key={cat} style={{ marginBottom: idx < arr.length - 1 ? 13 : 0 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <CatIcon cat={cat} size={36} />
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                                <Text style={{ fontSize: 12, fontWeight: "600", color: C.t2 }}>{cat}</Text>
                                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                                  {overBud && <Tag label="⚠ Excedido" color={C.rose} size="sm" />}
                                  <Text style={{ fontSize: 12, fontWeight: "800", color: C.t1 }}>{money(amt, cur)}</Text>
                                </View>
                              </View>
                              <Bar pct={(amt / maxC) * 100} color={overBud ? C.rose : info.color} h={5} showGlow />
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                );
              })()}
            </FadeIn>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Modales */}
      <HistorialModal visible={showHistorial} onClose={() => setShowHistorial(false)}
        expenses={expenses} onDelete={onDeleteExpense} cur={cur} />
      <IngresosModal visible={showIngresos} onClose={() => setShowIngresos(false)}
        income={income} onSave={onUpdateIncome} cur={cur} />
    </View>
  );
}
    <View style={{ flex: 1, backgroundColor: isSurvival ? "#0A0006" : C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

          {/* Header */}
          <FadeIn delay={0}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 12, color: C.t3, letterSpacing: 0.5 }}>Hola, <Text style={{ color: C.t2, fontWeight: "600" }}>{user.name}</Text> 👋</Text>
                <Text style={{ fontSize: 24, fontWeight: "900", color: C.t1, letterSpacing: -1, marginTop: 1 }}>Mi<Text style={{ color: isSurvival ? C.rose : C.mint }}>Finanzas</Text></Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ backgroundColor: grade.color + "18", borderRadius: 12, borderWidth: 1, borderColor: grade.color + "40", paddingHorizontal: 11, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={{ fontSize: 14 }}>{grade.emoji}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: grade.color }}>{sc}pts</Text>
                </View>
                <TouchableOpacity onPress={openSettings} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18 }}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>

          {/* MODO SUPERVIVENCIA — banner urgente */}
          {isSurvival && (
            <FadeIn delay={50}>
              <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 18, backgroundColor: C.roseBg2,
                borderWidth: 1.5, borderColor: C.rose + "60", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 28 }}>🚨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: C.rose, letterSpacing: -0.3 }}>MODO SUPERVIVENCIA</Text>
                  <Text style={{ fontSize: 11, color: C.t2, marginTop: 2, lineHeight: 16 }}>Has gastado el 80%+ antes de terminar el período. Prioriza solo necesidades.</Text>
                </View>
              </View>
            </FadeIn>
          )}

          {/* Hero Balance */}
          <FadeIn delay={80}>
            <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 24, overflow: "hidden", borderWidth: 1,
              borderColor: isSurvival ? C.rose + "50" : C.mint + "40",
              shadowColor: isSurvival ? C.rose : C.mint,
              shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 8 }}>
              <View style={{ backgroundColor: isSurvival ? "#140008" : "#00140F", padding: 20, paddingBottom: 0 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View>
                    <Text style={{ fontSize: 10, color: isSurvival ? C.rose : C.mint, letterSpacing: 3, fontWeight: "700", marginBottom: 6 }}>BALANCE DISPONIBLE</Text>
                    <Text style={{ fontSize: 42, fontWeight: "900", color: isSurvival ? C.rose : C.mint, letterSpacing: -2, lineHeight: 48 }}>{money(balance, cur)}</Text>
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
              {/* Stats row — ingresos clickeable */}
              <View style={{ backgroundColor: isSurvival ? "#1A0010" : "#001A14", flexDirection: "row", borderTopWidth: 1, borderTopColor: (isSurvival ? C.rose : C.mint) + "20" }}>
                <TouchableOpacity onPress={() => setShowIngresos(true)} style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderRightWidth: 1, borderRightColor: (isSurvival ? C.rose : C.mint) + "20" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: C.mint }}>{money(totalInc, cur)}</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Ingresos ✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHistorial(true)} style={{ flex: 1, paddingVertical: 14, alignItems: "center", borderRightWidth: 1, borderRightColor: (isSurvival ? C.rose : C.mint) + "20" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: C.rose }}>{money(totalExp, cur)}</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Gastos 📋</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: savePct >= 20 ? C.gold : C.t2 }}>{savePct}%</Text>
                  <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Ahorro</Text>
                </View>
              </View>
            </View>
          </FadeIn>

          {/* Streak Banner */}
          <FadeIn delay={120}>
            <StreakBanner streakDays={streakDays} onPress={openSettings} />
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
                  <Tag label={money(totalExp, cur)} color={C.rose} />
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
                            <Text style={{ fontSize: 13, fontWeight: "800", color: C.t1 }}>{money(amt, cur)}</Text>
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
                /* "El vacío debe doler" — gráfica de barras vacía con potencial */
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
                    <Text style={{ fontSize: 13, fontWeight: "800", color: C.mint, letterSpacing: -0.3 }}>Tu potencial de ahorro aquí</Text>
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
                        <Text style={{ fontSize: 15, fontWeight: "800", color: C.rose }}>-{money(e.amount, cur)}</Text>
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

      <HistorialModal visible={showHistorial} onClose={() => setShowHistorial(false)}
        expenses={expenses} onDelete={onDeleteExpense} cur={cur} />
      <IngresosModal visible={showIngresos} onClose={() => setShowIngresos(false)}
        income={income} onSave={onUpdateIncome} cur={cur} />
    </View>
  );
}

// ─────────────────────────────────────────────
// CHAT IA — Motor completo
// ─────────────────────────────────────────────
const API_KEY = "TU_API_KEY_AQUI"; // ← Reemplaza con tu key de console.anthropic.com

function ChatScreen({ state, addExpense }) {
  const { user, income, debts, budgets, goals, expenses: allExp } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const totalExp = allExp.reduce((a, e) => a + e.amount, 0);
  const balance  = totalInc - totalExp;

  // Construir contexto financiero completo para la IA
  const buildContext = () => {
    const ct = {};
    allExp.forEach(e => { ct[e.cat] = (ct[e.cat] || 0) + e.amount; });
    const runway = calcRunway(balance, allExp);
    const savePct = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0;
    const debtTotal = debts.reduce((a, d) => a + d.balance, 0);
    const debtInterestMonth = debts.reduce((a, d) => a + (d.balance * d.rate / 100 / 12), 0);

    return `Eres TARS, el asistente financiero de élite de ${user.name} en República Dominicana.
Moneda: ${cur}. Fecha actual: ${new Date().toLocaleDateString("es-DO", { weekday:"long", day:"numeric", month:"long" })}.

SITUACIÓN FINANCIERA ACTUAL:
- Balance disponible: ${money(balance, cur)}
- Ingresos mensuales: ${money(totalInc, cur)}
- Gastos del mes: ${money(totalExp, cur)}
- Tasa de ahorro: ${savePct}%
- Días de runway (sin ingresos): ${runway ?? "N/A"} días
- Deuda total: ${money(debtTotal, cur)}
- Intereses quemados/mes: ${money(Math.round(debtInterestMonth), cur)}
- Gastos por categoría: ${JSON.stringify(ct)}
- Deudas: ${debts.map(d => `${d.name}: ${money(d.balance, cur)} al ${d.rate}%`).join(", ") || "ninguna"}
- Metas activas: ${goals?.map(g => `${g.emoji}${g.name}: ${Math.round((g.saved/g.target)*100)}%`).join(", ") || "ninguna"}

INSTRUCCIONES:
- Responde SIEMPRE en español dominicano coloquial con emojis estratégicos
- Máximo 3 párrafos cortos, directos y accionables
- Si detectas gasto de lujo (>RD$2000 en categoría Ocio/otro), menciona las horas de trabajo que cuesta
- Si el runway es <30 días, incluye esa advertencia
- Si hay deudas con tasa >20%, sugiere atacarlas primero
- Sé brutalmente honesto pero motivador, estilo mentor financiero dominicano
- Cuando des cifras usa el formato ${cur}X,XXX`;
  };

  const WELCOME = `¡Qué lo qué, ${user.name}! 🚀 Soy TARS, tu asesor financiero.\n\nTengo tu situación al día:\n💰 Balance: ${money(balance, cur)}\n📊 Ahorro este mes: ${totalInc > 0 ? Math.round((balance/totalInc)*100) : 0}%\n\nPuedo ayudarte con:\n• "Gasté 800 en gasolina"\n• "¿Cuánto llevo en comida?"\n• "¿Me conviene pagar la tarjeta BHD?"\n• "Analiza mis finanzas"\n• "¿Cuánto me cuesta esta cena de RD$3,500?"`;

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

    // ── Detección de intenciones locales (sin API) ──
    const isEntry = /gast[eé]|pagu[eé]|compr[eé]|sali[oó]/.test(low);
    const parsed  = nlp(msg);

    // Registrar gasto
    if (isEntry && parsed.amount) {
      const newE = { id: Date.now(), desc: parsed.desc, amount: parsed.amount, cat: parsed.cat, date: parsed.date };
      addExpense(newE);
      const hours = lifeHours(parsed.amount, totalInc);
      const hoursMsg = hours && hours >= 2 ? `\n⏱ Eso son ${hours} horas de tu trabajo.` : "";
      const budgetRem = budgets[parsed.cat] ? Math.max(0, budgets[parsed.cat] - ((allExp.filter(e=>e.cat===parsed.cat).reduce((a,e)=>a+e.amount,0)) + parsed.amount)) : null;
      const budgetMsg = budgetRem !== null ? `\n📊 Te quedan ${money(budgetRem, cur)} en ${parsed.cat} este mes.` : "";
      setLoading(false);
      setMsgs(m => [...m, { bot: true, text: `✅ Registrado!\n\n${CATS[parsed.cat]?.icon || "💸"} ${parsed.desc}\n${money(parsed.amount, cur)} · ${parsed.cat} · ${parsed.date}${hoursMsg}${budgetMsg}` }]);
      return;
    }

    // Consulta de categoría sin API
    const catMatch = Object.keys(CATS).find(k => low.includes(k.toLowerCase()));
    const isQuery  = /cuánto|cuanto|llevo|gast[eé] en|total/.test(low) && catMatch;
    if (isQuery) {
      const spent = allExp.filter(e => e.cat === catMatch).reduce((a, e) => a + e.amount, 0);
      const bud   = budgets[catMatch];
      const pct   = bud ? Math.round((spent / bud) * 100) : null;
      setLoading(false);
      setMsgs(m => [...m, { bot: true, text: `📊 ${CATS[catMatch]?.icon} **${catMatch}** este mes:\n\n${money(spent, cur)} gastados${bud ? ` de ${money(bud, cur)} (${pct}%)` : ""}\n\n${pct > 90 ? "⚠️ Casi al límite, cuidado." : pct > 70 ? "👀 Vas bien pero vigila." : "✅ Dentro del presupuesto."}` }]);
      return;
    }

    // ── Llamada a la API de Anthropic ──
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          system: buildContext(),
          messages: [{ role: "user", content: msg }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setMsgs(m => [...m, { bot: true, text: data.content?.[0]?.text || "No pude responder." }]);
    } catch (err) {
      // Fallback inteligente sin API
      const runway = calcRunway(balance, allExp);
      const savePct = totalInc > 0 ? Math.round((balance/totalInc)*100) : 0;
      let fallback = `🤖 TARS sin conexión, pero aquí va:\n\n`;
      if (/analiza|resumen|cómo estoy|como estoy/.test(low)) {
        fallback += `💰 Balance: ${money(balance, cur)}\n📈 Ahorro: ${savePct}%\n`;
        if (runway) fallback += `⏳ Runway: ${runway} días\n`;
        fallback += savePct >= 20 ? `\n✅ Vas excelente. Mantén ese ritmo.` : `\n⚠️ Tu ahorro está bajo. Revisa gastos de Ocio.`;
      } else if (/cuánto cuesta|vale la pena|debo comprar/.test(low) && parsed.amount) {
        const hours = lifeHours(parsed.amount, totalInc);
        fallback += hours ? `⏱ ${money(parsed.amount, cur)} = ${hours} horas de tu trabajo.\n¿Vale ${hours} horas de tu vida?` : `Agrega tu API key en App.js para respuestas completas.`;
      } else {
        fallback += `Para respuestas de IA completas, agrega tu API key de console.anthropic.com en la línea "const API_KEY".`;
      }
      setMsgs(m => [...m, { bot: true, text: fallback }]);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View>
          <Text style={{ fontSize: 10, color: C.t3, letterSpacing: 2, fontWeight: "700" }}>ASISTENTE</Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>TARS <Text style={{ color: C.mint }}>IA</Text> 🤖</Text>
        </View>
        <View style={{ backgroundColor: C.mintBg2, borderRadius: 10, borderWidth: 1, borderColor: C.mint + "40", paddingHorizontal: 10, paddingVertical: 5 }}>
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
              {m.bot && (
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: C.mintBg2, borderWidth: 1, borderColor: C.mint + "40", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                    <Text style={{ fontSize: 14 }}>🤖</Text>
                  </View>
                  <View style={{ maxWidth: "80%", padding: 13, borderRadius: 18, borderBottomLeftRadius: 4,
                    backgroundColor: C.card, borderWidth: 1, borderColor: C.border2 }}>
                    <Text style={{ fontSize: 13, color: C.t1, lineHeight: 21 }}>{m.text}</Text>
                  </View>
                </View>
              )}
              {!m.bot && (
                <View style={{ maxWidth: "80%", padding: 13, borderRadius: 18, borderBottomRightRadius: 4,
                  backgroundColor: C.mint }}>
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
              <View style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border2, padding: 12, flexDirection: "row", gap: 4 }}>
                {[0, 1, 2].map(j => <View key={j} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.mint, opacity: 0.6 }} />)}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Sugerencias rápidas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 14, paddingBottom: 6, maxHeight: 44 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["Analiza mis finanzas", "¿Cuánto llevo en comida?", "Consejo para ahorrar", "¿Cómo están mis deudas?"].map(s => (
              <TouchableOpacity key={s} onPress={() => { setInput(s); }}
                style={{ paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card2, borderRadius: 10, borderWidth: 1, borderColor: C.border2 }}>
                <Text style={{ fontSize: 11, color: C.t2, fontWeight: "600" }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 10, padding: 14, paddingBottom: 20, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Escribe un gasto o pregunta a TARS..."
            placeholderTextColor={C.t3}
            value={input} onChangeText={setInput}
            onSubmitEditing={send} returnKeyType="send"
            multiline maxHeight={100}
          />
          <TouchableOpacity onPress={send}
            style={{ width: 48, height: 48, backgroundColor: loading ? C.t4 : C.mint, borderRadius: 14,
              alignItems: "center", justifyContent: "center",
              shadowColor: C.mint, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8 }}
            activeOpacity={0.8} disabled={loading}>
            <Text style={{ fontSize: 20, color: "#000", fontWeight: "900" }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// DEUDAS
// ─────────────────────────────────────────────
function DeudasScreen({ state, setDebts, embedded }) {
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
              const dc = d.color || t.color;
              const pctPaid = d.limit > 0 ? Math.round(((d.limit - d.balance) / d.limit) * 100) : 0;
              const mo = payoffMonths(d.balance, d.rate, d.minPay + Number(extra || 0));
              const tl = mo === Infinity ? "Solo intereses" : mo > 24 ? (mo / 12).toFixed(1) + " años" : mo + " meses";
              return (
                <View key={d.id} style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: dc + "45",
                  shadowColor: dc, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 12 }}>
                  <View style={{ backgroundColor: dc + "0C", padding: 16 }}>
                    {/* Top row */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: dc + "22", borderWidth: 1.5, borderColor: dc + "40", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 15, fontWeight: "800", color: C.t1 }}>{d.name}</Text>
                          <Tag label={t.label} color={dc} size="sm" />
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setDebts(debts.filter(x => x.id !== d.id))} style={{ padding: 6, borderRadius: 10, backgroundColor: C.roseBg }}>
                        <Text style={{ color: C.rose, fontSize: 16, fontWeight: "700" }}>×</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Stats */}
                    <View style={{ flexDirection: "row", gap: 0, marginBottom: 12, backgroundColor: C.bg + "80", borderRadius: 14, overflow: "hidden" }}>
                      {[["Saldo", money(d.balance, cur), C.rose], ["Tasa", d.rate + "% anual", C.gold], ["Mín/mes", money(d.minPay, cur), C.t1]].map(([l, v, c], i) => (
                        <View key={l} style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRightWidth: i < 2 ? 1 : 0, borderRightColor: C.border2 }}>
                          <Text style={{ fontSize: 12, fontWeight: "800", color: c }}>{v}</Text>
                          <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{l}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Progress paid */}
                    {d.limit > 0 && (
                      <View style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                          <Text style={{ fontSize: 11, color: C.t3 }}>Progreso de pago</Text>
                          <Text style={{ fontSize: 11, color: dc, fontWeight: "700" }}>{pctPaid}% pagado</Text>
                        </View>
                        <Bar pct={pctPaid} color={dc} h={6} showGlow />
                      </View>
                    )}
                    <View style={{ backgroundColor: dc + "14", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: dc + "25", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 12, color: C.t2 }}>⏱ Libre en: <Text style={{ color: dc, fontWeight: "700" }}>{tl}</Text></Text>
                      {d.rate > 0 && <Text style={{ fontSize: 11, color: C.t3 }}><Text style={{ color: C.rose, fontWeight: "700" }}>{money(Math.round(d.balance * d.rate / 100), cur)}</Text>/año</Text>}
                    </View>
                  </View>
                </View>
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
function MetasScreen({ state, setGoals, embedded }) {
  const { user, goals, income } = state;
  const cur = user.currency;
  const totalInc = income.reduce((a, i) => a + i.amount, 0);
  const [adding,   setAdding]   = useState(false);
  const [selected, setSelected] = useState(0);
  const [form,     setForm]     = useState({ name: "", emoji: "🎯", target: "", weeks: "12" });
  const goalColors = [C.sky, C.mint, C.violet, C.gold, C.orange, C.pink];
  const active = goals.length > 0 ? goals[selected] || goals[0] : null;
  const activePct = active ? Math.min((active.saved / active.target) * 100, 100) : 0;
  const activeColor = goalColors[selected % goalColors.length];

  function CircularProgress({ pct, size, color, children }) {
    const deg = Math.round((pct / 100) * 360);
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: size, height: size, borderRadius: size/2, borderWidth: 10, borderColor: C.border2 }} />
        {deg > 0 && <View style={{ position: "absolute", width: size, height: size, borderRadius: size/2, borderWidth: 10,
          borderColor: "transparent",
          borderTopColor: deg >= 0 ? color : "transparent",
          borderRightColor: deg >= 90 ? color : "transparent",
          borderBottomColor: deg >= 180 ? color : "transparent",
          borderLeftColor: deg >= 270 ? color : "transparent",
          transform: [{ rotate: "-90deg" }] }} />}
        <View style={{ alignItems: "center", justifyContent: "center" }}>{children}</View>
      </View>
    );
  }

  const content = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Header estilo boceto 2 */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Progreso de Ahorro</Text>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border2, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </View>
        </View>

        {goals.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 10, borderColor: C.border2,
              alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
              <Text style={{ fontSize: 40 }}>🎯</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.t1, textAlign: "center", marginBottom: 8 }}>Sin metas aún</Text>
            <Text style={{ fontSize: 13, color: C.t3, textAlign: "center", lineHeight: 20, marginBottom: 28 }}>Define tu primer objetivo y mira tu progreso visual día a día</Text>
            <TouchableOpacity onPress={() => setAdding(true)} style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.mint,
              alignItems: "center", justifyContent: "center",
              shadowColor: C.mint, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14 }}>
              <Text style={{ fontSize: 32, color: "#000", fontWeight: "900" }}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Hero circular — meta activa */}
            <View style={{ alignItems: "center", paddingVertical: 28 }}>
              <CircularProgress pct={activePct} size={220} color={activeColor}>
                <Text style={{ fontSize: 36, marginBottom: 4 }}>{active.emoji}</Text>
                <Text style={{ fontSize: 40, fontWeight: "900", color: activeColor, letterSpacing: -2 }}>{Math.round(activePct)}%</Text>
                <Text style={{ fontSize: 12, color: C.t3, letterSpacing: 0.5 }}>Progreso</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: C.t2, marginTop: 4 }}>{active.name}</Text>
              </CircularProgress>
              <View style={{ marginTop: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: C.t1 }}>{money(active.saved, cur)}</Text>
                <Text style={{ fontSize: 12, color: C.t3 }}>de {money(active.target, cur)}</Text>
              </View>
            </View>

            {/* Chips de selección de meta */}
            {goals.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {goals.map((g, i) => {
                    const pct = Math.min((g.saved / g.target) * 100, 100);
                    const col = goalColors[i % goalColors.length];
                    return (
                      <TouchableOpacity key={g.id} onPress={() => setSelected(i)}
                        style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5,
                          borderColor: selected === i ? col : C.border, backgroundColor: selected === i ? col + "20" : C.card2,
                          alignItems: "center", minWidth: 90 }}>
                        <Text style={{ fontSize: 18, marginBottom: 3 }}>{g.emoji}</Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: selected === i ? col : C.t3 }} numberOfLines={1}>{g.name}</Text>
                        <Text style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{Math.round(pct)}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* Lista de metas con mini barras */}
            <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.t2, marginBottom: 12, letterSpacing: 0.5 }}>TODAS LAS METAS</Text>
              {goals.map((g, i) => {
                const pct  = Math.min((g.saved / g.target) * 100, 100);
                const col  = goalColors[i % goalColors.length];
                const weekly = ((g.target - g.saved) / Math.max(g.weeks, 1)).toFixed(0);
                return (
                  <View key={g.id} style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1,
                    borderColor: selected === i ? col + "50" : C.border, padding: 16, marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: col + "20",
                        borderWidth: 1.5, borderColor: col + "40", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>{g.name}</Text>
                        <Text style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{money(g.saved, cur)} de {money(g.target, cur)}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <View style={{ backgroundColor: col + "22", borderRadius: 8, borderWidth: 1, borderColor: col + "40", paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 12, fontWeight: "900", color: col }}>{Math.round(pct)}%</Text>
                        </View>
                        <TouchableOpacity onPress={() => setGoals(goals.filter(x => x.id !== g.id))}>
                          <Text style={{ fontSize: 10, color: C.t4 }}>eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Bar pct={pct} color={col} h={7} showGlow />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                      <Text style={{ fontSize: 10, color: C.t3 }}>Aparta {money(+weekly, cur)}/semana</Text>
                      <Text style={{ fontSize: 10, color: col, fontWeight: "700" }}>Faltan {money(g.target - g.saved, cur)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Inversiones del mes — rendimiento basado en ahorro */}
            {totalInc > 0 && (
              <Card style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Inversiones del Mes</Text>
                  <Tag label={"+4.5%"} color={C.mint} />
                </View>
                {(() => {
                  const monthly = Math.round(totalInc * 0.1);
                  const weeks   = [0.8, 1.2, 0.6, 1.4, 1.0].slice(0, Math.ceil(DAY / 7));
                  const maxW    = Math.max(...weeks);
                  return (
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 70 }}>
                      {weeks.map((w, i) => (
                        <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 70 }}>
                          <View style={{ width: "100%", height: Math.max((w / maxW) * 55, 8), borderRadius: 6,
                            backgroundColor: i === weeks.length - 1 ? C.mint : C.sky,
                            shadowColor: i === weeks.length - 1 ? C.mint : C.sky,
                            shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 }} />
                          <Text style={{ fontSize: 8, color: C.t3, marginTop: 4 }}>S{i + 1}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </Card>
            )}
          </>
        )}

        {/* Form nueva meta */}
        {adding && (
          <Card style={{ marginHorizontal: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: C.t1, marginBottom: 16 }}>Nueva meta 🎯</Text>
            <Text style={styles.lbl}>QUÉ QUIERES LOGRAR?</Text>
            <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="ej: Laptop, Viaje, Fondo de emergencia..." />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbl}>EMOJI</Text>
                <Input value={form.emoji} onChange={v => setForm({ ...form, emoji: v })} style={{ textAlign: "center", fontSize: 26 }} />
              </View>
              <View style={{ flex: 2.5 }}>
                <Text style={styles.lbl}>CUÁNTO CUESTA ({cur})</Text>
                <Input value={form.target} onChange={v => setForm({ ...form, target: v })} placeholder="ej: 50000" numeric />
              </View>
            </View>
            <Text style={styles.lbl}>PLAZO</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 14 }}>
              {[["4","1 mes"],["12","3 meses"],["24","6 meses"],["52","1 año"]].map(([w, l]) => (
                <TouchableOpacity key={w} onPress={() => setForm({ ...form, weeks: w })}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, alignItems: "center",
                    borderColor: form.weeks === w ? C.mint : C.border, backgroundColor: form.weeks === w ? C.mintBg : C.card }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: form.weeks === w ? C.mint : C.t3 }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!form.name && !!form.target && (
              <View style={{ backgroundColor: C.mintBg2, borderRadius: 12, borderWidth: 1, borderColor: C.mint + "40", padding: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, color: C.t2 }}>Aparta <Text style={{ color: C.mint, fontWeight: "700" }}>{cur}{Math.ceil(+form.target / +form.weeks).toLocaleString()}/semana</Text> durante {form.weeks} semanas.</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Btn label="Atrás" onPress={() => setAdding(false)} ghost style={{ flex: 1 }} />
              <Btn label="¡Empezar! 🚀" onPress={() => {
                if (!form.name || !form.target) return;
                setGoals([...goals, { id: Date.now(), ...form, target: +form.target, saved: 0, weeks: +form.weeks }]);
                setAdding(false);
                setForm({ name: "", emoji: "🎯", target: "", weeks: "12" });
              }} style={{ flex: 2 }} />
            </View>
          </Card>
        )}

      </ScrollView>
    </View>
  );

  return embedded ? <View style={{ flex: 1 }}>{content}</View> : (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>{content}</SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// HERRAMIENTAS (Score + Predictor + Recordatorios)
// ─────────────────────────────────────────────
function HerramientasScreen({ state, setReminders, embedded }) {
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
        {[["score","🌡️ Score"],["resumen","📅 Resumen"],["predictor","🔮 Predictor"],["pagos","🔔 Pagos"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setSub(id)} style={{ flex: 1, paddingVertical: 9, borderRadius: 11, backgroundColor: sub === id ? C.card2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: sub === id ? C.t1 : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {sub === "resumen" && (() => {
          const weeklyExp   = weeklyBreakdown(expenses);
          const maxWeek     = Math.max(...weeklyExp, 1);
          const weekNames   = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5"];
          const bestWeekIdx = weeklyExp.indexOf(Math.min(...weeklyExp.filter(w => w > 0)));
          const worstWeekIdx= weeklyExp.indexOf(Math.max(...weeklyExp));
          const today       = new Date().toISOString().split("T")[0];
          const regToday    = (streakDays || []).includes(today);
          const streak      = calcStreak(streakDays || []);
          const { msg: smsg, color: scol, emoji: semoji } = streakMessage(streak, regToday);
          const last30      = lastNDays(30);
          const totalInc30  = income.reduce((a, i) => a + i.amount, 0);
          const totalExp30  = expenses.reduce((a, e) => a + e.amount, 0);
          const savePct30   = totalInc30 > 0 ? Math.round(((totalInc30 - totalExp30) / totalInc30) * 100) : 0;

          // Días registrados este mes
          const thisMonth   = TODAY.toISOString().slice(0, 7);
          const daysThisMonth = (streakDays || []).filter(d => d.startsWith(thisMonth)).length;
          const consistency = Math.round((daysThisMonth / DAY) * 100);

          // Categoría más gastada
          const ct30 = {};
          expenses.forEach(e => { ct30[e.cat] = (ct30[e.cat] || 0) + e.amount; });
          const topCat = Object.entries(ct30).sort((a, b) => b[1] - a[1])[0];

          // Tendencia: comparar primera mitad del mes vs segunda
          const firstHalf  = expenses.filter(e => new Date(e.date).getDate() <= 15).reduce((a, e) => a + e.amount, 0);
          const secondHalf = expenses.filter(e => new Date(e.date).getDate() > 15).reduce((a, e) => a + e.amount, 0);
          const trending   = secondHalf > firstHalf * 1.2 ? "up" : secondHalf < firstHalf * 0.8 ? "down" : "stable";
          const trendInfo  = trending === "up"
            ? { label: "Gasto acelerando", color: C.rose, icon: "📈", desc: "Gastas más en la segunda quincena" }
            : trending === "down"
            ? { label: "Gasto desacelerando", color: C.mint, icon: "📉", desc: "Excelente control en la segunda quincena" }
            : { label: "Gasto estable", color: C.sky, icon: "➡️", desc: "Tu ritmo de gasto es consistente" };

          return (
            <>
              {/* Mini Streak Card */}
              <StreakBanner streakDays={streakDays || []} onPress={() => {}} />

              {/* Resumen del Mes */}
              <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: C.violet + "40",
                shadowColor: C.violet, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 14 }}>
                <View style={{ backgroundColor: C.violet + "0C", padding: 18, paddingBottom: 0 }}>
                  <Text style={{ fontSize: 10, color: C.violet, letterSpacing: 2.5, fontWeight: "700", marginBottom: 12 }}>RESUMEN DEL MES</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                    {[
                      [daysThisMonth + "/" + DAY, "Días activos", C.mint],
                      [consistency + "%",          "Consistencia", consistency >= 70 ? C.mint : consistency >= 40 ? C.gold : C.rose],
                      [streak + " 🔥",             "Racha actual", scol],
                    ].map(([v, l, c]) => (
                      <View key={l} style={{ flex: 1, backgroundColor: c + "12", borderRadius: 14, borderWidth: 1, borderColor: c + "30", padding: 12, alignItems: "center" }}>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: c }}>{v}</Text>
                        <Text style={{ fontSize: 10, color: C.t3, marginTop: 4, textAlign: "center" }}>{l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={{ flexDirection: "row", backgroundColor: C.violet + "12", borderTopWidth: 1, borderTopColor: C.violet + "25" }}>
                  <View style={{ flex: 1, paddingVertical: 13, alignItems: "center", borderRightWidth: 1, borderRightColor: C.violet + "20" }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: C.rose }}>{money(totalExp30, user.currency)}</Text>
                    <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Total gastado</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 13, alignItems: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: savePct30 >= 20 ? C.mint : C.gold }}>{savePct30}%</Text>
                    <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>Ahorro del mes</Text>
                  </View>
                </View>
              </View>

              {/* Gráfica de barras semanal */}
              {weeklyExp.some(w => w > 0) && (
                <Card style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Gasto por semana</Text>
                    <Tag label={money(totalExp30, user.currency)} color={C.rose} />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 100 }}>
                    {weeklyExp.map((w, i) => {
                      const h     = maxWeek > 0 ? Math.max((w / maxWeek) * 80, w > 0 ? 8 : 0) : 0;
                      const isBest  = i === bestWeekIdx && w > 0;
                      const isWorst = i === worstWeekIdx && weeklyExp.filter(x => x > 0).length > 1;
                      const barCol  = isBest ? C.mint : isWorst ? C.rose : C.sky;
                      return (
                        <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: 100 }}>
                          {(isBest || isWorst) && (
                            <Text style={{ fontSize: 8, color: barCol, fontWeight: "700", marginBottom: 3, letterSpacing: 0.3 }}>
                              {isBest ? "MEJOR" : "MAYOR"}
                            </Text>
                          )}
                          <View style={{
                            width: "100%", height: h, borderRadius: 8,
                            backgroundColor: barCol,
                            shadowColor: barCol, shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: isBest || isWorst ? 0.6 : 0.2, shadowRadius: 6,
                            opacity: w === 0 ? 0.15 : 1,
                          }} />
                          <Text style={{ fontSize: 9, color: i === Math.floor((DAY - 1) / 7) ? C.t1 : C.t3, marginTop: 5, fontWeight: "600" }}>
                            {weekNames[i]}
                          </Text>
                          {w > 0 && (
                            <Text style={{ fontSize: 8, color: barCol, fontWeight: "700", marginTop: 1 }}>
                              {money(w, user.currency)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {weeklyExp.filter(w => w > 0).length > 1 && (
                    <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1, backgroundColor: C.mintBg2, borderRadius: 10, padding: 10, flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <Text style={{ fontSize: 14 }}>✅</Text>
                        <View>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: C.mint }}>Mejor semana</Text>
                          <Text style={{ fontSize: 10, color: C.t3 }}>{weekNames[bestWeekIdx]}: {money(weeklyExp[bestWeekIdx], user.currency)}</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1, backgroundColor: C.roseBg2, borderRadius: 10, padding: 10, flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <Text style={{ fontSize: 14 }}>⚠️</Text>
                        <View>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: C.rose }}>Mayor gasto</Text>
                          <Text style={{ fontSize: 10, color: C.t3 }}>{weekNames[worstWeekIdx]}: {money(weeklyExp[worstWeekIdx], user.currency)}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </Card>
              )}

              {/* Tendencia de gasto */}
              <Card style={{ marginBottom: 14, borderColor: trendInfo.color + "40" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: trendInfo.color + "18", borderWidth: 1, borderColor: trendInfo.color + "35", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 22 }}>{trendInfo.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: trendInfo.color }}>{trendInfo.label}</Text>
                    <Text style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 16 }}>{trendInfo.desc}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 14, flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 10, color: C.t3, marginBottom: 3 }}>1ra quincena</Text>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: C.t1 }}>{money(firstHalf, user.currency)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: C.card2, borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 10, color: C.t3, marginBottom: 3 }}>2da quincena</Text>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: trending === "up" ? C.rose : trending === "down" ? C.mint : C.t1 }}>{money(secondHalf, user.currency)}</Text>
                  </View>
                </View>
              </Card>

              {/* Categoría estrella y peor */}
              {topCat && (
                <Card style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 14 }}>Protagonista del mes</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <CatIcon cat={topCat[0]} size={52} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: C.t1 }}>{topCat[0]}</Text>
                      <Text style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>Tu mayor gasto este mes</Text>
                      <View style={{ marginTop: 8 }}>
                        <Bar pct={totalExp30 > 0 ? (topCat[1] / totalExp30) * 100 : 0} color={CATS[topCat[0]]?.color || C.mint} h={6} showGlow />
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 16, fontWeight: "900", color: CATS[topCat[0]]?.color || C.mint }}>{money(topCat[1], user.currency)}</Text>
                      <Text style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>
                        {totalExp30 > 0 ? Math.round((topCat[1] / totalExp30) * 100) : 0}% del total
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              {/* Calendario de actividad — últimos 30 días */}
              <Card style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1 }}>Actividad del mes</Text>
                  <Tag label={daysThisMonth + " días activos"} color={C.mint} />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                  {Array.from({ length: DAYS_IN_MONTH }, (_, i) => {
                    const dayNum = i + 1;
                    const dayStr = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                    const done   = (streakDays || []).includes(dayStr);
                    const isPast = dayNum <= DAY;
                    const isT    = dayNum === DAY;
                    return (
                      <View key={dayNum} style={{
                        width: 28, height: 28, borderRadius: 8,
                        backgroundColor: done ? C.mint : isT ? C.mintBg2 : isPast ? C.card3 : C.card2,
                        borderWidth: isT ? 1.5 : 0,
                        borderColor: isT ? C.mint + "80" : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {done
                          ? <Text style={{ fontSize: 12 }}>🔥</Text>
                          : <Text style={{ fontSize: 10, color: isPast ? C.t4 : C.t5, fontWeight: "600" }}>{dayNum}</Text>
                        }
                      </View>
                    );
                  })}
                </View>
                <View style={{ flexDirection: "row", gap: 16, marginTop: 12, justifyContent: "center" }}>
                  {[[C.mint, "🔥", "Registrado"], [C.card3, null, "Sin registro"], [C.card2, null, "Futuro"]].map(([col, ic, lab]) => (
                    <View key={lab} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: col, alignItems: "center", justifyContent: "center" }}>
                        {ic && <Text style={{ fontSize: 8 }}>{ic}</Text>}
                      </View>
                      <Text style={{ fontSize: 10, color: C.t3 }}>{lab}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          );
        })()}

        {sub === "score" && (
          <>
            {/* Score Hero */}
            <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: grade.color + "45",
              shadowColor: grade.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 }}>
              <View style={{ backgroundColor: grade.color + "0C", padding: 28, alignItems: "center" }}>
                <Text style={{ fontSize: 32, marginBottom: 10 }}>{grade.emoji}</Text>
                <Text style={{ fontSize: 72, fontWeight: "900", color: grade.color, letterSpacing: -3, lineHeight: 76 }}>{total}</Text>
                <Text style={{ fontSize: 13, color: C.t3, marginTop: 2, letterSpacing: 0.5 }}>puntos de 100</Text>
                <View style={{ marginTop: 12 }}>
                  <Tag label={grade.label} color={grade.color} />
                </View>
                <Text style={{ fontSize: 11, color: C.t3, marginTop: 10 }}>Tu salud financiera este mes</Text>
              </View>
              <View style={{ flexDirection: "row", backgroundColor: grade.color + "12", borderTopWidth: 1, borderTopColor: grade.color + "25" }}>
                {[
                  [streak + " días", "Racha", C.orange],
                  [savePct + "%",    "Ahorro", C.mint],
                  [expenses.length + "", "Registros", C.sky],
                ].map(([v, l, c], i) => (
                  <View key={l} style={{ flex: 1, paddingVertical: 13, alignItems: "center", borderRightWidth: i < 2 ? 1 : 0, borderRightColor: grade.color + "20" }}>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: c }}>{v}</Text>
                    <Text style={{ fontSize: 10, color: C.t3, marginTop: 3, letterSpacing: 0.5 }}>{l}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Score Breakdown */}
            <Card style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 16 }}>Desglose del Score</Text>
              {[
                ["💰", "Tasa de ahorro",   s.ahorro,      C.mint],
                ["📊", "Control",          s.presupuesto, C.sky],
                ["📝", "Registro",         s.consistencia,C.violet],
                ["💳", "Manejo de deudas", s.deuda,       C.gold],
              ].map(([ic, label, val, color], idx) => (
                <View key={label} style={{ marginBottom: idx < 3 ? 14 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: color + "18", borderWidth: 1, borderColor: color + "30", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 16 }}>{ic}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                        <Text style={{ fontSize: 13, color: C.t2 }}>{label}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "800", color }}>{Math.round(val)}pts</Text>
                      </View>
                      <Bar pct={val} color={color} h={6} showGlow />
                    </View>
                  </View>
                </View>
              ))}
            </Card>

            {/* Logros */}
            <Card>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.t1, marginBottom: 16 }}>Logros 🏅</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {[
                  ["🔥", "Racha activa",    streak + " días registrando",    streak >= 3,   C.orange],
                  ["💯", "Sin exceder",      "Presupuesto OK",                !overBudget && expenses.length > 0, C.mint],
                  ["🎯", "Meta activa",      "Ahorro en curso",               hasActiveGoal, C.sky],
                  ["🦸", "Super ahorrador", "30%+ ahorro",                   isSuperSaver,  C.gold],
                  ["🧘", "Sin deudas",      "Lista de deudas limpia",        noNewDebts,    C.green],
                  ["📆", "Mes perfecto",    "20+ registros, meta alcanzada", perfectMonth,  C.violet],
                ].map(([ic, label, desc, done, col]) => (
                  <View key={label} style={{ width: "47%", backgroundColor: done ? col + "14" : C.card2, borderRadius: 16, borderWidth: 1, borderColor: done ? col + "45" : C.border, padding: 14, opacity: done ? 1 : 0.3 }}>
                    <Text style={{ fontSize: 24, marginBottom: 8 }}>{ic}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: done ? col : C.t3, marginBottom: 2 }}>{label}</Text>
                    <Text style={{ fontSize: 10, color: C.t3, lineHeight: 14 }}>{desc}</Text>
                    {done && <View style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />}
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

          <Text style={[styles.lbl, { marginBottom: 6 }]}>LÍMITES DE PRESUPUESTO</Text>
          {Object.keys(CATS).slice(0, 6).map(cat => (
            <View key={cat} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (CATS[cat]?.color || C.mint) + "20", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{CATS[cat]?.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Input value={buds[cat] ? String(buds[cat]) : ""} onChange={v => setBuds({ ...buds, [cat]: +v || 0 })} placeholder={cat + " (0 = sin límite)"} numeric style={{ marginBottom: 0 }} />
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
// ESTRATEGIA — Deudas + Metas fusionadas
// ─────────────────────────────────────────────
function EstrategiaScreen({ state, setGoals, setDebts }) {
  const [subTab, setSubTab] = useState("metas");
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Estrategia ⚔️</Text>
        <Text style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>Destruye deudas. Construye riqueza.</Text>
      </View>
      {/* Sub-tabs */}
      <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 10, backgroundColor: C.card,
        borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border }}>
        {[["metas","🎯 Metas"],["deudas","💳 Deudas"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setSubTab(id)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 11, backgroundColor: subTab === id ? C.card2 : "transparent", alignItems: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: subTab === id ? C.t1 : C.t3 }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {subTab === "metas"  && <MetasScreen  state={state} setGoals={setGoals}  embedded />}
      {subTab === "deudas" && <DeudasScreen state={state} setDebts={setDebts} embedded />}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// PERFIL — Score completo + logros + herramientas
// ─────────────────────────────────────────────
function PerfilScreen({ state, openSettings, setReminders }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: C.t1, letterSpacing: -0.5 }}>Perfil 👤</Text>
        <TouchableOpacity onPress={openSettings}
          style={{ backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.border2, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.t2 }}>⚙️ Configurar</Text>
        </TouchableOpacity>
      </View>
      <HerramientasScreen state={state} setReminders={setReminders} embedded />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// NAV BAR — 3 tabs + FAB central
// ─────────────────────────────────────────────
function NavBar({ tab, setTab, onFAB }) {
  const insets = useSafeAreaInsets();
  // tab IDs usados: "home", "estrategia", "chat", "perfil"
  const left  = [
    { id: "home",      icon: "⬡",  label: "Inicio"    },
    { id: "estrategia",icon: "⚔",  label: "Estrategia"},
  ];
  const right = [
    { id: "chat",      icon: "◉",  label: "IA"        },
    { id: "perfil",    icon: "◎",  label: "Perfil"    },
  ];

  const Item = ({ item }) => {
    const active = tab === item.id;
    return (
      <TouchableOpacity onPress={() => setTab(item.id)}
        style={{ flex: 1, alignItems: "center", paddingVertical: 5 }} activeOpacity={0.7}>
        {active && <View style={{ position: "absolute", top: 0, width: 32, height: 2.5, backgroundColor: C.mint, borderRadius: 99 }} />}
        <View style={{ marginTop: 7, width: 34, height: 26, alignItems: "center", justifyContent: "center",
          backgroundColor: active ? C.mintBg2 : "transparent", borderRadius: 9 }}>
          <Text style={{ fontSize: 18, color: active ? C.mint : C.t3 }}>{item.icon}</Text>
        </View>
        <Text style={{ fontSize: 9, fontWeight: "700", color: active ? C.mint : C.t3, marginTop: 2, letterSpacing: 0.3 }}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border2,
      paddingTop: 4, paddingBottom: insets.bottom + 6, alignItems: "center" }}>
      {left.map(item => <Item key={item.id} item={item} />)}
      {/* FAB central */}
      <View style={{ width: 70, alignItems: "center", justifyContent: "center", paddingBottom: 4 }}>
        <TouchableOpacity onPress={onFAB} activeOpacity={0.85}
          style={{ width: 54, height: 54, borderRadius: 17, backgroundColor: C.mint,
            alignItems: "center", justifyContent: "center", marginBottom: 2,
            shadowColor: C.mint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
            borderWidth: 2, borderColor: "#00FFD0" }}>
          <Text style={{ fontSize: 26, color: "#000", fontWeight: "900", lineHeight: 30 }}>+</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 8, color: C.t3, letterSpacing: 0.3, fontWeight: "600" }}>REGISTRAR</Text>
      </View>
      {right.map(item => <Item key={item.id} item={item} />)}
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
  const [themeKey,      setThemeKey]      = useState(0); // fuerza re-render al cambiar tema
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
        // Restaurar preferencia de tema si existe
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

  // Onboarding completado — sin .finally para mayor compatibilidad
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
    };
    saveApp(next).then(() => {
      setAppState(next);
    }).catch(() => {
      setAppState(next); // igual muestra la app aunque falle el guardado
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

  return (
    <SafeAreaProvider key={themeKey}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />
        {tab === "home"       && <HomeScreen state={s} openSettings={() => setShowSettings(true)}
          onAddExpense={addExpenseWithStreak} onUpdateIncome={updateIncome} onDeleteExpense={deleteExpense} />}
        {tab === "estrategia" && <EstrategiaScreen state={s}
          setGoals={v => updateState({ goals: v })} setDebts={v => updateState({ debts: v })} />}
        {tab === "chat"       && <ChatScreen state={s} addExpense={addExpenseWithStreak} />}
        {tab === "perfil"     && <PerfilScreen state={s} openSettings={() => setShowSettings(true)}
          setReminders={v => updateState({ reminders: v })} />}
        <NavBar tab={tab} setTab={setTab} onFAB={() => setShowFABGlobal(true)} />
        <FABModal
          visible={showFABGlobal}
          onClose={() => setShowFABGlobal(false)}
          onSaveExpense={addExpenseWithStreak}
          onSaveIncome={inc => updateState({ income: [...s.income, inc] })}
          onSaveAbono={(targetId, amount, type) => {
            if (type === "deuda") {
              // Abono a deuda: reduce el balance
              const updated = s.debts.map(d =>
                d.id === targetId ? { ...d, balance: Math.max(0, d.balance - amount) } : d
              );
              updateState({ debts: updated });
            } else {
              // Redondeo a meta
              const updated = s.goals.map(g =>
                g.id === targetId ? { ...g, saved: g.saved + amount } : g
              );
              updateState({ goals: updated });
            }
          }}
          state={s}
        />
        {showSettings && <SettingsModal state={s} updateState={updateState} onClose={() => setShowSettings(false)} isDark={isDark} onToggleTheme={toggleTheme} />}
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
  navBar:  { flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 4 },
  navBtn:  { flex: 1, alignItems: "center", paddingVertical: 4, position: "relative" },
});
