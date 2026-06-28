"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, Sparkles, AlertCircle, ShoppingBag } from "lucide-react";
import { MandalaLoader } from "@/components/ui/mandala-loader";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<{ products: any[]; categories: any[] }>({ products: [], categories: [] });
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow animation to start
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm("");
      setResults({ products: [], categories: [] });
    }
  }, [isOpen]);

  // Load popular products and recent searches
  useEffect(() => {
    if (isOpen) {
      // Load recent searches
      const saved = localStorage.getItem("pahadi-vibes-recent-searches");
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse recent searches", e);
        }
      }

      // Load popular products (featured or just first 4 products)
      fetch("/api/products?featured=true&limit=4")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPopularProducts(data.data);
          }
        })
        .catch((err) => console.error("Failed to fetch popular products", err));
    }
  }, [isOpen]);

  // Fetch search results
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ products: [], categories: [] });
      return;
    }

    setLoading(true);
    fetch(`/api/search?query=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setResults(data.data);
          // Save successful searches (if they returned products) to recent searches
          if (data.data.products.length > 0) {
            saveRecentSearch(debouncedQuery);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch search results", err);
        setLoading(false);
      });
  }, [debouncedQuery]);

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem("pahadi-vibes-recent-searches", JSON.stringify(next));
      return next;
    });
  };

  const handleRecentSearchClick = (search: string) => {
    setSearchTerm(search);
  };

  const handleClearRecentSearch = (e: React.MouseEvent, search: string) => {
    e.stopPropagation();
    e.preventDefault();
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== search);
      localStorage.setItem("pahadi-vibes-recent-searches", JSON.stringify(next));
      return next;
    });
  };

  const handleClearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("pahadi-vibes-recent-searches");
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    // Regex escape special chars
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-primary/10 text-primary font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Helper to render Stock Badge
  const renderStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-2 py-0.5 border border-red-500/20">
          Out of Stock
        </span>
      );
    } else if (stock <= 5) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 animate-pulse">
          Low Stock ({stock})
        </span>
      );
    } else {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
          In Stock
        </span>
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col justify-start pt-16 md:pt-24"
        >
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-4xl mx-auto bg-background/95 md:rounded-2xl border border-border/80 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Header Search Input */}
            <div className="flex items-center justify-between border-b border-border/60 p-4 md:p-6 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search masterpieces, aipan art..."
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-lg md:text-xl border-none focus:outline-none focus:ring-0 font-medium"
                />
              </div>
              <div className="flex items-center gap-3">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="p-1 hover:bg-muted text-muted-foreground rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted text-foreground rounded-full transition-colors flex items-center justify-center border border-border/50"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Results / Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 min-h-[300px]">
              {loading ? (
                <div className="space-y-4 py-2">
                  <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-4 py-3">
                      <div className="w-14 h-14 bg-muted animate-pulse rounded-md flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="w-12 h-4 bg-muted animate-pulse rounded flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Result State */}
                  {searchTerm.trim() ? (
                    <>
                      {results.products.length === 0 && results.categories.length === 0 ? (
                        /* No Results State */
                        <div className="text-center py-12 px-4 flex flex-col items-center max-w-md mx-auto">
                          <AlertCircle className="w-12 h-12 text-primary/40 mb-4" />
                          <h3 className="font-heading text-xl font-bold mb-2">No masterpieces found</h3>
                          <p className="text-sm text-muted-foreground mb-6">
                            We couldn&apos;t find any products matching &quot;{searchTerm}&quot;. Try searching with another keyword.
                          </p>
                          <Link href="/category/wall-art" onClick={onClose} className="w-full">
                            <button className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs hover:bg-primary/95 transition-all shadow-md">
                              View All Products
                            </button>
                          </Link>
                        </div>
                      ) : (
                        /* Found Results */
                        <div className="space-y-6">
                          {results.categories.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Matching Categories</h4>
                              <div className="flex flex-wrap gap-3">
                                {results.categories.map((cat) => (
                                  <Link
                                    key={cat.id}
                                    href={`/category/${cat.slug}`}
                                    onClick={() => { inputRef.current?.blur(); onClose(); }}
                                    className="bg-card hover:bg-primary hover:text-primary-foreground border border-border px-4 py-2 text-sm font-medium transition-colors duration-200"
                                  >
                                    {highlightMatch(cat.name, searchTerm)}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {results.products.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Products ({results.products.length})</h4>
                              <div className="divide-y divide-border/40">
                                {results.products.map((product) => (
                                  <Link
                                    key={product.id}
                                    href={`/product/${product.id}`}
                                    onClick={() => { inputRef.current?.blur(); onClose(); }}
                                    className="flex items-center gap-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 group px-2 rounded-lg"
                                  >
                                    <div className="relative w-14 h-14 bg-card border border-border/50 overflow-hidden flex-shrink-0 rounded-md">
                                      <Image
                                        src={product.images && product.images.length > 0 ? product.images[0] : "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a"}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                                        {highlightMatch(product.name, searchTerm)}
                                      </h5>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground capitalize">{product.category.replace("-", " ")}</span>
                                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                        {renderStockBadge(product.stock)}
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className="font-bold text-foreground">₹{Number(product.price).toLocaleString()}</p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Initial / Empty State */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Left: Recent & Popular Searches */}
                      <div className="md:col-span-1 space-y-6">
                        {recentSearches.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Recent Searches
                              </h4>
                              <button
                                onClick={handleClearAllRecent}
                                className="text-[10px] text-destructive hover:underline font-semibold uppercase tracking-wider"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="flex flex-col">
                              {recentSearches.map((search, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => handleRecentSearchClick(search)}
                                  className="flex items-center justify-between py-2 text-sm text-foreground/80 hover:text-primary cursor-pointer transition-colors group border-b border-border/30 last:border-b-0"
                                >
                                  <span>{search}</span>
                                  <button
                                    onClick={(e) => handleClearRecentSearch(e, search)}
                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground rounded transition-opacity"
                                    aria-label="Remove search history"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Popular Searches
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {["Mandala", "Wooden", "Blue", "Gold", "Wall Art", "Limited"].map((term) => (
                              <button
                                key={term}
                                onClick={() => handleRecentSearchClick(term)}
                                className="bg-muted hover:bg-primary/10 hover:text-primary text-xs font-medium px-3 py-1.5 rounded-full border border-border/40 transition-colors"
                              >
                                {term}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Popular Products */}
                      <div className="md:col-span-2 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5" /> Popular Masterpieces
                        </h4>
                        {popularProducts.length === 0 ? (
                          <div className="flex justify-center py-10">
                            <MandalaLoader size={30} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {popularProducts.map((prod) => (
                              <Link
                                key={prod.id}
                                href={`/product/${prod.id}`}
                                onClick={() => { inputRef.current?.blur(); onClose(); }}
                                className="flex items-center gap-3 p-3 bg-card hover:bg-black/5 dark:hover:bg-white/5 border border-border/40 rounded-xl transition-all duration-200 group"
                              >
                                <div className="relative w-12 h-12 bg-muted overflow-hidden rounded-md flex-shrink-0">
                                  <Image
                                    src={prod.images && prod.images.length > 0 ? prod.images[0] : "https://images.unsplash.com/photo-1549469742-1e9d89d46d0a"}
                                    alt={prod.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                    {prod.name}
                                  </h5>
                                  <p className="text-xs text-primary font-semibold mt-0.5">
                                    ₹{Number(prod.price).toLocaleString()}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Premium Footer Info */}
            <div className="bg-muted/40 border-t border-border/60 p-4 text-center text-xs text-muted-foreground tracking-wider uppercase font-medium flex-shrink-0">
              Pahadi Vibes Artisan Collection • Press ESC to close
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
