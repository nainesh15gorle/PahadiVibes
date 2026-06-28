"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Heart, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";

const categories = [
  { id: "all", label: "All Collections", description: "Discover our complete range of hand-crafted masterpieces, featuring both intricate Mandala Wall Art and traditional Aipan Art, designed to bring spiritual energy and luxury to your spaces." },
  { id: "wall-art", label: "Mandala Wall Art", description: "Transform your space with our exclusive collection of hand-painted and meticulously crafted mandala wall art. Each piece resonates with spiritual energy and unparalleled artistry." },
  { id: "aipan-art", label: "Aipan Art", description: "Discover our exquisite collection of hand-painted Aipan Art. Perfect for adding a touch of traditional Pahadi elegance to your home." }
];

export default function CollectionPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { addToCart } = useCart();

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data.filter((p: any) => p.status !== "Inactive"));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch products", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">Curating Our Collections...</p>
      </div>
    );
  }

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const activeCategoryInfo = categories.find((c) => c.id === selectedCategory) || categories[0];

  return (
    <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Dynamic Category Header */}
        <div className="text-center mb-12">
          <motion.div
            key={activeCategoryInfo.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="font-heading text-4xl md:text-5xl font-bold">
              {activeCategoryInfo.label}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
              {activeCategoryInfo.description}
            </p>
          </motion.div>
        </div>

        {/* Premium Tab Bar */}
        <div className="flex justify-center mb-16 border-b border-border/40 pb-4">
          <div className="inline-flex flex-wrap md:flex-nowrap gap-2 bg-muted/40 p-1 border border-border/50 rounded-none relative">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative px-5 py-2 text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-500 rounded-none ${
                  selectedCategory === cat.id 
                    ? "text-primary-foreground font-extrabold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {selectedCategory === cat.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{cat.label === "All Collections" ? "All" : cat.label.replace(" Art", "")}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <motion.div 
          layout
          className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 md:gap-x-6 gap-y-8 md:gap-y-12"
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, idx) => (
              <motion.div 
                layout
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="group flex flex-col"
              >
                <div className="relative aspect-square overflow-hidden bg-card mb-4 shadow-sm border border-border/50 group-hover:shadow-xl group-hover:border-primary/30 transition-all duration-500">
                  {/* Badge */}
                  {(product.bestseller || product.bestSeller) && (
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <span className="bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        Bestseller
                      </span>
                    </div>
                  )}

                  {/* Stock Badge */}
                  {Number(product.stock) === 0 ? (
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        Out of Stock
                      </span>
                    </div>
                  ) : Number(product.stock) <= 5 ? (
                    <div className="absolute top-2.5 left-2.5 z-20">
                      <span className="bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        Only {product.stock} Left
                      </span>
                    </div>
                  ) : null}
                  
                  {/* Quick Actions */}
                  <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <button className="w-8 h-8 bg-background/90 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm">
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link href={`/product/${product.id}`} className="block h-full w-full relative">
                    <Image 
                      src={product.images && product.images.length > 0 ? product.images[0] : "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      priority={idx < 4}
                      className="object-contain md:object-cover transition-all duration-700 group-hover:scale-105"
                    />
                  </Link>
                  
                  {/* Mobile Quick Add Button */}
                  <div className="absolute bottom-2 right-2 z-20 md:hidden">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (Number(product.stock) === 0) return;
                        addToCart({
                          id: product.id,
                          name: product.name,
                          price: Number(product.price),
                          quantity: 1,
                          image: product.images && product.images.length > 0 ? product.images[0] : undefined,
                          stock: Number(product.stock)
                        });
                        alert(`${product.name} added to cart!`);
                      }}
                      disabled={Number(product.stock) === 0}
                      className="w-8.5 h-8.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-95 disabled:bg-muted disabled:text-muted-foreground focus:outline-none ripple-btn"
                      aria-label="Add to cart"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="hidden md:block absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-20 bg-gradient-to-t from-background/80 to-transparent">
                    <Button 
                      onClick={() => {
                        if (Number(product.stock) === 0) return;
                        addToCart({
                          id: product.id,
                          name: product.name,
                          price: Number(product.price),
                          quantity: 1,
                          image: product.images && product.images.length > 0 ? product.images[0] : undefined,
                          stock: Number(product.stock)
                        });
                        alert(`${product.name} added to cart!`);
                      }}
                      disabled={Number(product.stock) === 0}
                      className="w-full shadow-lg rounded-none uppercase tracking-widest text-xs h-12 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground ripple-btn"
                    >
                      {Number(product.stock) === 0 ? "Out Of Stock" : "Add to Cart"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">
                      {product.category === "wall-art" ? "Mandala Art" : product.category === "aipan-art" ? "Aipan Art" : product.category}
                    </span>
                    <div className="flex items-center text-accent">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <span className="text-[10px] ml-1 font-semibold text-foreground">{product.rating || "5.0"}</span>
                    </div>
                  </div>
                  <Link href={`/product/${product.id}`}>
                    <h3 className="font-heading text-sm sm:text-base md:text-xl truncate hover:text-primary cursor-pointer transition-colors pt-0.5 font-bold">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="font-heading font-bold text-[15px] sm:text-lg text-foreground tracking-wide">₹{Number(product.price).toLocaleString()}</span>
                    {product.originalPrice && <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-medium">₹{Number(product.originalPrice).toLocaleString()}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm uppercase tracking-widest">
            No products available in this selection.
          </div>
        )}

      </div>
    </main>
  );
}
