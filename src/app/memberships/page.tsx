import { redirect } from "next/navigation";

/** 초대 메일이 안내하는 주소다. 로그인 여부와 접근 판정은 참여 요청 상태 화면이 맡는다. */
export default function Page() {
  redirect("/office/membership");
}
