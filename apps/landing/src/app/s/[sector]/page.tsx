import { SectorInit } from "./SectorInit";
import Home from "@/app/page";

type Props = { params: Promise<{ sector: string }> };

export default async function SectorPage({ params }: Props) {
  const { sector } = await params;
  return (
    <>
      <SectorInit sector={sector} />
      <Home />
    </>
  );
}

export function generateStaticParams() {
  return ["hearing", "pharmacy", "hospital", "hotel", "medical", "optic", "general"].map((sector) => ({ sector }));
}
