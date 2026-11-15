import { loadPublicCompanyInfo } from "@/shared/lib/server-public-data";
import { PublicBusinessFooter } from "./public-business-footer";

export async function PublicBusinessFooterServer() {
  return <PublicBusinessFooter initialData={await loadPublicCompanyInfo()} />;
}
