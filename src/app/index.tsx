import { Redirect } from "expo-router";
import { auth } from "@/lib/firebase";

export default function Index() {
  if (auth.currentUser) return <Redirect href="/inicio" />;
  return <Redirect href="/ingreso" />;
}