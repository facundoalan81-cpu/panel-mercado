import Dashboard from "@/components/Dashboard";
import { loadSignals } from "@/lib/data";

export const revalidate = 3600;

export default async function Home() {
  const data = await loadSignals();
  return <Dashboard data={data} />;
}
