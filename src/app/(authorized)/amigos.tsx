import { auth, db } from "@/lib/firebase";
import { useFocusEffect } from "expo-router";
import { arrayUnion, collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "@/lib/colores";
import Fondo from "@/components/Fondo";


type amigo = { uid: string; nombre: string; usuario: string; xp: number };

export default function Amigos() {
    const uid = auth.currentUser!.uid;
    const [correoB, setCorreoB] = useState("");
    const [amigos, setAmigos] = useState<amigo[]>([]);
    const [mensaje, setMensaje] = useState("");
    const [yoA, setYoA] = useState<amigo | null>(null);
    const cargarA = async () => {
        const snap = await getDoc(doc(db, "usuarios", uid));
        const m = snap.data()!;
        setYoA({ uid, nombre: m.nombre, usuario: m.usuario, xp: m.xp ?? 0 });
        const idsA: string[] = snap.data()?.amigos ?? [];
        const listaA = await Promise.all(idsA.map(async (id) => {
            const d = (await getDoc(doc(db, "usuarios", id))).data()!;
            return { uid: id, nombre: d.nombre, usuario: d.usuario, xp: d.xp ?? 0 };
        }));
        setAmigos(listaA);
    };

    useFocusEffect(useCallback(() => { cargarA(); }, []));

    const agregarA = async () => {
        const correo = correoB.trim();
        if (!correo) return setMensaje("Escribe un correo");
        const opciones = [...new Set([correo, correo.toLowerCase()])];
        const snap = await getDocs(query(collection(db, "usuarios"), where("correo", "in", opciones)));
        if (snap.empty) return setMensaje("No hay nadie con ese correo");
        const otroU = snap.docs[0].id;
        if (otroU === uid) return setMensaje("Ese eres tú ");
        if (amigos.some((a) => a.uid === otroU)) return setMensaje("Ya es tu amigo");
        await updateDoc(doc(db, "usuarios", uid), { amigos: arrayUnion(otroU) });
        await updateDoc(doc(db, "usuarios", otroU), { amigos: arrayUnion(uid) });
        setCorreoB("");
        setMensaje("Amigo agregado!");
        cargarA();
    };

    const rankingA = [...amigos, ...(yoA ? [yoA] : [])].sort((a, b) => b.xp - a.xp);

    return (
        <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: C.papel }}>
            <Fondo />
            <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 480, alignSelf: "center", padding: 20 }}>
                <Text className="mb-5 text-4xl" style={{ fontWeight: "900", color: C.tinta }}>Amigos</Text>

                <Text className="mb-2 font-bold" style={{ color: C.tinta }}>Agregar por correo</Text>
                <View className="mb-2 flex-row gap-2">
                    <TextInput
                        className="flex-1 rounded-xl border-2 p-3"
                        style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                        placeholder="correo@ejemplo.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={correoB}
                        onChangeText={setCorreoB}
                    />
                    <Pressable onPress={agregarA} className="justify-center rounded-xl border-2 px-4" style={{ backgroundColor: C.boton, borderColor: C.tinta }}>
                        <Text className="font-bold" style={{ color: C.tinta }}>Agregar</Text>
                    </Pressable>
                </View>
                {mensaje !== "" && <Text className="mb-2" style={{ color: C.verde }}>{mensaje}</Text>}

                <Text className="mb-3 mt-6 text-xl" style={{ fontWeight: "900", color: C.tinta }}>Ranking</Text>
                {amigos.length === 0 && (
                    <View className="items-center rounded-2xl border-2 border-dashed p-6" style={{ borderColor: C.gris }}>
                        <Text style={{ color: C.gris }}>Aún no tienes amigos agregados</Text>
                    </View>
                )}
                {rankingA.map((a, i) => (
                    <View key={a.uid} className="mb-3 flex-row items-center gap-3 rounded-2xl border-2 p-3" style={{ backgroundColor: a.uid === uid ? C.boton : C.blanco, borderColor: C.tinta }}>
                        <Text className="w-8 text-center text-xl" style={{ fontWeight: "900", color: C.tinta }}>{i + 1}</Text>
                        <View className="flex-1">
                            <Text className="font-bold" style={{ color: C.tinta }}>{a.uid === uid ? `${a.nombre} (tú)` : a.nombre}</Text>
                            <Text className="text-xs" style={{ color: C.gris }}>@{a.usuario}</Text>
                        </View>
                        <Text className="font-bold" style={{ color: C.coral }}>{a.xp} XP</Text>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}