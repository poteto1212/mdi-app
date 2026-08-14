import { getMedications } from "@/lib/repositories/medicationRepository";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MedicationsPage() {
  const data = await getMedications();
  console.log(data);

  return data;
}
