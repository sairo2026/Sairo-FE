import { test } from "./support/test";
import { newMember, signupViaUi } from "./support/flows";

test("signup uses actual email and phone codes from the local backend", async ({
  page,
  request,
}) => {
  await signupViaUi(page, request, newMember("실 API 검증"));
});
