"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Heart, Eye, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";

export default function WallArtCategory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    fetch("/api/products?category=wall-art")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data.filter((p: any) => p.status !== "Inactive"));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch wall-art products", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">Curating Wall Art Collection...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20">
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="font-heading text-4xl md:text-5xl font-bold mb-6"
          >
            Mandala Wall Art
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto text-lg"
          >
            Transform your space with our exclusive collection of hand-painted and meticulously crafted mandala wall art. Each piece resonates with spiritual energy and unparalleled artistry.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-6 gap-y-8 md:gap-y-12">
          {products.map((product, idx) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="group flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-card mb-4 shadow-sm border border-border/50 group-hover:shadow-xl group-hover:border-primary/30 transition-all duration-500">
                {/* Badge */}
                {product.bestseller && (
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

                <div className="hidden md:block absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-\\[cubic-bezier(0.22,1,0.36,1)\\] z-20 bg-gradient-to-t from-background/80 to-transparent">
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
                  <span className="text-[10px] text-primary uppercase tracking-widest font-semibold">Wall Art</span>
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
        </div>

      </div>
    </main>
  );
}
