import { auth, db } from "@/lib/firebase";
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Registro() {
    const [usuario, setUsuario] = useState('');
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [error, setError] = useState('');

    const registrar = async () => {
        if (!usuario || !correo || !clave) return setError('Completa todos los campos');
        try {
            const cred = await createUserWithEmailAndPassword(auth, correo, clave);
            console.log("Usuario creado:", cred.user.uid);
            await setDoc(doc(db,"usuarios",cred.user.uid),{
                nombre: usuario,
                usuario: usuario,
                correo:correo,
                xp:0,
                rachaAc:0,
                rachaMe:0,
                amigos:[],
                creado: serverTimestamp()
            });
            router.replace('/inicio');
        }
        catch (e: any) {
            console.log("Error:", e.code);
            setError(e.code);

        }
    };



    return (
        <SafeAreaView className="flex-1 justify-center bg-paper p-6">
            <Text className="mb-8 text-center text-xl font-work-medium">Crear Cuenta</Text>
            <Text className="mb-1 font-work-bold">Usuario</Text>
            <TextInput className="mb-4 rounded-md bg-mint p-3" placeholder="tuusuario" autoCapitalize="none" value={usuario} onChangeText={setUsuario} />
            <Text className="mb-1 font-work-bold">Correo</Text>
            <TextInput className="mb-4 rounded-md bg-mint p-3" placeholder="tucorreo@estudiante.cl" autoCapitalize="none" value={correo} onChangeText={setCorreo} />
            <Text className="mb-1 font-work-bold">Contraseña</Text>
            <TextInput className="mb-4 rounded-md bg-mint p-3" placeholder="••••••••" secureTextEntry value={clave} onChangeText={setClave} />
            {error !== '' && <Text className="mb-3 text-red-600">{error}</Text>}
            <Pressable className="items-center rounded-2xl border-2 border-ink bg-mint p-3" onPress={registrar}>
                <Text className="text-base font-work-bold">Registrar</Text>
            </Pressable>
            <Pressable className="items-center rounded-2xl border-2 border-ink bg-mint p-3" onPress={() =>router.replace('/ingreso')}>
                
                <Text className="text-center font-work-medium">¿Ya tienes cuenta? <Text className="font-work-black">Inicia sesión</Text></Text>
            </Pressable>
        </SafeAreaView>
    );
}
