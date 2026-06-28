"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Boxes, 
  Search, 
  Filter, 
  AlertTriangle, 
  Check, 
  Plus, 
  Minus, 
  Save, 
  RefreshCw,
  TrendingDown
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
  story?: string;
  materials?: string;
  status: string;
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all"); // all, low, out, normal
  
  // Track adjustments locally before saving
  const [adjustedStocks, setAdjustedStocks] = useState<Record<string, number>>({});
  // Track saving state per product
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json())
      ]);

      if (prodRes.success) {
        setProducts(prodRes.data || []);
        // Initialize adjustment dictionary
        const adjustments: Record<string, number> = {};
        prodRes.data.forEach((p: Product) => {
          adjustments[p.id] = p.stock;
        });
        setAdjustedStocks(adjustments);
      }
      if (catRes.success) setCategories(catRes.data || []);
    } catch (error) {
      console.error("Failed to load inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStockChange = (productId: string, newValue: number) => {
    if (newValue < 0) return;
    setAdjustedStocks((prev) => ({
      ...prev,
      [productId]: newValue
    }));
  };

  const handleSaveStock = async (product: Product) => {
    const newStock = adjustedStocks[product.id];
    if (newStock === product.stock) return; // No change

    try {
      setSavingProductId(product.id);
      
      // We send a PUT to the product update route containing all product fields but with the updated stock count
      const updatedPayload = {
        ...product,
        stock: newStock
      };

      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      const data = await res.json();
      
      if (data.success) {
        // Update local products state
        setProducts((prevProds) => 
          prevProds.map((p) => p.id === product.id ? { ...p, stock: newStock } : p)
        );
      } else {
        alert(data.error || "Failed to update stock");
      }
    } catch (error) {
      console.error("Error saving stock adjust:", error);
      alert("Failed to update product stock.");
    } finally {
      setSavingProductId(null);
    }
  };

  const handleMarkOutOfStock = async (product: Product) => {
    try {
      setSavingProductId(product.id);
      const updatedPayload = { ...product, stock: 0 };
      
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });
      const data = await res.json();

      if (data.success) {
        setProducts((prevProds) => 
          prevProds.map((p) => p.id === product.id ? { ...p, stock: 0 } : p)
        );
        setAdjustedStocks((prev) => ({ ...prev, [product.id]: 0 }));
      } else {
        alert(data.error || "Failed to mark out of stock");
      }
    } catch (error) {
      console.error("Mark out of stock error:", error);
    } finally {
      setSavingProductId(null);
    }
  };

  // Metrics calculations
  const totalStockCount = products.reduce((sum, p) => sum + p.stock, 0);
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  // Filters logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    
    let matchesStatus = true;
    if (stockStatusFilter === "low") {
      matchesStatus = p.stock > 0 && p.stock <= 5;
    } else if (stockStatusFilter === "out") {
      matchesStatus = p.stock === 0;
    } else if (stockStatusFilter === "normal") {
      matchesStatus = p.stock > 5;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-[#C8A951]/70 tracking-widest uppercase">Analyzing inventory stores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Inventory Auditor</h1>
          <p className="text-sm text-[#F5F5F5]/60 mt-1">Audit, restock, and balance stock allocation levels.</p>
        </div>
        <button
          onClick={fetchData}
          className="p-3 bg-white/5 border border-white/5 hover:border-[#C8A951]/30 text-[#F5F5F5]/80 hover:text-[#C8A951] rounded-xl transition-all"
          title="Reload Data"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-[#C8A951]/10 rounded-xl border border-[#C8A951]/20 text-[#C8A951]">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Total Stock Count</h4>
            <div className="text-2xl font-bold text-white mt-1">{totalStockCount} units</div>
          </div>
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Low Stock Warnings</h4>
            <div className="text-2xl font-bold text-amber-500 mt-1">{lowStockCount} items</div>
          </div>
        </div>

        <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3.5 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-widest font-semibold text-[#F5F5F5]/40">Out of Stock Items</h4>
            <div className="text-2xl font-bold text-red-500 mt-1">{outOfStockCount} items</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#1B1B1B] p-5 rounded-2xl border border-white/5 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#F5F5F5]/30" />
          <input
            type="text"
            placeholder="Search catalog by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] placeholder-[#F5F5F5]/30 outline-none transition-all"
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
          <div className="relative flex-1 sm:flex-none min-w-[150px]">
            <AlertTriangle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5]/80 uppercase tracking-wider outline-none cursor-pointer appearance-none transition-all"
            >
              <option value="all" className="bg-[#1B1B1B]">All Stock States</option>
              <option value="low" className="bg-[#1B1B1B]">Low Stock (≤5)</option>
              <option value="out" className="bg-[#1B1B1B]">Out of Stock (0)</option>
              <option value="normal" className="bg-[#1B1B1B]">Fully Stocked (&gt;5)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#1B1B1B] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-black/10 text-[#F5F5F5]/50 text-[10px] font-semibold uppercase tracking-widest">
                <th className="py-4.5 px-6">Product Masterpiece</th>
                <th className="py-4.5 px-6">Category</th>
                <th className="py-4.5 px-6 text-center">Status</th>
                <th className="py-4.5 px-6 text-center">Current Stock</th>
                <th className="py-4.5 px-6 text-center">Audit Actions</th>
                <th className="py-4.5 px-6 text-right">Submit Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-[#F5F5F5]">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const localStock = adjustedStocks[product.id] ?? product.stock;
                  const isModified = localStock !== product.stock;
                  
                  const isLow = product.stock > 0 && product.stock <= 5;
                  const isOut = product.stock === 0;

                  return (
                    <tr key={product.id} className="hover:bg-white/[0.01] transition-colors">
                      {/* Image + Title */}
                      <td className="py-4.5 px-6 flex items-center gap-4">
                        <div className="w-11 h-11 relative rounded-lg overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-[#F5F5F5]/30">Art</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate max-w-[220px]">{product.name}</div>
                          <div className="text-[10px] text-[#F5F5F5]/40 mt-0.5 truncate max-w-[200px]">ID: {product.id}</div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4.5 px-6">
                        <span className="text-xs uppercase tracking-wider text-[#C8A951]/95 font-medium">
                          {product.category.replace("-", " ")}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6 text-center">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                          product.status === "Inactive" ? "text-red-400 bg-red-400/5 border-red-400/10" :
                          isOut ? "text-red-400 bg-red-400/5 border-red-400/10" :
                          isLow ? "text-amber-400 bg-amber-400/5 border-amber-400/10" :
                          "text-emerald-400 bg-emerald-400/5 border-emerald-400/10"
                        }`}>
                          {product.status === "Inactive" ? "Inactive" : isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>

                      {/* Stock Level Display */}
                      <td className="py-4.5 px-6 text-center">
                        <span className={`font-mono text-sm font-semibold ${
                          isOut ? "text-red-400" : isLow ? "text-amber-400" : "text-[#F5F5F5]/70"
                        }`}>
                          {product.stock}
                        </span>
                      </td>

                      {/* Stock Adjuster */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleStockChange(product.id, localStock - 1)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 flex items-center justify-center text-[#F5F5F5]/70 hover:text-white transition-all"
                            title="Subtract 1 unit"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            value={localStock}
                            onChange={(e) => handleStockChange(product.id, e.target.value === "" ? 0 : Number(e.target.value))}
                            className="w-14 text-center py-1 bg-black/30 border border-white/5 focus:border-[#C8A951] rounded-lg text-xs font-mono text-white outline-none"
                          />
                          <button
                            onClick={() => handleStockChange(product.id, localStock + 1)}
                            className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 flex items-center justify-center text-[#F5F5F5]/70 hover:text-white transition-all"
                            title="Add 1 unit"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleMarkOutOfStock(product)}
                            disabled={savingProductId === product.id || product.stock === 0}
                            className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-all"
                          >
                            Set 0
                          </button>
                          
                          <button
                            onClick={() => handleSaveStock(product)}
                            disabled={!isModified || savingProductId === product.id}
                            className={`p-2 rounded-lg border transition-all ${
                              isModified 
                                ? "bg-[#C8A951] border-[#C8A951] text-white hover:bg-[#B59642]" 
                                : "bg-white/5 border-white/5 text-[#F5F5F5]/30 cursor-not-allowed"
                            }`}
                            title="Save Adjustment"
                          >
                            {savingProductId === product.id ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                    No products matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
