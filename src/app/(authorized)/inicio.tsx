import { auth, db } from "@/lib/firebase";
import { rachaViva } from "@/lib/racha";
import { router, useFocusEffect } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function Inicio() {
    const [nombre, setNombre] = useState("");
    const [racha, setRacha] = useState(0);
    const [mejor, setMejor] = useState(0);
    const [xp, setXp] = useState(0);

    // useFocusEffect: corre CADA VEZ que vuelves a esta pantalla (useEffect corría una sola vez)
    useFocusEffect(
        useCallback(() => {
            const cargarUser = async () => {
                const uid = auth.currentUser!.uid;
                const snap = await getDoc(doc(db, "usuarios", uid));
                if (snap.exists()) {
                    const datos = snap.data();
                    setNombre(datos.nombre);
                    setRacha(rachaViva(datos));
                    setMejor(datos.rachaMe ?? 0);
                    setXp(datos.xp ?? 0);
                }
            };
            cargarUser();
        }, [])
    );

    return (
        <View className="flex-auto items-center justify-center">
            <Text className="text-2xl">Bienvenidoooo, {nombre}</Text>

            <View className="mt-4 items-center rounded-2xl border-2 px-6 py-3" style={{ backgroundColor: "#FBDCCD" }}>
                <Text className="text-xl font-bold">{racha} {racha === 1 ? "día" : "días"} de racha</Text>
                <Text className="text-neutral-600">Mejor racha: {mejor} · {xp} XP</Text>
            </View>

            <Pressable onPress={() => router.push("/perfilUsuario")}>
                <Text className="mt-4 underline">Ir al perfil</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/tareas")}>
                <Text className="mt-4 underline">Tareas </Text>
            </Pressable>

            <Pressable onPress={() => router.push("/materias")}>
                <Text className="mt-4 underline">Mis ramos</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/pomodoro")}>
                <Text className="mt-4 underline">Pomodoro </Text>
            </Pressable>
        </View>
    );
}
