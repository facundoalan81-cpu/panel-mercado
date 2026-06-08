import Dashboard from "@/components/Dashboard";
import { loadSignals, loadFundamentals } from "@/lib/data";

export const revalidate = 3600;

export default async function Home() {
  const [data, funds] = await Promise.all([loadSignals(), loadFundamentals()]);
  return <Dashboard data={data} funds={funds} />;
}
