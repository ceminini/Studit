import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PerfilUsuario() {
    const [nombre, setNombre] = useState("")
    const [correo, setCorreo] = useState("")
    const [mensaje, setMensaje] = useState("")
    const uid = auth.currentUser!.uid;


    useEffect(() => {
        const cargar = async () => {
            const snap = await getDoc(doc(db, "usuarios", uid));
            if (snap.exists()) {
                const info = snap.data();
                setCorreo(info.correo);
                setNombre(info.nombre);

            }
        };
        cargar();
    }, []);

    const guardar = async () => {
        if (!nombre.trim()) return setMensaje("No puede quedar el nombre vacio");
        try {
            await updateDoc(doc(db, "usuarios", uid), {
                nombre: nombre.trim(),
            });
            setMensaje("Guardado");
        } catch (e: any) {
            setMensaje(e.code);
        }
    };

    const salir = async () => {
        await signOut(auth);
    };
    return (
        <SafeAreaView className="flex-1 p-6">
            <Text className="mb-6 text-3xl font-bold">Mi perfil</Text>

            <Text className="mb-1 font-bold">Correo</Text>
            <Text className="mb-4 text-neutral-600">{correo}</Text>

            <Text className="mb-1 font-bold">Nombre</Text>
            <TextInput
                className="mb-4 rounded-lg border-2 p-3"
                value={nombre}
                onChangeText={setNombre}
            />

            {mensaje !== "" && <Text className="mb-3">{mensaje}</Text>}

            <Pressable className="mb-3 items-center rounded-2xl border-2 bg-emerald-200 p-3" onPress={guardar}>
                <Text className="font-bold">Guardar cambios</Text>
            </Pressable>

            <Pressable className="items-center rounded-2xl border-2 p-3" onPress={salir}>
                <Text className="font-bold">Cerrar sesión</Text>
            </Pressable>
        </SafeAreaView>
    );
}


