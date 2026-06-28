"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Upload, Sparkles, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [originalPrice, setOriginalPrice] = useState<number | "">("");
  const [stock, setStock] = useState<number | "">("");
  const [featured, setFeatured] = useState(false);
  const [bestSeller, setBestSeller] = useState(false);
  const [status, setStatus] = useState("Active");
  const [images, setImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [story, setStory] = useState("");
  const [materials, setMaterials] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success) {
          setCategories(data.data || []);
          if (data.data && data.data.length > 0) {
            setCategory(data.data[0].slug);
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCats(false);
      }
    }
    loadCategories();
  }, []);

  // Auto-slug generator from Name
  useEffect(() => {
    if (name) {
      const generatedSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    } else {
      setSlug("");
    }
  }, [name]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setErrors((prev) => ({ ...prev, images: "" }));

    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          newImages.push(data.url);
        } else {
          setErrors((prev) => ({ ...prev, images: data.error || "Failed to upload image" }));
        }
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error("Image upload error:", err);
      setErrors((prev) => ({ ...prev, images: "Image upload service error." }));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    // Basic Validation
    const validationErrors: Record<string, string> = {};
    if (!name.trim()) validationErrors.name = "Product name is required.";
    if (!slug.trim()) validationErrors.slug = "Product slug is required.";
    if (!category) validationErrors.category = "Category selection is required.";
    if (price === "" || Number(price) <= 0) validationErrors.price = "Price must be a positive number.";
    if (stock === "" || Number(stock) < 0) validationErrors.stock = "Stock cannot be negative.";
    if (images.length === 0) validationErrors.images = "At least one image is required.";
    if (description.trim().length < 10) validationErrors.description = "Description must be at least 10 characters.";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaving(false);
      return;
    }

    const payload = {
      name,
      slug,
      category,
      price: Number(price),
      originalPrice: originalPrice !== "" ? Number(originalPrice) : undefined,
      stock: Number(stock),
      featured,
      bestSeller,
      status,
      images,
      description,
      story: story.trim() || undefined,
      materials: materials.trim() || undefined,
      dimensions: dimensions.trim() || undefined
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        router.push("/admin/products");
      } else {
        if (Array.isArray(data.error)) {
          const apiErrors: Record<string, string> = {};
          data.error.forEach((issue: any) => {
            const field = issue.path[0];
            apiErrors[field] = issue.message;
          });
          setErrors(apiErrors);
        } else {
          alert(data.error || "Failed to create product");
        }
      }
    } catch (err) {
      console.error("Create product submit error:", err);
      alert("An error occurred while creating product.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingCats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-[#C8A951]/70 tracking-widest uppercase">Initializing catalog context...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/products")}
          className="p-2.5 bg-white/5 border border-white/5 hover:border-[#C8A951]/30 hover:text-[#C8A951] text-[#F5F5F5]/70 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Add New Product</h1>
          <p className="text-sm text-[#F5F5F5]/60 mt-1">Design and launch a brand new Mandala Masterpiece item.</p>
        </div>
      </div>

      {/* Main Grid Forms */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (Primary Fields) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951] border-b border-white/5 pb-3">Product Info</h3>
            
            {/* Title / Name */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Divine Cosmic Wheel Mandala"
                className={`w-full px-4 py-3 bg-black/20 border ${errors.name ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-sm text-[#F5F5F5] outline-none transition-all`}
              />
              {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
            </div>

            {/* Slug (read-only / override hint) */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Product Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="divine-cosmic-wheel-mandala"
                className={`w-full px-4 py-3 bg-black/40 border ${errors.slug ? 'border-red-500' : 'border-white/5'} rounded-xl text-sm text-[#F5F5F5]/50 outline-none`}
              />
              <p className="text-[10px] text-[#F5F5F5]/30">Auto-generated from title for URLs.</p>
            </div>

            {/* Grid for Price / Original Price / Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Selling Price */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Price (INR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="2499"
                  className={`w-full px-4 py-3 bg-black/20 border ${errors.price ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-sm text-[#F5F5F5] outline-none transition-all`}
                />
                {errors.price && <p className="text-[11px] text-red-400 mt-1">{errors.price}</p>}
              </div>

              {/* Original Price */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Original Price (INR)</label>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="3499"
                  className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] outline-none transition-all"
                />
                <p className="text-[10px] text-[#F5F5F5]/30">Optional. Show comparison discount.</p>
              </div>

              {/* Stock */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Stock Level</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="10"
                  className={`w-full px-4 py-3 bg-black/20 border ${errors.stock ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-sm text-[#F5F5F5] outline-none transition-all`}
                />
                {errors.stock && <p className="text-[11px] text-red-400 mt-1">{errors.stock}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Description</label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a premium, comprehensive description highlighting the aesthetic, details, and context..."
                className={`w-full px-4 py-3 bg-black/20 border ${errors.description ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-sm text-[#F5F5F5] outline-none transition-all resize-y`}
              />
              {errors.description && <p className="text-[11px] text-red-400 mt-1">{errors.description}</p>}
            </div>
          </div>

          {/* Luxury Art Story & Details */}
          <div className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951] border-b border-white/5 pb-3">Artistic Origin & Build</h3>
            
            {/* Story */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">The Masterpiece Story</label>
              <textarea
                rows={4}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Describe the meditative or cultural background of this design..."
                className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] outline-none transition-all resize-y"
              />
            </div>

            {/* Materials */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Materials used</label>
              <input
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="e.g. Handmade Lokta paper, natural stone pigments, 24k gold leaf"
                className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] outline-none transition-all"
              />
            </div>

            {/* Dimensions */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Dimensions</label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="e.g. 24 x 24 inches"
                className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-sm text-[#F5F5F5] outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Right Column (Category, Image, Status, Action) */}
        <div className="space-y-6">
          {/* Classification & Settings */}
          <div className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5 space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951] border-b border-white/5 pb-3">Classification</h3>
            
            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5] uppercase tracking-wider outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug} className="bg-[#1B1B1B]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Featured toggle */}
            <label className="flex items-center gap-3 cursor-pointer group bg-black/10 p-3.5 rounded-xl border border-white/5 hover:border-[#C8A951]/20 transition-all">
              <div className="relative flex items-center justify-center w-5 h-5 border border-[#C8A951]/40 rounded group-hover:border-[#C8A951] transition-colors bg-black/20">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="peer sr-only"
                />
                {featured && <Check className="w-3.5 h-3.5 text-[#C8A951]" />}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-white group-hover:text-[#C8A951] transition-colors">Featured Product</span>
                <p className="text-[10px] text-[#F5F5F5]/40 mt-0.5 font-light">Promote on homepage showcase.</p>
              </div>
            </label>

            {/* Best Seller toggle */}
            <label className="flex items-center gap-3 cursor-pointer group bg-black/10 p-3.5 rounded-xl border border-white/5 hover:border-[#C8A951]/20 transition-all">
              <div className="relative flex items-center justify-center w-5 h-5 border border-[#C8A951]/40 rounded group-hover:border-[#C8A951] transition-colors bg-black/20">
                <input
                  type="checkbox"
                  checked={bestSeller}
                  onChange={(e) => setBestSeller(e.target.checked)}
                  className="peer sr-only"
                />
                {bestSeller && <Check className="w-3.5 h-3.5 text-[#C8A951]" />}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-white group-hover:text-[#C8A951] transition-colors">Bestseller</span>
                <p className="text-[10px] text-[#F5F5F5]/40 mt-0.5 font-light">Mark as top selling item.</p>
              </div>
            </label>

            {/* Status Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5] uppercase tracking-wider outline-none cursor-pointer"
              >
                <option value="Active" className="bg-[#1B1B1B]">Active</option>
                <option value="Inactive" className="bg-[#1B1B1B]">Inactive</option>
              </select>
            </div>
          </div>

          {/* Product Image Cover */}
          <div className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951]">Product Images</h3>
              <span className="text-xs text-[#F5F5F5]/50">{images.length} added</span>
            </div>
            
            {/* Uploaded Images List */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {images.map((imgUrl, index) => (
                  <div key={index} className="aspect-square w-full bg-black/20 rounded-xl border border-white/10 relative overflow-hidden group">
                    <img src={imgUrl} alt={`Product ${index}`} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <ArrowLeft className="w-4 h-4 rotate-45" /> {/* Just using as a close icon */}
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 bg-[#C8A951] text-white text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-wider font-semibold">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Image Preview Box / Upload Button */}
            <div className="w-full bg-black/20 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center p-6 space-y-3 hover:border-[#C8A951]/40 transition-colors">
              <div className="p-3 bg-white/5 border border-white/5 text-[#F5F5F5]/40 rounded-full">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs text-[#F5F5F5]/60 font-medium">Upload more images</p>
                <p className="text-[10px] text-[#F5F5F5]/30 mt-1">Accepts multiple PNG, JPG, WEBP</p>
              </div>
              <label className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[#C8A951] rounded-lg text-xs uppercase tracking-wider font-semibold cursor-pointer border border-[#C8A951]/20 transition-all flex items-center gap-1.5 mt-2">
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#C8A951]/30 border-t-[#C8A951] rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Upload Images
                  </>
                )}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            
            {errors.images && <p className="text-[11px] text-red-400 mt-1">{errors.images}</p>}
          </div>

          {/* Save & Cancel Actions */}
          <div className="bg-[#1B1B1B]/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#C8A951] hover:bg-[#B59642] disabled:bg-[#C8A951]/55 text-white py-6 rounded-xl uppercase tracking-widest text-xs font-semibold shadow-lg shadow-[#C8A951]/10 border border-[#C8A951]/20 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Masterpiece
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="w-full py-4 text-center text-[#F5F5F5]/50 hover:text-white transition-colors text-xs uppercase tracking-wider font-semibold"
            >
              Discard Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
