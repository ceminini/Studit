import "../../global.css";
import { Stack } from "expo-router";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { Auth } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useFonts } from "expo-font";
import { FUENTES } from "@/components/Texto";

export default function RootLayout() {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fuenteL] = useFonts(FUENTES);

  useEffect(() => {
    const offline = onAuthStateChanged(auth, (user)=> {
      setUsuario(user);
      setCargando(false);
    });
  return offline;

}, []);

if (cargando || !fuenteL) return null;
const conectado = usuario !== null;

return (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!conectado}>
      <Stack.Screen name="ingreso"/>
      <Stack.Screen name="registro"/>
    </Stack.Protected>

    <Stack.Protected guard={conectado}>
      <Stack.Screen name="(authorized)" />
    </Stack.Protected>
  </Stack>

);
  
  
  
  
}
