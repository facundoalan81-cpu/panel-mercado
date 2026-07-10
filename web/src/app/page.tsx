import Dashboard from "@/components/Dashboard";
import { loadSignals } from "@/lib/data";

export const revalidate = 900;

export default async function Home() {
  const data = await loadSignals();
  return <Dashboard data={data} />;
}
