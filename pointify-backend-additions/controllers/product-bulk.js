const Product = require("../models/product");
const Inventory = require("../models/inventory");

// POST /product/bulk
// Creates many simple products/services in ONE request (used by the POS
// "Add Rooms" bulk tool, but works for any simple non-bundle products).
//
// Body: {
//   shopId, adminId, attendantId,
//   products: [{ name, sellingPrice, buyingPrice, quantity, virtual,
//                isRoom, productType, ... }, ...]   // max 500
// }
//
// Behaviour:
// - Names that already exist in the shop (not deleted) are SKIPPED, not
//   errors — the POS can safely re-run the same request.
// - Duplicate names inside the same payload are also skipped.
// - Bundles are rejected (use the normal create endpoint for bundles).
// - One Inventory row is created per product, same as createProduct does.
// - No purchase records are created (intended for services / zero-stock
//   items; send each product through POST /product if you need the
//   product-type purchase side effects).
const bulkCreateProducts = async (req, res) => {
    try {
        const { shopId, adminId, attendantId, products } = req.body;

        if (!shopId) {
            return res
                .status(400)
                .json({ success: false, message: "shopId is required" });
        }
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "products must be a non-empty array",
            });
        }
        if (products.length > 500) {
            return res.status(400).json({
                success: false,
                message: "a maximum of 500 products per request is allowed",
            });
        }
        if (products.some((p) => p.bundle === true || p.bundle === "true")) {
            return res.status(400).json({
                success: false,
                message: "bundle products are not supported by bulk create",
            });
        }

        const names = products
            .map((p) => String(p.name || "").trim())
            .filter((n) => n.length > 0);

        const existing = await Product.find({
            shopId,
            name: { $in: names },
            deleted: false,
        }).select("name");
        const taken = new Set(existing.map((p) => p.name.toLowerCase()));

        const toInsert = [];
        const skipped = [];
        for (const p of products) {
            const name = String(p.name || "").trim();
            const key = name.toLowerCase();
            if (!name || taken.has(key)) {
                skipped.push(name || "(empty name)");
                continue;
            }
            taken.add(key); // also dedupes within this payload
            toInsert.push({
                ...p,
                name,
                shopId,
                admin: p.admin ?? adminId,
                attendantId: p.attendantId ?? attendantId,
                quantity: p.quantity ?? 0,
                bundle: false,
            });
        }

        let created = [];
        if (toInsert.length > 0) {
            created = await Product.insertMany(toInsert);
            await Inventory.insertMany(
                created.map((d) => ({
                    quantity: d.quantity ?? 0,
                    product: d._id,
                    shop: shopId,
                    attendant: attendantId,
                })),
            );
        }

        res.status(201)
            .setHeader("Content-Type", "application/json")
            .json({
                success: true,
                created: created.length,
                skipped: skipped.length,
                skippedNames: skipped,
                data: created,
            });
    } catch (error) {
        res.status(422)
            .setHeader("Content-Type", "application/json")
            .json({ success: false, message: error + " " });
    }
};

module.exports = { bulkCreateProducts };
