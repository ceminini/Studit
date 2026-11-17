import * as Notifications from "expo-notifications";
import { Platform } from "react-native";


Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});


export const pedirPermiso = async () => {
    if (Platform.OS === "web") return false; // en el navegador no funcionan


    if (Platform.OS === "android") {
        try {
            await Notifications.setNotificationChannelAsync("default", {
                name: "Recordatorios",
                importance: Notifications.AndroidImportance.DEFAULT,
            });
        } catch (e) {
            console.log("No se pudo crear el canal, se usa el por defecto", e);
        }
    }

    const actual = await Notifications.getPermissionsAsync();
    if (actual.status === "granted") return true;

    const respuesta = await Notifications.requestPermissionsAsync();
    return respuesta.status === "granted";
};

//Recordaorio
export const programarRecordatorio = async (nombreTarea: string, fecha: string, hora: string) => {
    const permiso = await pedirPermiso();
    if (!permiso) return null;

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const [hh, mm] = hora.split(":").map(Number);
    const cuando = new Date(anio, mes - 1, dia, hh, mm); // mes - 1 porque enero es 0

    if (cuando <= new Date()) return null; // si ya pasó, no se programa

    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: "Tarea para hoy",
            body: nombreTarea,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: cuando,
        },
    });
    return id;
};


export const cancelarRecordatorio = async (id: string) => {
    await Notifications.cancelScheduledNotificationAsync(id);
};

export const programarR = async (nombre: string, inicio: string, dias: number[]) => {
    const permiso = await pedirPermiso();
    if (!permiso) return [];

    const [hh, mm] = inicio.split(":").map(Number);
    const idsR: string[] = [];
    for (const d of dias) {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Hora de tu rutina",
                body: nombre,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: d + 1,
                hour: hh,
                minute: mm,
            },
        });
        idsR.push(id);
    }
    return idsR;
};


export const probarNotificacion = async () => {
    const permiso = await pedirPermiso();
    if (!permiso) return false;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Studit",
            body: "¡Las notificaciones funcionan!",
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 5,
        },
    });
    return true;
};