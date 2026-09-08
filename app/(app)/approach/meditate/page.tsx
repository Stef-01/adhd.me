import type { Metadata } from "next";
import { MeditationStudio } from "../../../meditation-studio";

export const metadata: Metadata = { title: "A moment of stillness", description: "A guided pause at your own pace, or a scheduled five-minute session on a shared clock." };
export default function MeditatePage() { return <MeditationStudio />; }
