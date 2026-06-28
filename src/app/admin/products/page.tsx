"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  ArrowUpDown, 
  Eye,
  CheckCircle,
  XCircle,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  featured: boolean;
  images: string[];
  description: string;
  status: string;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all, low, out
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch products and categories
  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json())
      ]);

      if (prodRes.success) setProducts(prodRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
    } catch (error) {
      console.error("Failed to load products page data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deleteProductId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/products/${deleteProductId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setProducts(products.filter((p) => p.id !== deleteProductId));
        setDeleteProductId(null);
      } else {
        alert(data.error || "Failed to delete product");
      }
    } catch (error) {
      console.error("Delete product error:", error);
      alert("An error occurred while deleting the product.");
    } finally {
      setDeleting(false);
    }
  };

  // Filters logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    
    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = p.stock > 0 && p.stock <= 5;
    } else if (stockFilter === "out") {
      matchesStock = p.stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-[#C8A951]/70 tracking-widest uppercase">Fetching masterpieces catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Product Catalog</h1>
          <p className="text-sm text-[#F5F5F5]/60 mt-1">Manage and audit your premium Mandala Art inventory items.</p>
        </div>
        <Button 
          onClick={() => router.push("/admin/products/add")}
          className="bg-[#C8A951] hover:bg-[#B59642] text-white py-5 px-6 rounded-xl font-medium tracking-wider uppercase text-xs shadow-lg shadow-[#C8A951]/10 border border-[#C8A951]/20 transition-all duration-300 flex items-center gap-2 self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Add New Masterpiece
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#F5F5F5]/30" />
          <input
            type="text"
            placeholder="Search products by name, slug or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] placeholder-[#F5F5F5]/30 outline-none transition-all duration-300"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
          {/* Category Filter */}
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8A951]" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5]/80 uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all"
            >
              <option value="all" className="bg-[#1B1B1B]">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug} className="bg-[#1B1B1B]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <AlertTriangle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5]/80 uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all"
            >
              <option value="all" className="bg-[#1B1B1B]">All Stock Levels</option>
              <option value="low" className="bg-[#1B1B1B]">Low Stock (≤5)</option>
              <option value="out" className="bg-[#1B1B1B]">Out of Stock (0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid / Table Container */}
      <div className="bg-[#1B1B1B] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        {/* Mobile View (Cards) */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const isLowStock = product.stock > 0 && product.stock <= 5;
              const isOutOfStock = product.stock === 0;

              return (
                <div key={product.id} className="p-4 space-y-4 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 uppercase">Art</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white truncate group-hover:text-[#C8A951] transition-colors text-sm">{product.name}</div>
                        <div className="text-[10px] text-[#F5F5F5]/40 mt-1 truncate">slug: {product.slug}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[#C8A951]/90 font-medium mt-1">
                          {product.category.replace("-", " ")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-white text-sm">₹{Number(product.price).toLocaleString()}</div>
                      {product.originalPrice && (
                        <div className="text-[10px] text-[#F5F5F5]/30 line-through font-normal mt-0.5">
                          ₹{Number(product.originalPrice).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex gap-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        product.status === "Inactive" ? "text-red-400 bg-red-400/5 border-red-400/10" :
                        isOutOfStock ? "text-red-400 bg-red-400/5 border-red-400/10" :
                        isLowStock ? "text-amber-400 bg-amber-400/5 border-amber-400/10" :
                        "text-emerald-400 bg-emerald-400/5 border-emerald-400/10"
                      }`}>
                        {product.status === "Inactive" ? "Inactive" : isOutOfStock ? "Out" : isLowStock ? "Low" : "In Stock"}
                      </span>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border border-white/5 bg-white/5 font-semibold ${
                        isOutOfStock ? "text-red-400" : isLowStock ? "text-amber-400 font-bold" : "text-[#F5F5F5]/70"
                      }`}>
                        {product.stock} left
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => router.push(`/admin/products/edit/${product.id}`)}
                        title="Edit Masterpiece"
                        className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-[#F5F5F5]/60 hover:text-[#C8A951] hover:border-[#C8A951]/30 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteProductId(product.id)}
                        title="Delete Masterpiece"
                        className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-[#F5F5F5]/60 hover:text-red-400 hover:border-red-500/30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
              No products matched your filters.
            </div>
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-black/10 text-[#F5F5F5]/50 text-[10px] font-semibold uppercase tracking-widest">
                <th className="py-4.5 px-6">Product details</th>
                <th className="py-4.5 px-6">Category</th>
                <th className="py-4.5 px-6 text-right">Price</th>
                <th className="py-4.5 px-6 text-center">Stock Level</th>
                <th className="py-4.5 px-6 text-center">Status</th>
                <th className="py-4.5 px-6 text-center">Featured</th>
                <th className="py-4.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-[#F5F5F5]">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const isLowStock = product.stock > 0 && product.stock <= 5;
                  const isOutOfStock = product.stock === 0;

                  return (
                    <tr 
                      key={product.id} 
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Image + Title */}
                      <td className="py-4 px-6 flex items-center gap-4">
                        <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                          {product.images && product.images.length > 0 ? (
                            <img 
                              src={product.images[0]} 
                              alt={product.name} 
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 uppercase">Art</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[220px] group-hover:text-[#C8A951] transition-colors">{product.name}</div>
                          <div className="text-[11px] text-[#F5F5F5]/40 mt-1 truncate max-w-[200px]">slug: {product.slug}</div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6">
                        <span className="text-xs uppercase tracking-wider text-[#C8A951]/90 font-medium">
                          {product.category.replace("-", " ")}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 text-right font-bold text-white">
                        ₹{Number(product.price).toLocaleString()}
                        {product.originalPrice && (
                          <div className="text-[10px] text-[#F5F5F5]/30 line-through font-normal mt-0.5">
                            ₹{Number(product.originalPrice).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="py-4 px-6 text-center">
                        <span className={`font-mono text-sm font-semibold ${
                          isOutOfStock ? "text-red-400" : isLowStock ? "text-amber-400 font-bold" : "text-[#F5F5F5]/70"
                        }`}>
                          {product.stock}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          product.status === "Inactive" ? "text-red-400 bg-red-400/5 border-red-400/10" :
                          isOutOfStock ? "text-red-400 bg-red-400/5 border-red-400/10" :
                          isLowStock ? "text-amber-400 bg-amber-400/5 border-amber-400/10" :
                          "text-emerald-400 bg-emerald-400/5 border-emerald-400/10"
                        }`}>
                          {product.status === "Inactive" ? "Inactive" : isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                        </span>
                      </td>

                      {/* Featured */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">
                          {product.featured ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-[#F5F5F5]/20" />
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/products/edit/${product.id}`)}
                            title="Edit Masterpiece"
                            className="p-2 bg-white/5 border border-white/5 rounded-lg text-[#F5F5F5]/60 hover:text-[#C8A951] hover:border-[#C8A951]/30 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteProductId(product.id)}
                            title="Delete Masterpiece"
                            className="p-2 bg-white/5 border border-white/5 rounded-lg text-[#F5F5F5]/60 hover:text-red-400 hover:border-red-500/30 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                    No products matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteProductId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[420px] bg-[#1B1B1B] border border-red-500/20 rounded-2xl p-6 relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/40" />
              <div className="flex items-start gap-4 mt-2">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold uppercase tracking-wider text-white">Delete Product?</h3>
                  <p className="text-xs text-[#F5F5F5]/60 mt-1.5 leading-relaxed">
                    This action is permanent and cannot be undone. It will remove the product and all associated metadata from the catalog.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteProductId(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-[#F5F5F5] rounded-xl text-xs uppercase tracking-wider font-semibold border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white rounded-xl text-xs uppercase tracking-wider font-semibold shadow-lg shadow-red-600/10 transition-all flex items-center gap-1.5"
                >
                  {deleting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Confirm Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
