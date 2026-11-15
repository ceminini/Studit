import { auth, db } from "@/lib/firebase";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

export default function Inicio() {
    const [nombre, setNombre] = useState("");

    useEffect(() => {
        const cargarUser = async () => {
            const uid = auth.currentUser!.uid;
            const snap = await getDoc(doc(db, "usuarios", uid));
            if (snap.exists()) {
                setNombre(snap.data().nombre);

            }

        };
        cargarUser();
    }, []);

    return (
        <View className="flex-auto items-center justify-center">
            <Text className="text-2xl">Bienvenidoooo, {nombre}</Text>
            <Pressable onPress={() => router.push("/perfilUsuario")}>
                <Text className="mt-4 underline">Ir al perfil</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/materias")}>
                <Text className="mt-4 underline">Mis ramos</Text>
            </Pressable>
        </View>
    );
}