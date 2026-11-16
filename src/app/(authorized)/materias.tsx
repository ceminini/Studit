import { auth, db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


type ramo = { id: string, nombres: string, color: string, minutos?: number }
const colores = ["#ADE3DC", "#F9CDA6", "#E1D8F5", "#FBE7A1"];
const horas = (m: number) => `${Math.floor(m / 60)}h ${m % 60}min`;

export default function Materias() {
    const [ramos, setRamos] = useState<ramo[]>([]);
    const [nombres, setNombres] = useState("");
    const [color, setColor] = useState(colores[0]);
    const [idEdit, setidEdit] = useState<string | null>(null);
    const [error, setError] = useState("");

    const uid = auth.currentUser!.uid;
    const ramosR = collection(db, "usuarios", uid, "ramos"); //El orden es importante, sigue la secuencia

    //Ve todos los que hay en lista 
    const cargarR = async () => {
        const snap = await getDocs(ramosR);
        const listaM = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ramo);
        setRamos(listaM);
    };

    useEffect(() => {
        cargarR()
    }, []);


    //Para agregar y editar materias 
    const agregarR = async () => {
        if (!nombres.trim()) return setError("Ingresa tu materia");

        try {
            if (idEdit) {
                await updateDoc(doc(db, "usuarios", uid, "ramos", idEdit), {
                    nombres: nombres.trim(),
                    color: color,
                });
            } else {
                await addDoc(ramosR, {
                    nombres: nombres.trim(),
                    color: color
                });
            }

            setError("");
            setNombres("");
            setidEdit(null);
            cargarR();

        } catch (e: any) {
            setError(e.code || e.message);
        }
    };

    //Borra maaterias
    const borrarR = async (id: string) => {
        await deleteDoc(doc(db, "usuarios", uid, "ramos", id));
        cargarR();
    };
    return (
        <SafeAreaView className="flex-1">
            <ScrollView contentContainerClassName="p-6">
                <Text className="mb-4 text-3xl font-bold">Mis materias</Text>
                {ramos.length === 0 && <Text className="mb-4 text-neutral-950">Aun no hay materias asignadas.Agrega...</Text>}
                {ramos.map((r) => (
                    <View key={r.id} className="mb-3 flex-row items-center justify-between rounded-xl border-2 p-4" style={{ backgroundColor: r.color }}>
                        <Text className="text-lg font-bold">{r.nombres}</Text>
                        <View className="flex-row gap-4">
                            <Pressable onPress={() => { setidEdit(r.id); setNombres(r.nombres); setColor(r.color); }}>
                                <Text className="underline">Editar</Text>
                            </Pressable>
                            <Pressable onPress={() => borrarR(r.id)}>
                                <Text className="underline">Quitar</Text>
                            </Pressable>
                        </View>
                        <View>
                            <Text className="text-lg font-bold">{r.nombres}</Text>
                            <Text>{horas(r.minutos ?? 0)} estudiadas</Text>
                        </View>
                    </View>
                ))}
                <Text className="mb-1 mt-6 font-bold">{idEdit ? "Editando materia" : "Nueva materia"}</Text>
                <TextInput className="mb-3 rounded-lg border-2 p-3" placeholder="Ej: Bases de Datos" value={nombres} onChangeText={setNombres} />

                <View className="mb-4 flex-row gap-3">
                    {colores.map((c) => (
                        <Pressable
                            key={c}
                            onPress={() => setColor(c)}
                            className={`h-10 w-10 rounded-full ${color === c ? "border-4" : "border"}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </View>

                {error !== "" && <Text className="mb-3 text-red-600">{error}</Text>}

                <Pressable className="items-center rounded-2xl border-2 p-3" style={{ backgroundColor: "#ADE3DC" }} onPress={agregarR}>
                    <Text className="font-bold">{idEdit ? "Guardar cambios" : "+ Agregar materia"}</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );

}

