const fs = require("node:fs");
const { chromium } = require("playwright");
const targets = require("./contrast-pages.json").map(route=>({route}));
const origin = "http://127.0.0.1:18718";
const src = fs.readFileSync("e2e/support/routes.ts", "utf8");
const token = /MOCK_APPROVER_TOKEN = "([^"]+)"/.exec(src)?.[1] ?? "fixture";
const custom = {
  "/billing/invoices/[invoiceId]": "/billing/invoices/501",
  "/customers/merge": "/customers/merge?primary=301&merged=302",
  "/import/[batchId]": "/import/301", "/members/[membershipId]": "/members/2",
  "/privacy-requests/[requestId]": "/privacy-requests/31",
  "/properties/[propertyId]/access-approvals/[approvalId]/grants": "/properties/501/access-approvals/7001/grants",
  "/support/[inquiryId]": "/support/11", "/ops/enterprise-leads/[leadId]": "/ops/enterprise-leads/601",
  "/ops/guest-privacy-intakes/[intakeId]": "/ops/guest-privacy-intakes/41",
  "/ops/inquiries/[inquiryId]": "/ops/inquiries/501", "/ops/members/[userId]": "/ops/members/42",
  "/ops/privacy-requests/[requestId]":"/ops/privacy-requests/501", "/ops/import-support/[requestId]":"/ops/import-support/401",
  "/ops/offices/[officeId]": "/ops/offices/501", "/ops/registrations/[registrationId]": "/ops/registrations/101",
  "/office/register/evidence": "/office/register/evidence?registrationId=31",
};
const values = { queueId:"701", refundId:"901", propertyId:"501", customerId:"301", contractId:"9101", coordinationId:"801",
  officeId:"5", registrationId:"31", kind:"terms", version:"1.0", yearMonth:"2026-10", token };
function profile(route) {
  if (/^\/office\/(?:start|join|register|review)(?:\/|$)/.test(route)) return "NEW";
  if (/^\/(?:access|removed|reconsent)(?:\/|$)/.test(route)) return "OWNER_REVOKED";
  if (route === "/" || /^\/(?:login|signup|password|legal|pricing|coming-soon|approver|visit-responses|grant|return|unsubscribe|ops)(?:\/|$)/.test(route)) return "public";
  return "OWNER";
}
const axe = require.resolve("axe-core/axe.min.js");
const groups=Map.groupBy(targets, item=>profile(item.route));
async function audit(page) {
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {runOnly:{type:"rule",values:["color-contrast"]}});
    const failures = result.violations.flatMap(v=>v.nodes.map(n=>{
      const element = document.querySelector(n.target[0]);
      const colors = n.any?.[0]?.data ?? {};
      return { tag:element?.tagName, classes:typeof element?.className==="string"?element.className.slice(0,140):"", fg:colors.fgColor, bg:colors.bgColor, ratio:colors.contrastRatio,
        disabled:!!element?.closest(":disabled,[aria-disabled=true]"),
        muted:!!element?.classList.contains("text-ink-3"),
        workspace:!!element?.closest(".work-density, [data-workspace]") };
    }));
    const incompleteReasons = {};
    for (const resultRule of result.incomplete) {
      for (const node of resultRule.nodes) {
        const check = [...node.any,...node.all,...node.none].find(item=>item.result===undefined || item.result===null) ?? node.any[0];
        const element = document.querySelector(node.target[0]);
        const message = check?.message ?? "";
        const knownReason = /overlap|obscur/i.test(message) ? "overlap" :
          /image|gradient/i.test(message) ? "background-image-or-gradient" :
          /background/i.test(message) ? "background-uncertain" :
          /same color/i.test(message) ? "same-color" : "other";
        const offscreen = element ? element.getBoundingClientRect().top >= innerHeight || element.getBoundingClientRect().bottom <= 0 : false;
        const hidden = Boolean(element?.closest(':disabled,[aria-disabled=true],[aria-hidden=true]'));
        const key=[knownReason,offscreen?"offscreen":"inView",hidden?"inactive":"active"].join("/");
        incompleteReasons[key]=(incompleteReasons[key]??0)+1;
      }
    }
    const reviewDetails=[];
    const scrollRecheck = {inactive:0,passed:0,failed:0,stillNeedsReview:0,unavailable:0};
    const targets = result.incomplete.flatMap(rule => rule.nodes)
      .map(node=>document.querySelector(node.target[0]));
    for (const element of targets) {
      if (!element || !element.isConnected) {
        scrollRecheck.unavailable++;
        continue;
      }
      if (element.closest(":disabled,[aria-disabled=true],[aria-hidden=true]")) {
        scrollRecheck.inactive++;
        continue;
      }
      element.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});
      await new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
      const recheck = await window.axe.run(element,{runOnly:{type:"rule",values:["color-contrast"]}});
      if (recheck.violations.length) scrollRecheck.failed++;
      else if (recheck.incomplete.length) {
        scrollRecheck.stillNeedsReview++;
        element.focus();
        element.scrollIntoView({block:"nearest",inline:"center",behavior:"instant"});
        await new Promise(resolve=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)));
        const rect=element.getBoundingClientRect();
        const x=Math.min(innerWidth-1,Math.max(0,(rect.left+rect.right)/2));
        const y=Math.min(innerHeight-1,Math.max(0,(rect.top+rect.bottom)/2));
        const hit=document.elementsFromPoint(x,y)[0];
        const scroll=element.closest("nav");
        const ranges=[];
        const textNodes=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
        for (let textNode=textNodes.nextNode();textNode;textNode=textNodes.nextNode()) {
          if (textNode.textContent.trim()) {
            const range=document.createRange();
            range.selectNodeContents(textNode);
            ranges.push(...range.getClientRects());
          }
        }
        const clip=scroll?.getBoundingClientRect();
        const visibleText=ranges.length>0&&ranges.every(r=>
          r.left>=Math.max(0,clip?.left??0)-1&&r.top>=Math.max(0,clip?.top??0)-1&&
          r.right<=Math.min(innerWidth,clip?.right??innerWidth)+1&&r.bottom<=Math.min(innerHeight,clip?.bottom??innerHeight)+1
        );
        const styles=getComputedStyle(element);
        const backgrounds=[];
        for (let at=element; at&&backgrounds.length<8; at=at.parentElement) {
          const cs=getComputedStyle(at);
          backgrounds.push({color:cs.backgroundColor,image:cs.backgroundImage!=="none",opacity:cs.opacity});
          if(/^rgb\(/.test(cs.backgroundColor))break;
        }
        reviewDetails.push({
          tag:element.tagName,region:element.closest("nav,header,main,table")?.tagName,
          foreground:styles.color,font:styles.fontSize,backgrounds,
          overlapsAtCenter:Boolean(hit&&!element.contains(hit)&&!hit.contains(element)),
          allTextLinesInsideViewport:visibleText,focused:document.activeElement===element,
          horizontalMenu:scroll?.scrollWidth>scroll?.clientWidth,
        });
      }
      else if (recheck.passes.length) scrollRecheck.passed++;
      else scrollRecheck.unavailable++;
    }
    return {failures,incomplete:result.incomplete.reduce((a,v)=>a+v.nodes.length,0),incompleteReasons,scrollRecheck,reviewDetails};
  });
}
(async()=>{
 const browser=await chromium.launch();
 try {
  for (const width of [390]) for (const [role, list] of groups) {
   const ctx=await browser.newContext({viewport:{width,height:850},locale:"ko-KR"});
   await ctx.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   await ctx.addInitScript(v=>v==="public"?localStorage.removeItem("sairo-mock-office-role"):localStorage.setItem("sairo-mock-office-role",v),role);
   await ctx.addInitScript(()=>localStorage.setItem("sairo-mock-ops-roles","SECURITY_ADMIN,REVIEW,SUPPORT,BILLING,MIGRATION,PRIVACY,OPS,EXEC_VIEW"));
   const page=await ctx.newPage();
   for (const x of list) {
    const route=custom[x.route]??x.route.replace(/\[([^\]]+)\]/g,(_,key)=>values[key]??"1");
    try {
     let response;
     if(x.route==="/billing/refunds/[refundId]"){
       response=await page.goto(origin+"/billing/invoices/501",{waitUntil:"networkidle",timeout:12000});
       await page.getByRole("button",{name:"환불 신청",exact:true}).click({timeout:8000});
       const dialog=page.getByRole("dialog");
       await dialog.getByRole("combobox").selectOption({index:1},{timeout:8000});
       await dialog.getByRole("button",{name:"환불 신청",exact:true}).click({timeout:8000});
       await dialog.getByRole("button",{name:"닫기",exact:true}).click({timeout:8000});
       await page.getByRole("link",{name:"이 청구서의 환불 내역",exact:true}).click({timeout:8000});
       await page.getByRole("link",{name:"환불 901",exact:true}).click({timeout:8000});
       await page.getByText("환불액 계산 근거",{exact:true}).waitFor({timeout:8000});
     } else {
       response=await page.goto(origin+route,{waitUntil:"domcontentloaded",timeout:10000});
     }
     await page.locator("main h1,h1,main button").first().waitFor({timeout:2400}).catch(()=>{});
     await page.waitForTimeout(230);
     await page.addScriptTag({path:axe});
     const output=await audit(page);
     const flags=await page.evaluate(()=>({
        workspace:!!document.querySelector("[data-workspace]"),
        publicCandidate:!!document.querySelector("[data-public-contrast]"),
        notFound:document.body.innerText.includes("페이지를 찾을 수 없습니다")
     }));
     fs.appendFileSync("contrast-run.ndjson",JSON.stringify({route:x.route,width,status:response?.status(),...flags,matchedPath:new URL(page.url()).pathname===route.split("?")[0],...output})+"\n");
    } catch(e) {fs.appendFileSync("contrast-run.ndjson",JSON.stringify({route:x.route,width,errorType:e.name})+"\n");}
   }
   await ctx.close();
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e.name);process.exitCode=1});
