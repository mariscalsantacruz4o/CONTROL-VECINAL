import type { Metadata } from "next";
import VecinalApp from "./VecinalApp";

export const metadata: Metadata = {
  title: "Mi tarjeta vecinal",
  description: "Consulta sencilla y transparente de tu información vecinal.",
};

export default function Home() {
  return <VecinalApp />;
}
