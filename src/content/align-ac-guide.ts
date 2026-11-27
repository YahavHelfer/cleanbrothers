import type { PageDraft, RichNode } from "@/cms/pages/model";
import { alignAcPriceCopy, applyAcPriceRevision } from "./ac-price-revision";
import { acDuctPricingNotice, miniCentralStartingPrice, wallAcStartingPrice } from "./local-ac-prices";

function alignGuideNodes(nodes: RichNode[]): RichNode[] {
  return nodes.map(node => ({
    ...node,
    items: node.items.map(row => {
      const text = row.map(item => item.text).join("");
      if (/דוגמה לחישוב מחיר/.test(text)) {
        return [{ text: "איך נקבע המחיר בפועל?", bold: false, emphasis: false, link: null }];
      }
      if (/החישוב הוא|התוספת היא לכל התעלות/.test(text)) {
        return [{ text: acDuctPricingNotice, bold: false, emphasis: false, link: null }];
      }
      if (/(?:תעל[וה]|(?:398|700)\s*₪)/.test(text) &&
          /(?:100|150|250|398|700)\s*₪/.test(text)) {
        return [{ text: acDuctPricingNotice, bold: false, emphasis: false, link: null }];
      }
      return row.map(item => ({
        ...item,
        text: /^(?:199|249)\s*₪(?: כולל מע״מ)?$/.test(item.text) ? wallAcStartingPrice :
          /^(?:450|550)\s*₪(?: כולל מע״מ)?$/.test(item.text) ? miniCentralStartingPrice :
            alignAcPriceCopy(item.text, "guide"),
      }));
    }),
  }));
}

export function alignAcGuide(slug: string, page: PageDraft): PageDraft {
  if (slug !== "before-booking-ac-cleaning" && slug !== "ac-mini-central-and-ducts") return page;
  const content = applyAcPriceRevision(page, "guide");
  return {
    ...content,
    seoDescription: `מה כלול בניקוי מזגן עילי ובניקוי מיני מרכזי, ואיך נקבע ההיקף? עילי ${wallAcStartingPrice}, ומיני מרכזי ${miniCentralStartingPrice}, כולל מע״מ ובכפוף לבדיקה.`,
    blocks: content.blocks.map((block, index) => block.type === "richText" ? ({
      ...block,
      payload: { ...block.payload, nodes: alignGuideNodes(page.blocks[index].payload.nodes as RichNode[]) },
    }) : block),
  };
}
