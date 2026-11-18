import { auth } from "@/lib/firebase";
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from "@/components/Texto";
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { C } from "@/lib/colores";


export default function Ingreso() {
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [error, setError] = useState('');

    const entrar = async () => {
        if (!correo || !clave) return setError('Completa tu correo y contraseña');
        try {
            await signInWithEmailAndPassword(auth, correo, clave);
            router.replace('/inicio');
        } catch (e: any) {
            console.log("Error:", e.code);
            setError(e.code);
        }
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: C.papel }}>
            {/* Fondo cuadriculado, svg como formato de diseno editable */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>  
                <Defs>
                    <Pattern id="hoja" width={26} height={26} patternUnits="userSpaceOnUse">
                        <Path d="M 26 0 L 0 0 0 26" fill="none" stroke={C.cuadricula} strokeWidth={1} />
                    </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#hoja)" />
            </Svg>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", width: "100%", maxWidth: 420, alignSelf: "center", padding: 20 }}>
         
                <View className="mb-10 items-center">
                    <View>
                        <View className="absolute left-0 right-0" style={{ bottom: 6, height: 22, backgroundColor: C.boton }} />
                        <Text style={{ fontSize: 64, fontWeight: "900", color: C.tinta, letterSpacing: -2, paddingHorizontal: 6 }}>studit</Text>
                    </View>
                </View>

                {/* Tarjeta */}
                <View className="rounded-3xl p-5" style={{ backgroundColor: C.blanco, borderWidth: 1.5, borderColor: C.tinta }}>
                    <Text className="mb-5 text-center text-2xl" style={{ fontWeight: "900", color: C.tinta }}>¡Volviste!</Text>

                    <Text className="mb-2" style={{ fontWeight: "800", color: C.tinta }}>Correo</Text>
                    <TextInput
                        className="mb-4 rounded-xl px-4 py-3 text-base"
                        style={{ backgroundColor: C.campo, borderWidth: 1.5, borderColor: C.tinta, color: C.tinta }}
                        placeholder="tu.nombre@usm.cl"
                        placeholderTextColor={C.gris}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={correo}
                        onChangeText={setCorreo}
                    />

                    <Text className="mb-2" style={{ fontWeight: "800", color: C.tinta }}>Contraseña</Text>
                    <TextInput
                        className="mb-4 rounded-xl px-4 py-3 text-base"
                        style={{ backgroundColor: C.campo, borderWidth: 1.5, borderColor: C.tinta, color: C.tinta }}
                        placeholder="••••••••"
                        placeholderTextColor={C.gris}
                        secureTextEntry
                        value={clave}
                        onChangeText={setClave}
                    />

                    {error !== '' && <Text className="mb-3" style={{ color: C.coral, fontWeight: "700" }}>{error}</Text>}

                    {/* Boton con sombra dura */}
                    <View className="mt-1">
                        <View className="absolute left-0 right-0 rounded-xl" style={{ top: 5, bottom: -5, backgroundColor: C.sombra }} />
                        <Pressable onPress={entrar}>
                            {({ pressed }) => (
                                <View style={{ backgroundColor: C.boton, borderWidth: 1.5, borderColor: C.sombra, borderRadius: 12, paddingVertical: 16, alignItems: "center", transform: [{ translateY: pressed ? 4 : 0 }] }}>
                                    <Text className="text-lg" style={{ fontWeight: "900", color: C.tinta }}>Entrar  →</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>

                <Pressable className="mt-10" onPress={() => router.push('/registro')}>
                    <Text className="text-center text-base" style={{ color: C.tinta }}>
                        ¿Primera vez? <Text className="underline" style={{ fontWeight: "900" }}>Crea tu cuenta</Text>
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}
