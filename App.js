/**
 * FYNX — App.js v4
 * Flujo: Splash → WelcomeCarousel (1x) → Auth → Main
 * Crash fix: estado de auth resuelto antes de renderizar navegación
 */
import React, { useRef, useEffect, useState } from "react";
import { View, Text, StatusBar, Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FinanceProvider, useFinance } from "./src/context/FinanceContext";
import { AppNavigator }       from "./src/navigation/AppNavigator";
import { OnboardingScreen }   from "./src/screens/OnboardingScreen";
import { AuthScreen }         from "./src/screens/AuthScreen";
import { WelcomeCarousel }    from "./src/screens/WelcomeCarousel";
import { DARK_THEME as TH }   from "./src/constants/themes";
import { S }                  from "./src/constants/strings";

const CAROUSEL_KEY = "@fynx_carousel_visto";

// ── Splash animado ────────────────────────────────────────────────────────────
function SplashScreen() {
  const pulse = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue:1,   duration:900, useNativeDriver:true }),
        Animated.timing(pulse, { toValue:0.3, duration:900, useNativeDriver:true }),
      ])),
      Animated.spring(scale, { toValue:1, tension:60, friction:8, useNativeDriver:true }),
    ]).start();
  }, []);
  return (
    <View style={{ flex:1, backgroundColor:"#0A0A12", alignItems:"center", justifyContent:"center" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A12" />
      <Animated.View style={{ opacity:pulse, transform:[{ scale }], alignItems:"center" }}>
        {/* Monograma FX — coincide con el icono real */}
        <View style={{
          width:90, height:90, borderRadius:26,
          backgroundColor:"#1C1C24", borderWidth:1.5, borderColor:"#888888",
          alignItems:"center", justifyContent:"center", marginBottom:20,
        }}>
          <Text style={{ fontSize:38, color:"#B8B8B8", fontWeight:"700", letterSpacing:-2 }}>FX</Text>
        </View>
        <Text style={{ fontSize:30, fontWeight:"700", color:"#E0E0E0", letterSpacing:2 }}>
          {S.appNombre}
        </Text>
        <Text style={{ fontSize:10, color:"#666", marginTop:6, letterSpacing:3 }}>CARGANDO</Text>
      </Animated.View>
    </View>
  );
}

// ── Shell principal — crash fix: espera auth antes de navegar ─────────────────
function AppShell() {
  const { appState, isSurvival, isDark, T } = useFinance();
  const [fase, setFase] = useState("splash"); 
  // fases: splash | carousel | auth | app
  const tema = T || TH;

  useEffect(() => {
    if (appState === null) return; // esperando AsyncStorage
    AsyncStorage.getItem(CAROUSEL_KEY).then(visto => {
      if (!visto) {
        setFase("carousel");
      } else {
        setFase("auth");
      }
    }).catch(() => setFase("auth"));
  }, [appState]);

  // Mostrar splash mientras carga
  if (appState === null || fase === "splash") return <SplashScreen />;

  if (fase === "carousel") {
    return (
      <WelcomeCarousel onDone={async () => {
        await AsyncStorage.setItem(CAROUSEL_KEY, "1");
        setFase("auth");
      }} />
    );
  }

  if (fase === "auth") {
    return (
      <AuthScreen onAuth={() => {
        // Crash fix: pequeño delay para que el estado de user esté listo
        setTimeout(() => setFase("app"), 100);
      }} />
    );
  }

  // Fase "app" — todo listo, renderizar navegación
  return (
    <View style={{ flex:1, backgroundColor:tema.bg }}>
      <StatusBar
        barStyle={isDark || isSurvival ? "light-content" : "dark-content"}
        backgroundColor={tema.bg}
      />
      <View style={{ flex:1, paddingTop:40 }}>
        {!appState.onboarded ? <OnboardingScreen /> : <AppNavigator />}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppShell />
    </FinanceProvider>
  );
}
