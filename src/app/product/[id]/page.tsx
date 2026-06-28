"use client";

import Image from "next/image";
import { useState, use, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Heart, Share2, Check, Star, Minus, Plus, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import Link from "next/link";
import { MandalaLoader } from "@/components/ui/mandala-loader";
import { useCart } from "@/hooks/useCart";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [storyOpen, setStoryOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [dimensionsOpen, setDimensionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: product?.name || "Pahadi Vibes",
      text: `Check out this handcrafted masterpiece: ${product?.name || ""}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        console.error("Error sharing:", err);
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProduct(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <main className="flex-1 w-full bg-background pt-32 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">Preparing Masterpiece...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex-1 w-full bg-background pt-32 pb-20 text-center flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold font-heading mb-4">Masterpiece Not Found</h1>
        <Link href="/category/wall-art">
          <Button variant="outline">Return to Collection</Button>
        </Link>
      </main>
    );
  }

  const images: string[] = product.images && product.images.length > 0 ? product.images : [
    "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a?q=80&w=1200&auto=format&fit=crop"
  ];



  return (
    <main className="flex-1 w-full bg-background pt-20 md:pt-24 pb-32 md:pb-20">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href={`/category/${product.category}`} className="hover:text-primary transition-colors">
            {product.category === "aipan-art" ? "Aipan Art" : "Wall Art"}
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20">
          
          {/* Gallery */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full bg-card overflow-hidden border border-border">
              <Image 
                src={images[activeImage]} 
                alt={product.name} 
                fill 
                className="object-cover"
                priority
              />
              
              {/* Swipe indicators (Mobile arrows overlay) */}
              {images.length > 1 && (
                <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none md:hidden">
                  <button 
                    onClick={() => setActiveImage(prev => (prev - 1 + images.length) % images.length)}
                    className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center pointer-events-auto text-foreground/80 active:scale-90"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button 
                    onClick={() => setActiveImage(prev => (prev + 1) % images.length)}
                    className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center pointer-events-auto text-foreground/80 active:scale-90"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 aspect-square overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage === idx ? 'border-primary' : 'border-transparent opacity-70'}`}
                >
                  <Image src={img} alt={`Thumbnail ${idx+1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-primary tracking-widest uppercase font-medium">Limited Edition</span>
              <div className="flex gap-4">
                <button 
                  onClick={handleShare}
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Share product"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}
                </button>
                <button className="text-muted-foreground hover:text-primary transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
            </div>

            <h1 className="font-heading text-2xl md:text-5xl font-bold mb-2">{product.name}</h1>
            
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-2xl md:text-3xl font-semibold text-foreground">₹{Number(product.price).toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-sm md:text-lg text-muted-foreground line-through font-light">₹{Number(product.originalPrice).toLocaleString()}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex text-accent">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
              </div>
              <span className="text-xs text-muted-foreground">(24 Reviews)</span>
            </div>

            {/* Stock status indicator */}
            <div className="mb-8">
              {product.stock === 0 || Number(product.stock) === 0 ? (
                <span className="inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500 bg-red-500/10 border border-red-500/20">
                  Out Of Stock
                </span>
              ) : Number(product.stock) <= 5 ? (
                <span className="inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 animate-pulse">
                  Low Stock ({product.stock} left)
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
                  In Stock
                </span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-wrap">
              {product.description}
            </p>

            <div className="h-[1px] w-full bg-border mb-8" />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10 w-full">
              <div className="flex items-center border border-border h-14 w-full sm:w-32 flex-shrink-0">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={Number(product.stock) === 0}
                  className="flex-1 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors disabled:opacity-30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center font-medium">{Number(product.stock) === 0 ? 0 : quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(Number(product.stock), quantity + 1))}
                  disabled={Number(product.stock) === 0 || quantity >= Number(product.stock)}
                  className="flex-1 h-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors disabled:opacity-30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button 
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    quantity: quantity,
                    image: images[0],
                    stock: Number(product.stock)
                  });
                  alert(`${product.name} added to cart!`);
                }}
                disabled={Number(product.stock) === 0}
                className="flex-1 h-14 rounded-none uppercase tracking-widest text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
              >
                {Number(product.stock) === 0 ? "Out Of Stock" : "Add to Cart"}
              </Button>
            </div>

            {/* Guarantees (Horizontal Row) */}
            <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto pb-2 no-scrollbar mb-10 -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex items-center gap-2.5 bg-muted/30 p-3 border border-border/30 rounded-lg min-w-[200px] flex-shrink-0 md:flex-col md:text-center md:min-w-0">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">Authenticity Certified</span>
              </div>
              <div className="flex items-center gap-2.5 bg-muted/30 p-3 border border-border/30 rounded-lg min-w-[200px] flex-shrink-0 md:flex-col md:text-center md:min-w-0">
                <Truck className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">Free Global Shipping</span>
              </div>
              <div className="flex items-center gap-2.5 bg-muted/30 p-3 border border-border/30 rounded-lg min-w-[200px] flex-shrink-0 md:flex-col md:text-center md:min-w-0">
                <RotateCcw className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground">14-Day Returns</span>
              </div>
            </div>

            {/* Accordions / Story */}
            <div className="space-y-3">
              {product.story && product.story !== "Nil" && (
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setStoryOpen(!storyOpen)}
                    className="w-full p-4 flex justify-between items-center bg-muted/20 font-heading font-bold text-sm text-foreground hover:bg-muted/40 transition-all focus:outline-none"
                  >
                    The Masterpiece Story 
                    {storyOpen ? <Minus className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  <AnimatePresence>
                    {storyOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-border/40"
                      >
                        <div className="p-4 text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {product.story}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {product.materials && product.materials !== "Nil" && (
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setMaterialsOpen(!materialsOpen)}
                    className="w-full p-4 flex justify-between items-center bg-muted/20 font-heading font-bold text-sm text-foreground hover:bg-muted/40 transition-all focus:outline-none"
                  >
                    Materials Used 
                    {materialsOpen ? <Minus className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  <AnimatePresence>
                    {materialsOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-border/40"
                      >
                        <div className="p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {product.materials}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {product.dimensions && product.dimensions !== "Nil" && (
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setDimensionsOpen(!dimensionsOpen)}
                    className="w-full p-4 flex justify-between items-center bg-muted/20 font-heading font-bold text-sm text-foreground hover:bg-muted/40 transition-all focus:outline-none"
                  >
                    Dimensions 
                    {dimensionsOpen ? <Minus className="w-3.5 h-3.5 text-primary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                  </button>
                  <AnimatePresence>
                    {dimensionsOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-border/40"
                      >
                        <div className="p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {product.dimensions}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Sticky Buy Bar (Mobile Only) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 p-3 flex gap-3 shadow-lg">
              <Button 
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    quantity: quantity,
                    image: images[0],
                    stock: Number(product.stock)
                  });
                  alert(`${product.name} added to cart!`);
                }}
                disabled={Number(product.stock) === 0}
                variant="outline"
                className="flex-1 h-12 rounded-none border-primary text-primary text-xs uppercase tracking-widest font-semibold"
              >
                Add to Cart
              </Button>
              <Button 
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    quantity: quantity,
                    image: images[0],
                    stock: Number(product.stock)
                  });
                  window.location.href = "/cart";
                }}
                disabled={Number(product.stock) === 0}
                className="flex-1 h-12 rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest font-semibold"
              >
                Buy Now
              </Button>
            </div>

          </motion.div>
        </div>
      </div>
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-28 left-1/2 z-50 flex items-center gap-2.5 px-5 py-3 glass rounded-full shadow-lg border-border/80 text-xs font-semibold uppercase tracking-wider text-foreground"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Link Copied to Clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
