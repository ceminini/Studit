import { auth, db } from "@/lib/firebase";
import { cancelarRecordatorio, programarRecordatorio, programarR } from "@/lib/notificaciones";
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, increment, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { ReactNode, useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, View, Platform } from "react-native";
import { Text, TextInput } from "@/components/Texto";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { subida, subioN } from "@/lib/nivel";
import SubioNivel from "@/components/SubioNivel";
import { C } from "@/lib/colores";

LocaleConfig.locales.es = {
    today: "Hoy",
    dayNames: ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"],
    dayNamesShort: ["D", "L", "M", "X", "J", "V", "S"],
    monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
    monthNamesShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
};
LocaleConfig.defaultLocale = "es";

type ramo = { id: string; nombres: string; color: string };
type tarea = { id: string; titulo: string; ramoNombre: string; ramoId: string; color: string; fecha: string; listo: boolean; xp: number; hora?: string, notifId?: string; descripcion?: string };
type rutina = { id: string; titulo: string; tipo: string; inicio: string; fin: string; dias: number[]; hechos: string[]; xp: number; notifIds?: string[] };


const TIPOS = ["dormir", "ejercicio", "ocio", "trabajo", "otro"];
const fecha = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
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
    const [descripcion, setDescripcion] = useState("");
    const [tareaE, setTareaE] = useState<tarea | null>(null);
    const [diaS, setDiaS] = useState(fecha());
    const [hora, setHora] = useState("");
    const [error, setError] = useState("");
    const [nivelN, setNivelN] = useState<subida | null>(null); // pantalla de subir de nivel
    const uid = auth.currentUser!.uid;
    const tareasR = collection(db, "usuarios", uid, "tareas");
    const rutinaR = collection(db, "usuarios", uid, "rutina");
    const [rutinas, setRutinas] = useState<rutina[]>([]);
    const [tipoE, setTipoE] = useState("");
    const [inicio, setInicio] = useState("");
    const [fin, setFin] = useState("");
    const [dias, setDias] = useState<number[]>([]);

    const [formAbierto, setFormAbierto] = useState(false);
    const [vista, setVista] = useState<"estudio" | "rutinas">("estudio");
    const [mes, setMes] = useState(fecha().slice(0, 7));   // "2026-11"

    const cargar = async () => {
        const snap = await getDocs(collection(db, "usuarios", uid, "ramos"));
        setRamos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ramo));
        const snapT = await getDocs(tareasR);
        setTareas(snapT.docs.map((d) => ({ id: d.id, ...d.data() }) as tarea));
        const snapR = await getDocs(rutinaR);
        setRutinas(snapR.docs.map((d) => ({ id: d.id, ...d.data() }) as rutina));
    };

    useFocusEffect(
        useCallback(() => {
            cargar();
        }, [])
    );

    const agregarT = async () => {
        if (!titulo.trim())
            return setError("Escribe una tarea");
        if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(hora.trim()))
            return setError("Escribe la hora, ej: 23:59");
        if (!ramoE)
            return setError("Escoge un ramo");
        try {
            if (tareaE) {
                if (tareaE.notifId) await cancelarRecordatorio(tareaE.notifId);
                const notifE = await programarRecordatorio(titulo.trim(), tareaE.fecha, hora.trim());
                await updateDoc(doc(db, "usuarios", uid, "tareas", tareaE.id), {
                    titulo: titulo.trim(),
                    descripcion: descripcion.trim(),
                    ramoId: ramoE.id,
                    ramoNombre: ramoE.nombres,
                    color: ramoE.color,
                    hora: hora.trim(),
                    notifId: notifE ?? null,
                });
                cerrarF();
                cargar();
                return;
            }
            const nuevaT = await addDoc(tareasR, {
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                ramoId: ramoE.id,
                xp: 100,  //fijo por ahora, corregir
                ramoNombre: ramoE.nombres,
                color: ramoE.color,
                hora: hora.trim(),
                fecha: diaS,
                listo: false,
                creadoEn: serverTimestamp(),
            });
            const notifId = await programarRecordatorio(titulo.trim(), diaS, hora.trim());
            if (notifId) await updateDoc(nuevaT, { notifId });
            cerrarF();
            cargar();
        } catch (e: any) {
            setError(e.code);
        }
    };

    const editarT = (t: tarea) => {
        setTareaE(t);
        setTitulo(t.titulo);
        setDescripcion(t.descripcion ?? "");
        setHora(t.hora ?? "");
        setRamoE(ramos.find((r) => r.id === t.ramoId) ?? null);
        setError("");
        setVista("estudio");
        setFormAbierto(true);
    };

    const cerrarF = () => {
        setTareaE(null);
        setTitulo("");
        setDescripcion("");
        setHora("");
        setError("");
        setFormAbierto(false);
    };
    const agregarR = async () => {
        if (!titulo.trim()) return setError("Escribe una actividad");
        if (!tipoE) return setError("Escoge un tipo");
        if (!inicio || !fin) return setError("Elige la hora de inicio y fin");
        if (dias.length === 0) return setError("Escoge al menos un día");
        try {
            const nuevaR = await addDoc(rutinaR, {
                titulo: titulo.trim(),
                tipo: tipoE,
                inicio,
                fin,
                dias,
                hechos: [],
                xp: 50,
                creadoEn: serverTimestamp(),
            });
            const notifIds = await programarR(titulo.trim(), inicio, dias);
            if (notifIds.length > 0) await updateDoc(nuevaR, { notifIds });
            setTitulo("");
            setTipoE("");
            setInicio("");
            setFin("");
            setDias([]);
            setError("");
            setFormAbierto(false);
            cargar();
        } catch (e: any) {
            setError(e.code);
        }
    };

    const elegirH = (guardarH: (h: string) => void) => {
        DateTimePickerAndroid.open({
            value: new Date(),
            mode: "time",
            is24Hour: true,
            onChange: (event, fecha) => {
                if (event.type !== "set" || !fecha) return;
                const hh = String(fecha.getHours()).padStart(2, "0");
                const mm = String(fecha.getMinutes()).padStart(2, "0");
                guardarH(`${hh}:${mm}`);
            },
        });
    };

    const campoH = (valorH: string, setValorH: (h: string) => void, textoH: string) =>
        Platform.OS === "web" ? (
            <TextInput
                className="mb-3 flex-1 rounded-xl border-2 p-3"
                style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                placeholder={`${textoH}, ej: 18:00`}
                value={valorH}
                onChangeText={setValorH}
            />
        ) : (
            <Pressable
                onPress={() => elegirH(setValorH)}
                className="mb-3 flex-1 rounded-xl border-2 p-3"
                style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
            >
                <Text style={{ color: valorH ? C.tinta : C.gris }}>{valorH ? valorH : textoH}</Text>
            </Pressable>
        );

    const selecc = async (t: tarea) => {
        await updateDoc(doc(db, "usuarios", uid, "tareas", t.id), { listo: !t.listo });
        await updateDoc(doc(db, "usuarios", uid), {
            xp: increment(t.listo ? -t.xp : t.xp)
        });
        if (!t.listo) setNivelN(await subioN(uid, t.xp));
        cargar();
    };

    const borrar = async (t: tarea) => {
        if (t.notifId) await cancelarRecordatorio(t.notifId);
        await deleteDoc(doc(db, "usuarios", uid, "tareas", t.id));
        if (t.listo) await updateDoc(doc(db, "usuarios", uid), { xp: increment(-t.xp) });
        cargar();
    };

    const hoyS = fecha();
    const marcarR = async (r: rutina) => {
        const hechoH = r.hechos.includes(hoyS);
        await updateDoc(doc(db, "usuarios", uid, "rutina", r.id), {
            hechos: hechoH ? arrayRemove(hoyS) : arrayUnion(hoyS),
        });
        await updateDoc(doc(db, "usuarios", uid), {
            xp: increment(hechoH ? -r.xp : r.xp)
        });
        if (!hechoH) setNivelN(await subioN(uid, r.xp));
        cargar();
    };

    const borrarR = async (r: rutina) => {
        for (const id of r.notifIds ?? []) await cancelarRecordatorio(id);
        await deleteDoc(doc(db, "usuarios", uid, "rutina", r.id));
        if (r.hechos.length > 0) await updateDoc(doc(db, "usuarios", uid), { xp: increment(-r.xp * r.hechos.length) });
        cargar();
    };

    const diaH = new Date().getDay();
    const ordenH = (a: rutina, b: rutina) => a.inicio.localeCompare(b.inicio);
    const rutinaH = rutinas.filter((r) => r.dias.includes(diaH)).sort(ordenH);
    const rutinaO = rutinas.filter((r) => !r.dias.includes(diaH)).sort(ordenH);

    const filaR = (r: rutina, marcaH: boolean) => {
        const hechoH = marcaH && r.hechos.includes(hoyS);
        return (
            <View key={r.id} className="mb-3 flex-row items-center gap-3 rounded-2xl border-2 p-3" style={{ backgroundColor: C.blanco, borderColor: C.tinta }}>
                {marcaH && (
                    <Pressable
                        onPress={() => marcarR(r)}
                        className="h-7 w-7 items-center justify-center rounded-md border-2"
                        style={{ backgroundColor: hechoH ? C.verde : C.blanco, borderColor: C.tinta }}
                    >
                        {hechoH && <Text className="font-bold" style={{ color: C.blanco }}>✓</Text>}
                    </Pressable>
                )}

                <View className="flex-1">
                    <Text className={`text-base font-bold ${hechoH ? "line-through" : ""}`} style={{ color: hechoH ? C.gris : C.tinta }}>
                        {r.titulo}
                    </Text>
                    <View className="mt-1 flex-row flex-wrap items-center gap-2">
                        <View className="rounded-md px-2 py-0.5" style={{ backgroundColor: C.boton }}>
                            <Text className="text-xs font-bold" style={{ color: C.tinta }}>{r.tipo}</Text>
                        </View>
                        <Text className="text-xs" style={{ color: C.gris }}>{r.inicio} – {r.fin}</Text>
                        <Text className="text-xs" style={{ color: C.gris }}>
                            {[1, 2, 3, 4, 5, 6, 0].filter((d) => r.dias.includes(d)).map((d) => "DLMXJVS"[d]).join(" ")}
                        </Text>
                    </View>
                </View>

                <View className="items-end gap-2">
                    <View className="rounded-full border px-2 py-0.5" style={{ backgroundColor: C.durazno, borderColor: C.coral }}>
                        <Text className="text-xs font-bold" style={{ color: C.coral }}>+{r.xp} XP</Text>
                    </View>
                    <Pressable onPress={() => borrarR(r)} hitSlop={8}>
                        <Text className="text-xs underline" style={{ color: C.gris }}>Quitar</Text>
                    </Pressable>
                </View>
            </View>
        );
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
    const diaO = [...diaPen, ...diaD.filter((t) => t.listo)];
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
                    <Pattern id="hoja" width={26} height={26} patternUnits="userSpaceOnUse">
                        <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
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
                            onPress={() => { cerrarF(); setFormAbierto(true); }}
                            className="h-14 w-14 items-center justify-center border-2"
                            style={{ borderRadius: 14, backgroundColor: C.boton, borderColor: C.tinta }}
                        >
                            <Text style={{ fontSize: 30, fontWeight: "700", color: C.tinta, marginTop: -2 }}>+</Text>
                        </Pressable>
                    </ConSombra>
                </View>

                {/* Estudio*/}
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
                    <>
                        <View className="mb-3 flex-row items-end justify-between">
                            <Text className="text-2xl" style={{ fontWeight: "900", color: C.tinta }}>Hoy</Text>
                            {rutinaH.length > 0 && (
                                <Text className="italic" style={{ color: C.verde }}>
                                    {rutinaH.filter((r) => r.hechos.includes(hoyS)).length} de {rutinaH.length} hechos
                                </Text>
                            )}
                        </View>

                        {rutinaH.length === 0 && (
                            <View className="mb-6 items-center rounded-2xl border-2 border-dashed p-6" style={{ borderColor: C.gris }}>
                                <Text style={{ color: C.gris }}>Nada en tu rutina para hoy</Text>
                                <Text className="text-xs" style={{ color: C.gris }}>Toca + para agregar un hábito</Text>
                            </View>
                        )}
                        {rutinaH.map((r) => filaR(r, true))}

                        {rutinaO.length > 0 && (
                            <>
                                <Text className="mb-3 mt-4 text-xl" style={{ fontWeight: "900", color: C.tinta }}>Otros días</Text>
                                {rutinaO.map((r) => filaR(r, false))}
                            </>
                        )}
                    </>
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
                                <Text style={{ color: C.gris }}>Nada para este día</Text>
                                <Text className="text-xs" style={{ color: C.gris }}>Toca + para agregar meta</Text>
                            </View>
                        )}

                        {diaO.map((t) => (
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
                                    {t.descripcion ? (
                                        <Text className="text-sm" style={{ color: C.gris }}>{t.descripcion}</Text>
                                    ) : null}
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
                                    <View className="flex-row gap-3">
                                        <Pressable onPress={() => editarT(t)} hitSlop={8}>
                                            <Text className="text-xs underline" style={{ color: C.verde }}>Editar</Text>
                                        </Pressable>
                                        <Pressable onPress={() => borrar(t)} hitSlop={8}>
                                            <Text className="text-xs underline" style={{ color: C.gris }}>Quitar</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>

            {/* + para agregar */}
            <Modal visible={formAbierto} transparent animationType="fade" onRequestClose={cerrarF}>
                <Pressable className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onPress={cerrarF}>
                    <Pressable
                        onPress={() => { }}
                        className="w-full rounded-t-3xl border-2 p-6"
                        style={{ maxWidth: 480, alignSelf: "center", backgroundColor: C.papel, borderColor: C.tinta }}
                    >
                        {vista === "estudio" ? (
                        <>
                        <Text className="text-base italic" style={{ color: C.verde }}>{tareaE ? "editar entrega" : "nueva entrega"}</Text>
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
                            style={{ backgroundColor: C.blanco, borderColor: C.tinta, minHeight: 70, textAlignVertical: "top" }}
                            placeholder="Descripción (opcional)"
                            value={descripcion}
                            onChangeText={setDescripcion}
                            multiline
                        />
                        {Platform.OS === "web" ? (
                            <TextInput
                                className="mb-3 rounded-xl border-2 p-3"
                                style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                                placeholder="Hora, ej: 23:59"
                                value={hora}
                                onChangeText={setHora}
                            />
                        ) : (
                            <Pressable
                                onPress={() => elegirH(setHora)}
                                className="mb-3 rounded-xl border-2 p-3"
                                style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                            >
                                <Text style={{ color: hora ? C.tinta : C.gris }}>
                                    {hora ? hora : "Elegir hora"}
                                </Text>
                            </Pressable>
                        )}

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
                                <Text className="text-lg font-bold" style={{ color: C.tinta }}>{tareaE ? "Guardar cambios" : "+ Agregar entrega"}</Text>
                            </Pressable>
                        </ConSombra>
                        </>
                        ) : (
                        <>
                        <Text className="text-base italic" style={{ color: C.verde }}>nuevo hábito</Text>
                        <Text className="mb-4 text-2xl" style={{ fontWeight: "900", color: C.tinta }}>Rutina</Text>

                        <TextInput
                            className="mb-3 rounded-xl border-2 p-3"
                            style={{ backgroundColor: C.blanco, borderColor: C.tinta }}
                            placeholder="Ej: Gimnasio"
                            value={titulo}
                            onChangeText={setTitulo}
                        />

                        <View className="flex-row gap-2">
                            {campoH(inicio, setInicio, "Inicio")}
                            {campoH(fin, setFin, "Fin")}
                        </View>

                        <Text className="mb-2 font-bold" style={{ color: C.tinta }}>Tipo</Text>
                        <View className="mb-4 flex-row flex-wrap gap-2">
                            {TIPOS.map((t) => (
                                <Pressable
                                    key={t}
                                    onPress={() => setTipoE(t)}
                                    className={`rounded-full px-4 py-2 ${tipoE === t ? "border-[3px]" : "border"}`}
                                    style={{ backgroundColor: tipoE === t ? C.boton : C.blanco, borderColor: C.tinta }}
                                >
                                    <Text className="font-bold" style={{ color: C.tinta }}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text className="mb-2 font-bold" style={{ color: C.tinta }}>Días</Text>
                        <View className="mb-4 flex-row justify-between">
                            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                <Pressable
                                    key={d}
                                    onPress={() => setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d])}
                                    className="h-10 w-10 items-center justify-center rounded-full border-2"
                                    style={{ backgroundColor: dias.includes(d) ? C.boton : C.blanco, borderColor: C.tinta }}
                                >
                                    <Text className="font-bold" style={{ color: C.tinta }}>{"DLMXJVS"[d]}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {error !== "" && <Text className="mb-3" style={{ color: C.coral }}>{error}</Text>}

                        <ConSombra radio={16} className="mb-4">
                            <Pressable onPress={agregarR} className="items-center rounded-2xl border-2 py-3.5" style={{ backgroundColor: C.boton, borderColor: C.tinta }}>
                                <Text className="text-lg font-bold" style={{ color: C.tinta }}>+ Agregar hábito</Text>
                            </Pressable>
                        </ConSombra>
                        </>
                        )}
                        <Pressable onPress={cerrarF} className="items-center">
                            <Text className="underline" style={{ color: C.gris }}>Cancelar</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            <SubioNivel datos={nivelN} onCerrar={() => setNivelN(null)} />
        </SafeAreaView>
    );
}
