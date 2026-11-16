import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// provisoria: aqui van los amigos (R10-R12)
export default function Amigos() {
    return (
        <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: "#F7F5EE" }}>
            <View className="items-center rounded-2xl border-2 border-dashed p-6" style={{ borderColor: "#6B6B66" }}>
                <Text className="text-2xl" style={{ fontWeight: "900", color: "#1A1A1A" }}>Amigos</Text>
                <Text style={{ color: "#6B6B66" }}>Próximamente</Text>
            </View>
        </SafeAreaView>
    );
}
