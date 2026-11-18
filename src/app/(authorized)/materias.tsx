import { auth, db } from "@/lib/firebase";
import { router } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { C } from "@/lib/colores";


type ramo = { id: string, nombres: string, color: string, minutos?: number, meta?: number }
type sesion = { ramoId: string, minutos: number, dia: string }
type tarea = { ramoId: string, titulo: string, fecha: string, listo: boolean }

// colores por asignatura
const colores = [
    { hex: "#ADE3DC", nombre: "Menta" },
    { hex: "#F9CDA6", nombre: "Durazno" },
    { hex: "#E1D8F5", nombre: "Lila" },
    { hex: "#FBE7A1", nombre: "Amarillo" },
    { hex: "#CFE3FA", nombre: "Celeste" },
    { hex: "#F9D3E3", nombre: "Rosa" },
];
const horas = (m: number) => `${Math.floor(m / 60)}h ${m % 60}min`;

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

const formatear = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// para contar horas
const lunes = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return formatear(d);
};

//SE OSCURECE MULTIPLECANDO POR 0.5
const oscurecer = (hex: string, factor = 0.7) => {
    const canal = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * factor).toString(16).padStart(2, "0");
    return `#${canal(1)}${canal(3)}${canal(5)}`;
};


const corto = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}`;

const diaCorto = (f: string) => {
    const d = new Date(f + "T12:00:00");
    return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
};

const ConSombra = ({ children, radio = 16, className = "" }: { children: ReactNode; radio?: number; className?: string }) => (
    <View className={className}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: radio, backgroundColor: C.tinta, transform: [{ translateX: 3 }, { translateY: 4 }] }]} />
        {children}
    </View>
);

export default function Materias() {
    const [ramos, setRamos] = useState<ramo[]>([]);
    const [nombres, setNombres] = useState("");
    const [color, setColor] = useState(colores[0].hex);
    const [meta, setMeta] = useState(4);   // horas por semana
    const [idEdit, setidEdit] = useState<string | null>(null);
    const [error, setError] = useState("");

    //Tarjetas de materia
    const [sesiones, setSesiones] = useState<sesion[]>([]);
    const [tareas, setTareas] = useState<tarea[]>([]);

    const uid = auth.currentUser!.uid;
    const ramosR = collection(db, "usuarios", uid, "ramos"); //El orden es importante, si no muere

    //Ve todos los que hay en lista
    const cargarR = async () => {
        const snap = await getDocs(ramosR);
        const listaM = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ramo);
        setRamos(listaM);

        const snapS = await getDocs(collection(db, "usuarios", uid, "sesion"));
        setSesiones(snapS.docs.map((d) => d.data() as sesion));
        const snapT = await getDocs(collection(db, "usuarios", uid, "tareas"));
        setTareas(snapT.docs.map((d) => d.data() as tarea));
    };

    useEffect(() => {
        cargarR()
    }, []);

    const limpiar = () => {
        setError("");
        setNombres("");
        setMeta(4);
        setColor(colores[0].hex);
        setidEdit(null);
    };

    // agregar y editar materias
    const agregarR = async () => {
        if (!nombres.trim()) return setError("Ingresa tu materia");

        try {
            if (idEdit) {
                await updateDoc(doc(db, "usuarios", uid, "ramos", idEdit), {
                    nombres: nombres.trim(),
                    color: color,
                    meta: meta,
                });
            } else {
                await addDoc(ramosR, {
                    nombres: nombres.trim(),
                    color: color,
                    meta: meta,
                });
            }

            limpiar();
            cargarR();

        } catch (e: any) {
            setError(e.code || e.message);
        }
    };

    //borrar
    const borrarR = async (id: string) => {
        await deleteDoc(doc(db, "usuarios", uid, "ramos", id));
        limpiar();
        cargarR();
    };

    const editar = (r: ramo) => {
        setidEdit(r.id);
        setNombres(r.nombres);
        setColor(r.color);
        setMeta(r.meta ?? 4);
        setError("");
    };

    //calculo para las tarjetas 
    const desdeLunes = lunes();
    const hoyS = formatear(new Date());
    const minutosSemana = (id: string) =>
        sesiones.filter((s) => s.ramoId === id && s.dia >= desdeLunes).reduce((suma, s) => suma + (s.minutos ?? 0), 0);
    const proxima = (id: string) =>
        tareas
            .filter((t) => t.ramoId === id && !t.listo && t.fecha >= hoyS)
            .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

    const ahora = new Date();
    const semestre = `${ahora.getFullYear()}-${ahora.getMonth() >= 6 ? 2 : 1}`;
    const nombreColor = colores.find((c) => c.hex === color)?.nombre ?? "";

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: C.papel }}>
            {/* Fondo*/}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Pattern id="hoja" width={26} height={26} patternUnits="userSpaceOnUse">
                        <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#hoja)" />
            </Svg>

            <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 480, alignSelf: "center", padding: 20, paddingBottom: 40 }}>
                <View className="mb-5 flex-row items-center gap-3">
                    <Pressable
                        onPress={() => router.back()}
                        className="h-11 w-11 items-center justify-center rounded-xl border-2"
                        style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                    >
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                            <Path d="M15 5 L8 12 L15 19" fill="none" stroke={C.tinta} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </Pressable>
                    <View>
                        <Text className="italic" style={{ color: C.verde }}>
                            semestre {semestre} · {ramos.length} {ramos.length === 1 ? "ramo" : "ramos"}
                        </Text>
                        <Text className="text-3xl" style={{ fontWeight: "900", color: C.tinta }}>Mis ramos</Text>
                    </View>
                </View>

                {ramos.length === 0 && (
                    <View className="mb-5 items-center rounded-2xl border-2 border-dashed p-6" style={{ borderColor: C.gris }}>
                        <Text style={{ color: C.gris }}>Aún no tienes ramos. Agrega el primero abajo.</Text>
                    </View>
                )}

                {/* Tarjetas de ramos */}
                {ramos.map((r) => {
                    const semana = minutosSemana(r.id);
                    const metaMin = (r.meta ?? 4) * 60;
                    const avance = Math.min(1, semana / metaMin);
                    const prox = proxima(r.id);
                    return (
                        <ConSombra key={r.id} radio={14} className="mb-5">
                            <View className="rounded-[14px] border-2 p-4" style={{ backgroundColor: r.color, borderColor: C.tinta }}>
                                <View className="flex-row items-start justify-between">
                                    <View className="flex-1 pr-3">
                                        <Text className="text-lg" style={{ fontWeight: "900", color: C.tinta }}>{r.nombres}</Text>
                                        <Text className="text-xs" style={{ color: C.gris }}>{horas(r.minutos ?? 0)} en total</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => editar(r)}
                                        className="h-10 w-10 items-center justify-center rounded-lg border-2"
                                        style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                                    >
                                        <Svg width={16} height={16} viewBox="0 0 24 24">
                                            <Path d="M4 20 L4 16 L15 5 L19 9 L8 20 Z M13 7 L17 11" fill="none" stroke={C.tinta} strokeWidth={2.2} strokeLinejoin="round" />
                                        </Svg>
                                    </Pressable>
                                </View>

                                {/* barra de metricas*/}
                                <View className="mt-3 flex-row items-center gap-3">
                                    <View className="h-3 flex-1 overflow-hidden rounded-full border-2" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                                        <View className="h-full" style={{ width: `${avance * 100}%`, backgroundColor: oscurecer(r.color) }} />
                                    </View>
                                    <Text className="text-xs font-bold" style={{ color: C.tinta }}>
                                        {corto(semana)} / {r.meta ?? 4} h
                                    </Text>
                                </View>

                                <Text className="mt-2 text-xs" style={{ color: C.tinta }}>
                                    <Text className="font-bold">próx.: </Text>
                                    {prox ? `${prox.titulo}, ${diaCorto(prox.fecha)}` : "sin entregas pendientes"}
                                </Text>
                            </View>
                        </ConSombra>
                    );
                })}


                <View className="mt-2 rounded-2xl border-2 p-5" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                    <View className="mb-4 flex-row items-center justify-between">
                        <Text className="text-xl" style={{ fontWeight: "900", color: C.tinta }}>{idEdit ? "Editando ramo" : "Nuevo ramo"}</Text>
                        <Text className="text-xs italic" style={{ color: C.verde }}>el color se usa en todo</Text>
                    </View>

                    <Text className="mb-1 font-bold" style={{ color: C.tinta }}>Nombre</Text>
                    <TextInput
                        className="mb-4 rounded-xl border-2 p-3"
                        style={{ backgroundColor: C.input, borderColor: C.tinta }}
                        placeholder="Ej: Cálculo II"
                        value={nombres}
                        onChangeText={setNombres}
                    />

                    <Text className="mb-2" style={{ color: C.tinta }}>
                        <Text className="font-bold">Color</Text>
                        <Text style={{ color: C.gris }}> · {nombreColor}</Text>
                    </Text>
                    <View className="mb-5 flex-row justify-between">
                        {colores.map((c) => (
                            <Pressable
                                key={c.hex}
                                onPress={() => setColor(c.hex)}
                                className="h-11 w-11 items-center justify-center rounded-full"
                                style={{ backgroundColor: c.hex, borderColor: C.tinta, borderWidth: color === c.hex ? 3 : 1.5 }}
                            >
                                {color === c.hex && (
                                    <Svg width={18} height={18} viewBox="0 0 24 24">
                                        <Path d="M5 12 L10 17 L19 7" fill="none" stroke={C.tinta} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                )}
                            </Pressable>
                        ))}
                    </View>

                    {/*meta */}
                    <View className="mb-5 flex-row items-center justify-between">
                        <View className="flex-1 pr-3">
                            <Text className="font-bold" style={{ color: C.tinta }}>Meta semanal</Text>
                            <Text className="text-xs" style={{ color: C.gris }}>horas de estudio fuera de clase</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <Pressable
                                onPress={() => setMeta(Math.max(1, meta - 1))}
                                className="h-10 w-10 items-center justify-center rounded-lg border-2"
                                style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                            >
                                <Text className="text-xl font-bold" style={{ color: C.tinta }}>−</Text>
                            </Pressable>
                            <Text className="w-12 text-center text-xl" style={{ fontWeight: "900", color: C.tinta }}>{meta} h</Text>
                            <Pressable
                                onPress={() => setMeta(Math.min(30, meta + 1))}
                                className="h-10 w-10 items-center justify-center rounded-lg border-2"
                                style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                            >
                                <Text className="text-xl font-bold" style={{ color: C.tinta }}>+</Text>
                            </Pressable>
                        </View>
                    </View>

                    {error !== "" && <Text className="mb-3 text-red-600">{error}</Text>}

                    <ConSombra radio={16}>
                        <Pressable
                            onPress={agregarR}
                            className="flex-row items-center justify-center gap-2 rounded-2xl border-2 py-3.5"
                            style={{ backgroundColor: C.boton, borderColor: C.tinta }}
                        >
                            {!idEdit && (
                                <Svg width={16} height={16} viewBox="0 0 24 24">
                                    <Path d="M12 4 L12 20 M4 12 L20 12" stroke={C.tinta} strokeWidth={3.5} strokeLinecap="round" />
                                </Svg>
                            )}
                            <Text className="text-lg font-bold" style={{ color: C.tinta }}>{idEdit ? "Guardar cambios" : "Agregar ramo"}</Text>
                        </Pressable>
                    </ConSombra>

                    {idEdit && (
                        <View className="mt-4 flex-row justify-center gap-8">
                            <Pressable onPress={limpiar}>
                                <Text className="underline" style={{ color: C.gris }}>Cancelar</Text>
                            </Pressable>
                            <Pressable onPress={() => borrarR(idEdit)}>
                                <Text className="underline" style={{ color: C.coral }}>Quitar ramo</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );

}
