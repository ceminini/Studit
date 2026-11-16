import { auth, db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, increment, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { ReactNode, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

LocaleConfig.locales.es = {
    today: "Hoy",
    dayNames: ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"],
    dayNamesShort: ["D", "L", "M", "X", "J", "V", "S"],
    monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    monthNamesShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
};
LocaleConfig.defaultLocale = "es";

type ramo = { id: string; nombres: string; color: string };
type tarea = { id: string; titulo: string; ramoNombre: string; ramoId: string; color: string; fecha: string; listo: boolean; xp: number; hora?: string };

const fecha = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

//Diseno 
const C = {
    papel: "#F7F5EE",
    cuadricula: "#E9E6DA",
    tinta: "#1A1A1A",
    gris: "#6B6B66",
    verde: "#2E6B5E",
    boton: "#A6E0D7",
    coral: "#E8664A",
    durazno: "#FBDCCD",
    blanco: "#FFFFFF",
};

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

//Feriados
const FERIADOS = [
    "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-21", "2026-06-21", "2026-06-29",
    "2026-07-16", "2026-08-15", "2026-09-18", "2026-09-19", "2026-10-12", "2026-10-31", "2026-11-01",
    "2026-12-08", "2026-12-25",
];

const ConSombra = ({ children, radio = 16, className = "" }: { children: ReactNode; radio?: number; className?: string }) => (
    <View className={className}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: radio, backgroundColor: C.tinta, transform: [{ translateX: 3 }, { translateY: 4 }] }]} />
        {children}
    </View>
);

export default function Tareas() {
    const [ramos, setRamos] = useState<ramo[]>([]);
    const [tareas, setTareas] = useState<tarea[]>([]);
    const [ramoE, setRamoE] = useState<ramo | null>(null);
    const [titulo, setTitulo] = useState("");
    const [diaS, setDiaS] = useState(fecha());
    const [hora, setHora] = useState("");
    const [error, setError] = useState("");
    const uid = auth.currentUser!.uid;
    const tareasR = collection(db, "usuarios", uid, "tareas");


    const [formAbierto, setFormAbierto] = useState(false);
    const [vista, setVista] = useState<"estudio" | "rutinas">("estudio");
    const [mes, setMes] = useState(fecha().slice(0, 7));   // "2026-11"

    const cargar = async () => {
        const snap = await getDocs(collection(db, "usuarios", uid, "ramos"));
        setRamos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ramo));
        const snapT = await getDocs(tareasR);
        setTareas(snapT.docs.map((d) => ({ id: d.id, ...d.data() }) as tarea));
    };

    useEffect(() => {
        cargar();
    }, []);

    const agregarT = async () => {
        if (!titulo.trim())
            return setError("Escribe una tarea");
        if (!ramoE)
            return setError("Escoge un ramo");
        try {
            await addDoc(tareasR, {
                titulo: titulo.trim(),
                ramoId: ramoE.id,
                xp: 100,  //fijo por ahora, corregir
                ramoNombre: ramoE.nombres,
                color: ramoE.color,
                hora: hora.trim(),
                fecha: diaS,
                listo: false,
                creadoEn: serverTimestamp(),
            });
            setTitulo("");
            setHora("");
            setError("");
            setFormAbierto(false);
            cargar();
        } catch (e: any) {
            setError(e.code);
        }
    };

    const selecc = async (t: tarea) => {
        await updateDoc(doc(db, "usuarios", uid, "tareas", t.id), { listo: !t.listo });
        await updateDoc(doc(db, "usuarios", uid), {
            xp: increment(t.listo ? -t.xp : t.xp)
        });
        cargar();
    };

    const borrar = async (id: string) => {
        await deleteDoc(doc(db, "usuarios", uid, "tareas", id));
        cargar();
    };

    // tareas por dia
    const diaT: Record<string, tarea[]> = {};
    tareas.forEach((t) => {
        if (!diaT[t.fecha]) diaT[t.fecha] = [];
        diaT[t.fecha].push(t);
    });


    const marcados: Record<string, any> = { [diaS]: { selected: true } };

    const diaD = tareas.filter((t) => t.fecha === diaS);
    const diaPen = diaD.filter((t) => !t.listo);
    const xpDia = diaPen.reduce((suma, t) => suma + t.xp, 0);
    const entregaM = tareas.filter((t) => t.fecha.startsWith(mes) && !t.listo).length;

    const fechaSel = new Date(diaS + "T12:00:00");
    const tituloDia = `${DIAS[fechaSel.getDay()]} ${fechaSel.getDate()}`;

    // dia calewndario
    const Dia = ({ date, state }: any) => {
        if (!date) return <View style={{ width: 40, height: 52 }} />;
        const ds: string = date.dateString;
        const elegido = ds === diaS;
        const esHoy = state === "today";
        const fuera = state === "disabled";
        const domingo = new Date(ds + "T12:00:00").getDay() === 0;
        const feriado = FERIADOS.includes(ds);

        const delED = diaT[ds] ?? [];
        const colores = [...new Set(delED.filter((t) => !t.listo).map((t) => t.color))].slice(0, 3);
        const listasH = delED.some((t) => t.listo);

        const caja = (
            <View
                className="items-center justify-center rounded-lg"
                style={{
                    width: 38,
                    height: 40,
                    backgroundColor: elegido ? C.boton : feriado ? C.durazno : "transparent",
                    borderWidth: elegido || esHoy ? 2 : 0,
                    borderColor: elegido ? C.tinta : C.coral,
                }}
            >
                <Text style={{ fontWeight: elegido ? "900" : "700", fontSize: 15, color: domingo || feriado ? C.coral : C.tinta }}>
                    {date.day}
                </Text>
                {feriado && <Text style={{ fontSize: 7, fontWeight: "700", color: C.coral }}>FER.</Text>}
            </View>
        );

        return (
            <Pressable onPress={() => setDiaS(ds)} className="items-center" style={{ width: 40, height: 52, opacity: fuera ? 0.3 : 1 }}>
                {elegido ? <ConSombra radio={8}>{caja}</ConSombra> : caja}
                <View className="mt-1 flex-row gap-0.5">
                    {colores.map((c) => (
                        <View key={c} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c, borderWidth: 1, borderColor: C.tinta }} />
                    ))}
                    {listasH && colores.length < 3 && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.verde }} />}
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: C.papel }}>
            {/* fondo*/}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                    <Pattern id="hoja" width={22} height={22} patternUnits="userSpaceOnUse">
                        <Path d="M 22 0 L 0 0 0 22" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#hoja)" />
            </Svg>

            <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 480, alignSelf: "center", padding: 20, paddingBottom: 40 }}>
                <View className="mb-4 flex-row items-end justify-between">
                    <View>
                        <Text className="text-base italic" style={{ color: C.verde }}>
                            {entregaM} {entregaM === 1 ? "entrega" : "entregas"} este mes
                        </Text>
                        <Text className="text-4xl" style={{ fontWeight: "900", color: C.tinta }}>Agenda</Text>
                    </View>
                    <ConSombra radio={14}>
                        <Pressable
                            onPress={() => { setError(""); setFormAbierto(true); }}
                            className="h-14 w-14 items-center justify-center border-2"
                            style={{ borderRadius: 14, backgroundColor: C.boton, borderColor: C.tinta }}
                        >
                            <Text style={{ fontSize: 30, fontWeight: "700", color: C.tinta, marginTop: -2 }}>+</Text>
                        </Pressable>
                    </ConSombra>
                </View>

                {/* Estudio, Rutinas */}
                <View className="mb-4 flex-row rounded-2xl border-2 p-1.5" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                    {(["estudio", "rutinas"] as const).map((v) => (
                        <Pressable
                            key={v}
                            onPress={() => setVista(v)}
                            className="flex-1 items-center rounded-xl py-2.5"
                            style={vista === v ? { backgroundColor: C.boton, borderWidth: 2, borderColor: C.tinta } : { borderWidth: 2, borderColor: "transparent" }}
                        >
                            <Text className="font-bold" style={{ color: C.tinta }}>{v === "estudio" ? "Estudio" : "Rutinas"}</Text>
                        </Pressable>
                    ))}
                </View>

                {vista === "rutinas" ? (
                    <View className="items-center rounded-2xl border-2 p-8" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                        <Text className="text-lg font-bold" style={{ color: C.tinta }}>Rutinas</Text>
                    </View>
                ) : (
                    <>
                        {/* Calendario */}
                        <View className="mb-6 rounded-2xl border-2 px-2 pb-3" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                            <Calendar
                                current={diaS}
                                firstDay={1}
                                markedDates={marcados}
                                dayComponent={Dia}
                                onMonthChange={(m) => setMes(`${m.year}-${String(m.month).padStart(2, "0")}`)}
                                theme={{
                                    calendarBackground: "transparent",
                                    arrowColor: C.tinta,
                                    monthTextColor: C.tinta,
                                    textMonthFontWeight: "900",
                                    textMonthFontSize: 18,
                                    textSectionTitleColor: C.tinta,
                                    textDayHeaderFontWeight: "700",
                                }}
                            />


                            <View className="mx-2 mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2" style={{ borderColor: C.cuadricula }}>
                                {ramos.map((r) => (
                                    <View key={r.id} className="flex-row items-center gap-1">
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color, borderWidth: 1, borderColor: C.tinta }} />
                                        <Text className="text-xs" style={{ color: C.gris }}>{r.nombres}</Text>
                                    </View>
                                ))}
                                <View className="flex-row items-center gap-1">
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.verde }} />
                                    <Text className="text-xs" style={{ color: C.gris }}>lista</Text>
                                </View>
                                <View className="flex-row items-center gap-1">
                                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: C.durazno, borderWidth: 1, borderColor: C.coral }} />
                                    <Text className="text-xs" style={{ color: C.gris }}>feriado / domingo</Text>
                                </View>
                            </View>
                        </View>

                        {/* Tareas del día */}
                        <View className="mb-3 flex-row items-end justify-between">
                            <Text className="text-2xl" style={{ fontWeight: "900", color: C.tinta }}>{tituloDia}</Text>
                            {diaPen.length > 0 && (
                                <Text className="italic" style={{ color: C.verde }}>
                                    {diaPen.length} {diaPen.length === 1 ? "entrega" : "entregas"} · hasta +{xpDia} XP
                                </Text>
                            )}
                        </View>

                        {diaD.length === 0 && (
                            <View className="items-center rounded-2xl border-2 border-dashed p-6" style={{ borderColor: C.gris }}>
                                <Text style={{ color: C.gris }}>Nada para este día 🎉</Text>
                                <Text className="text-xs" style={{ color: C.gris }}>Toca + para agregar meta</Text>
                            </View>
                        )}

                        {diaD.map((t) => (
                            <View key={t.id} className="mb-3 flex-row items-center gap-3 rounded-2xl border-2 p-3" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                                <Pressable
                                    onPress={() => selecc(t)}
                                    className="h-7 w-7 items-center justify-center rounded-md border-2"
                                    style={{ backgroundColor: t.listo ? C.verde : C.blanco, borderColor: C.tinta }}
                                >
                                    {t.listo && <Text className="font-bold" style={{ color: C.blanco }}>✓</Text>}
                                </Pressable>

                                <View className="flex-1">
                                    <Text className={`text-base font-bold ${t.listo ? "line-through" : ""}`} style={{ color: t.listo ? C.gris : C.tinta }}>
                                        {t.titulo}
                                    </Text>
                                    <View className="mt-1 flex-row items-center gap-2">
                                        <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: t.color }}>
                                            <Text className="text-xs font-bold" style={{ color: C.tinta }}>{t.ramoNombre}</Text>
                                        </View>
                                        <Text className="text-xs" style={{ color: C.gris }}>{t.hora ? t.hora : "sin hora"}</Text>
                                    </View>
                                </View>

                                <View className="items-end gap-2">
                                    <View className="rounded-full border px-2 py-0.5" style={{ backgroundColor: C.durazno, borderColor: C.coral }}>
                                        <Text className="text-xs font-bold" style={{ color: C.coral }}>+{t.xp} XP</Text>
                                    </View>
                                    <Pressable onPress={() => borrar(t.id)} hitSlop={8}>
                                        <Text className="text-xs underline" style={{ color: C.gris }}>Quitar</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>

            {/* + para agregar */}
            <Modal visible={formAbierto} transparent animationType="fade" onRequestClose={() => setFormAbierto(false)}>
                <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={() => setFormAbierto(false)}>
                    <Pressable
                        onPress={() => { }}
                        className="w-full rounded-t-3xl border-2 p-6"
                        style={{ maxWidth: 480, alignSelf: "center", backgroundColor: C.papel, borderColor: C.tinta }}
                    >
                        <Text className="text-base italic" style={{ color: C.verde }}>nueva entrega</Text>
                        <Text className="mb-4 text-2xl" style={{ fontWeight: "900", color: C.tinta }}>Para el {tituloDia}</Text>

                        <TextInput
                            className="mb-3 rounded-xl border-2 p-3"
                            style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                            placeholder="Ej: Informe de normalización"
                            value={titulo}
                            onChangeText={setTitulo}
                        />
                        <TextInput
                            className="mb-3 rounded-xl border-2 p-3"
                            style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                            placeholder="Hora (opcional), ej: 23:59"
                            value={hora}
                            onChangeText={setHora}
                        />

                        <Text className="mb-2 font-bold" style={{ color: C.tinta }}>Ramo</Text>
                        <View className="mb-4 flex-row flex-wrap gap-2">
                            {ramos.length === 0 && <Text style={{ color: C.gris }}>Primero agrega una materia.</Text>}
                            {ramos.map((r) => (
                                <Pressable
                                    key={r.id}
                                    onPress={() => setRamoE(r)}
                                    className={`rounded-full px-4 py-2 ${ramoE?.id === r.id ? "border-[3px]" : "border"}`}
                                    style={{ backgroundColor: r.color, borderColor: C.tinta }}
                                >
                                    <Text className="font-bold" style={{ color: C.tinta }}>{r.nombres}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {error !== "" && <Text className="mb-3" style={{ color: C.coral }}>{error}</Text>}

                        <ConSombra radio={16} className="mb-4">
                            <Pressable onPress={agregarT} className="items-center rounded-2xl border-2 py-3.5" style={{ backgroundColor: C.boton, borderColor: C.tinta }}>
                                <Text className="text-lg font-bold" style={{ color: C.tinta }}>+ Agregar entrega</Text>
                            </Pressable>
                        </ConSombra>
                        <Pressable onPress={() => setFormAbierto(false)} className="items-center">
                            <Text className="underline" style={{ color: C.gris }}>Cancelar</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}
