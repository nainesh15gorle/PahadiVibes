import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Manually parse .env.local to avoid needing external dotenv dependency
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || "";
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const SHEETDB_URL = "https://sheetdb.io/api/v1/lm23iv7ij92ru";

async function runMigration() {
  try {
    console.log("=== Starting Data Migration: SheetDB -> Supabase ===");

    // 1. Migrate Categories
    console.log("\nFetching categories from SheetDB...");
    const catRes = await fetch(`${SHEETDB_URL}?sheet=Categories`);
    if (!catRes.ok) throw new Error("Failed to fetch categories from SheetDB");
    const categories = await catRes.json();
    console.log(`Found ${categories.length} categories. Migrating...`);

    for (const cat of categories) {
      console.log(`- Copying category: ${cat.name}`);
      const { error } = await supabase.from("categories").upsert({
        id: cat.id || crypto.randomUUID(),
        name: cat.name,
        slug: cat.slug,
        image: cat.image,
        description: cat.description || null,
      }, { onConflict: "slug" });

      if (error) {
        console.error(`  Error inserting category ${cat.name}:`, error.message);
      }
    }

    // 2. Migrate Products
    console.log("\nFetching products from SheetDB...");
    const prodRes = await fetch(`${SHEETDB_URL}?sheet=Products`);
    if (!prodRes.ok) throw new Error("Failed to fetch products from SheetDB");
    const products = await prodRes.json();
    console.log(`Found ${products.length} products. Migrating...`);

    for (const prod of products) {
      console.log(`- Copying product: ${prod.name}`);

      let parsedImages = [];
      try {
        parsedImages = typeof prod.images === "string" ? JSON.parse(prod.images) : prod.images || [];
      } catch {
        if (prod.image) parsedImages = [prod.image];
      }
      if (parsedImages.length === 0 && prod.image) {
        parsedImages = [prod.image];
      }

      const { error } = await supabase.from("products").upsert({
        id: prod.id || crypto.randomUUID(),
        name: prod.name,
        slug: prod.slug,
        category: prod.category,
        price: Number(prod.price || 0),
        original_price: prod.originalPrice ? Number(prod.originalPrice) : null,
        stock: Number(prod.stock || 0),
        description: prod.description || "",
        story: prod.story || null,
        materials: prod.materials || null,
        dimensions: prod.dimensions || null,
        featured: prod.featured === "TRUE" || prod.featured === true,
        bestseller: prod.bestSeller === "TRUE" || prod.bestSeller === true || prod.bestseller === "TRUE" || prod.bestseller === true,
        status: prod.status || "Active",
        images: parsedImages,
      }, { onConflict: "slug" });

      if (error) {
        console.error(`  Error inserting product ${prod.name}:`, error.message);
      }
    }

    console.log("\n=== Migration Completed Successfully ===");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

runMigration();
