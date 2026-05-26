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

      const { images, text, resetQuantity } = req.body as {
        images?: string[];
        text?: string;
        resetQuantity?: boolean;
      };

      const hasImages = Array.isArray(images) && images.length > 0;
      const hasText = typeof text === "string" && text.trim().length > 0;
      if (!hasImages && !hasText) {
        return res.status(400).json({ error: "No images or text provided." });
      }
      if (hasImages && images!.length > 20) {
        return res
          .status(400)
          .json({ error: "Too many images. Maximum 20 per request." });
      }
      if (hasText && text!.length > 200_000) {
        return res
          .status(400)
          .json({ error: "Text too large. Maximum 200,000 characters." });
      }

      const anthropic = new Anthropic({ apiKey });

      // Run one Claude call and parse out the products array. Shared by the
      // single-shot image/PDF path and the chunked text path below.
      const runOne = async (
        userContent: Anthropic.Messages.ContentBlockParam[],
      ): Promise<{ products: any[]; model: string; usage: any }> => {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 64000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        });
        const completion = await stream.finalMessage();
        if (completion.stop_reason === "max_tokens") {
          console.warn("AI import: response hit max_tokens, JSON may be truncated.");
        }
        const textBlock = completion.content.find((b) => b.type === "text") as
          | { type: "text"; text: string }
          | undefined;
        const raw = textBlock?.text || "";

        let jsonText = raw.trim();
        const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) jsonText = fenced[1].trim();
        const firstBrace = jsonText.indexOf("{");
        if (firstBrace >= 0) jsonText = jsonText.slice(firstBrace);
        const lastBrace = jsonText.lastIndexOf("}");
        if (lastBrace > 0) jsonText = jsonText.slice(0, lastBrace + 1);

        const tryParse = (s: string): { products?: any[] } | null => {
          try { return JSON.parse(s); } catch { return null; }
        };

        let parsed: { products?: any[] } | null = tryParse(jsonText);

        if (!parsed) {
          // Recovery: extract individual product objects from a possibly truncated array.
          const objRegex = /\{[^{}]*"name"\s*:\s*"[^"]*"[^{}]*\}/g;
          const matches = jsonText.match(objRegex) || [];
          const recovered: any[] = [];
          for (const m of matches) {
            const obj = tryParse(m);
            if (obj && typeof (obj as any).name === "string") recovered.push(obj);
          }
          if (recovered.length > 0) {
            console.warn(`AI import: recovered ${recovered.length} products from truncated JSON.`);
            parsed = { products: recovered };
          }
        }

        if (!parsed) {
          console.error("Failed to parse Claude JSON. Length:", raw.length, "Tail:", raw.slice(-300));
          throw Object.assign(
            new Error(
              "AI returned an unparseable response. Try splitting the file into fewer pages and uploading again.",
            ),
            { status: 502 },
          );
        }

        return {
          products: Array.isArray(parsed.products) ? parsed.products : [],
          model: completion.model,
          usage: completion.usage,
        };
      };

      const MAX_IMG_BYTES = 5 * 1024 * 1024;
      const content: Anthropic.Messages.ContentBlockParam[] = [];
      for (const dataUrl of hasImages ? images! : []) {
        const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
        if (!match) {
          return res
            .status(400)
            .json({ error: "File must be a base64 data URL (image or PDF)." });
        }
        let mime = match[1].toLowerCase();
        const data = match[2];
        if (mime === "image/jpg") mime = "image/jpeg";
        const decodedBytes = Math.floor((data.length * 3) / 4);
        if (mime !== "application/pdf" && decodedBytes > MAX_IMG_BYTES) {
          return res.status(413).json({
            error: `An image is too large (${(decodedBytes / 1024 / 1024).toFixed(1)}MB). Anthropic's per-image limit is 5MB. Try a smaller/clearer photo.`,
          });
        }

        if (mime === "application/pdf") {
          content.push({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data },
          } as any);
        } else if (
          mime === "image/png" ||
          mime === "image/jpeg" ||
          mime === "image/webp" ||
          mime === "image/gif"
        ) {
          content.push({
            type: "image",
            source: { type: "base64", media_type: mime as any, data },
          });
        } else {
          return res.status(400).json({
            error: `Unsupported file type: ${mime}. Use PNG, JPEG, WebP, GIF, or PDF.`,
          });
        }
      }
      // Split a large TSV blob into chunks small enough that each fits well
      // under Claude's output cap (≈60k tokens of JSON ≈ ~500 product rows).
      // We split on line boundaries so we never cut a row in half.
      const CHUNK_CHARS = 50_000;
      const splitTextOnLines = (s: string, max: number): string[] => {
        if (s.length <= max) return [s];
        const out: string[] = [];
        let i = 0;
        while (i < s.length) {
          let end = Math.min(i + max, s.length);
          if (end < s.length) {
            const nl = s.lastIndexOf("\n", end);
            if (nl > i + max / 2) end = nl;
          }
          out.push(s.slice(i, end));
          i = end;
        }
        return out;
      };

      let allProducts: any[] = [];
      let model = "claude-sonnet-4-5";
      let usage: any = undefined;

      if (hasText) {
        const chunks = splitTextOnLines(text!, CHUNK_CHARS);
        for (let ci = 0; ci < chunks.length; ci++) {
          const chunk = chunks[ci];
          const chunkContent: Anthropic.Messages.ContentBlockParam[] = [
            {
              type: "text",
              text:
                `The following is part ${ci + 1} of ${chunks.length} of a messy spreadsheet (tab-separated, one row per line). ` +
                `Restructure it into the product JSON shape described in the system prompt. ` +
                `Ignore blank rows, header banners, totals, and section titles. ` +
                `Map columns intelligently even if header names differ. ` +
                `Common short headers: ITEM=name, QTY=quantity, B.P/BP=buyingPrice, S.P/SP=sellingPrice. ` +
                `For quantity cells like "16pcs" or "12 pkts", put the number in "quantity" and the unit text in "unit".\n\n---\n${chunk}\n---`,
            },
          ];
          const result = await runOne(chunkContent);
          allProducts = allProducts.concat(result.products);
          model = result.model;
          usage = result.usage;
        }
      } else {
        content.push({
          type: "text",
          text: "Extract every product row from the attached file(s) into the JSON shape described in the system prompt. Return ONLY the JSON object.",
        });
        const result = await runOne(content);
        allProducts = result.products;
        model = result.model;
        usage = result.usage;
      }

      const products = allProducts;
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
        model,
        usage,
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
