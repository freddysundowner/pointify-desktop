import type { Express } from "express";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are an OCR and data-extraction assistant for a Point-of-Sale inventory system.

You receive one or more images of product lists (handwritten or printed, possibly in tables) and must extract every product row into a strict JSON shape that matches the import template.

OUTPUT FORMAT — return ONLY a JSON object, no prose, no markdown:
{
  "products": [
    {
      "name": string,           // required, the product name
      "category": string,       // optional, "" if unknown
      "supplier": string,       // optional, "" if unknown
      "buyingPrice": number,    // 0 if not present
      "sellingPrice": number,   // 0 if not present
      "wholesalePrice": number, // 0 if not present
      "dealerPrice": number,    // 0 if not present
      "quantity": number,       // 0 if not present; strip units like "pcs", "pkts"
      "sku": string,            // optional, "" if unknown
      "description": string,    // optional, "" if unknown
      "lowStockThreshold": number, // 0 if not present
      "reorderLevel": number,   // 0 if not present
      "unit": string,           // optional, "" if unknown
      "manufacturer": string,   // optional, "" if unknown
      "measure": string         // optional, "" if unknown
    }
  ]
}

RULES:
- Extract EVERY visible product row, in the order they appear.
- For handwriting, infer best-guess names; preserve units/sizes in the name (e.g. "PPR Pipe 3/4", "Steel Nails 4\"").
- Numbers like "1300", "1,300", "1.3k", "1300/=" → 1300. "13UD" or "13W" handwritten often means "1300" — use surrounding context to judge.
- Quantity column entries like "5pcs", "12 pkts", "10 pieces" → numeric only. "10pcs per piece 5" or similar → just the leading number.
- If the same column header appears (e.g. "Item / Quantity / Buying / Selling"), map to name / quantity / buyingPrice / sellingPrice respectively.
- Skip header rows and empty rows. Skip rows with no recognizable name.
- If a row has only some prices, fill missing prices with 0.
- Do NOT invent products. Only extract what you can read.
- Return strictly valid JSON — no trailing commas, no comments.`;

const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
};

export function registerAiImportRoutes(app: Express) {
  app.post("/api/import/parse-image", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "ANTHROPIC_API_KEY is not configured on the server.",
        });
      }

      const { images, resetQuantity } = req.body as {
        images?: string[];
        resetQuantity?: boolean;
      };

      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "No images provided." });
      }
      if (images.length > 10) {
        return res
          .status(400)
          .json({ error: "Too many images. Maximum 10 per request." });
      }

      const anthropic = new Anthropic({ apiKey });

      const content: Anthropic.Messages.ContentBlockParam[] = [];
      for (const dataUrl of images) {
        const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/.exec(
          dataUrl,
        );
        if (!match) {
          return res
            .status(400)
            .json({ error: "Image must be a base64 data URL (PNG/JPEG/WebP)." });
        }
        const mediaType = match[1] === "image/jpg" ? "image/jpeg" : (match[1] as
          | "image/png"
          | "image/jpeg"
          | "image/webp"
          | "image/gif");
        const data = match[3];
        content.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data },
        });
      }
      content.push({
        type: "text",
        text: "Extract every product row from the image(s) into the JSON shape described in the system prompt. Return ONLY the JSON object.",
      });

      const completion = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      });

      const textBlock = completion.content.find((b) => b.type === "text") as
        | { type: "text"; text: string }
        | undefined;
      const raw = textBlock?.text || "";

      let jsonText = raw.trim();
      const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced) jsonText = fenced[1].trim();
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }

      let parsed: { products?: any[] };
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse Claude JSON:", raw.slice(0, 500));
        return res.status(502).json({
          error:
            "AI returned an unparseable response. Try a clearer image, or split into smaller pages.",
        });
      }

      const products = Array.isArray(parsed.products) ? parsed.products : [];
      const toNum = (v: any) => {
        if (typeof v === "number" && !isNaN(v)) return v;
        if (typeof v === "string") {
          const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
          return isNaN(n) ? 0 : n;
        }
        return 0;
      };
      const toStr = (v: any) => (v == null ? "" : String(v));

      const cleaned = products
        .map((p: any) => ({
          name: toStr(p.name).trim(),
          category: toStr(p.category).trim(),
          supplier: toStr(p.supplier).trim(),
          buyingPrice: toNum(p.buyingPrice),
          sellingPrice: toNum(p.sellingPrice),
          wholesalePrice: toNum(p.wholesalePrice),
          dealerPrice: toNum(p.dealerPrice),
          quantity: resetQuantity ? 0 : toNum(p.quantity),
          sku: toStr(p.sku).trim(),
          description: toStr(p.description).trim(),
          lowStockThreshold: toNum(p.lowStockThreshold),
          reorderLevel: toNum(p.reorderLevel),
          unit: toStr(p.unit).trim(),
          manufacturer: toStr(p.manufacturer).trim(),
          measure: toStr(p.measure).trim(),
        }))
        .filter((p) => p.name.length > 0);

      res.json({
        products: cleaned,
        count: cleaned.length,
        model: completion.model,
        usage: completion.usage,
      });
    } catch (error: any) {
      console.error("AI import error:", error);
      const status = error?.status || 500;
      res.status(status).json({
        error: error?.message || "Failed to parse image with AI.",
      });
    }
  });
}
