import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
        apiKey: "AIzaSyD9SPhO4eKwxjVtsb81XGk1fQcOObelOhA",
        authDomain: "studit-950fa.firebaseapp.com",
        projectId: "studit-950fa",
        storageBucket: "studit-950fa.firebasestorage.app",
        messagingSenderId: "512306507173",
        appId: "1:512306507173:web:957e49345a7b4a7f570c4c",
        measurementId: "G-J98P68KE0G"
    };
    const app = initializeApp(firebaseConfig);
    export const auth = 
    Platform.OS === "web" ? getAuth(app): initializeAuth(app,{
        persistence: getReactNativePersistence(AsyncStorage),
    })
    export const db = getFirestore(app);