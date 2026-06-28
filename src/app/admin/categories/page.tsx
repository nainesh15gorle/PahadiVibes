"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, Trash2, FolderTree, ArrowLeft, Upload, Image as ImageIcon, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
}

const formatErrorMsg = (error: any): string => {
  if (!error) return "";
  if (Array.isArray(error)) {
    return error.map((err: any) => err.message || JSON.stringify(err)).join("\n");
  }
  if (typeof error === "object") {
    return error.message || JSON.stringify(error);
  }
  return String(error);
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (err) {
      console.error("Fetch categories error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-slug generator
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
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrors((prev) => ({ ...prev, image: "" }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setImage(data.url);
      } else {
        setErrors((prev) => ({ ...prev, image: data.error || "Upload failed" }));
      }
    } catch (err) {
      console.error("Image upload error:", err);
      setErrors((prev) => ({ ...prev, image: "Upload failed." }));
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setImage("");
    setDescription("");
    setErrors({});
    setShowAddForm(false);
    setEditingCategory(null);
  };

  const handleEditInit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setImage(cat.image);
    setDescription(cat.description || "");
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const validationErrors: Record<string, string> = {};
    if (!name.trim()) validationErrors.name = "Category name is required.";
    if (!slug.trim()) validationErrors.slug = "Category slug is required.";
    if (!image.trim()) validationErrors.image = "Category image URL is required.";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitting(false);
      return;
    }

    const payload = {
      name,
      slug,
      image,
      description: description.trim() || undefined
    };

    try {
      let res;
      if (editingCategory) {
        // Edit category
        res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // Create category
        res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        resetForm();
        fetchCategories();
      } else {
        alert(formatErrorMsg(data.error) || "Failed to save category");
      }
    } catch (err) {
      console.error("Submit category error:", err);
      alert("An error occurred while saving the category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCategoryId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/categories/${deleteCategoryId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setCategories(categories.filter((c) => c.id !== deleteCategoryId));
        setDeleteCategoryId(null);
      } else {
        alert(data.error || "Failed to delete category");
      }
    } catch (err) {
      console.error("Delete category error:", err);
      alert("An error occurred while deleting the category.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-[#C8A951]/70 tracking-widest uppercase">Fetching categories metadata...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white uppercase tracking-wider">Classification Categories</h1>
          <p className="text-sm text-[#F5F5F5]/60 mt-1">Configure layout structures and product filters.</p>
        </div>
        {!showAddForm && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-[#C8A951] hover:bg-[#B59642] text-white py-5 px-6 rounded-xl font-medium tracking-wider uppercase text-xs shadow-lg shadow-[#C8A951]/10 border border-[#C8A951]/20 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Category
          </Button>
        )}
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Categories List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#C8A951]" /> Category Listing
              </h3>
              <span className="text-xs text-[#F5F5F5]/40 uppercase tracking-widest">{categories.length} Total</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="bg-black/20 p-4.5 rounded-xl border border-white/5 hover:border-[#C8A951]/30 transition-all flex items-start gap-4 relative group"
                >
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 uppercase">Cat</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate text-sm">{cat.name}</h4>
                    <p className="text-[10px] text-[#C8A951] uppercase tracking-wider mt-0.5">slug: {cat.slug}</p>
                    <p className="text-xs text-[#F5F5F5]/50 mt-2 line-clamp-2 leading-relaxed font-light">{cat.description || "No description provided."}</p>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditInit(cat)}
                      className="p-1.5 bg-[#1B1B1B] border border-white/5 rounded-md text-[#F5F5F5]/60 hover:text-[#C8A951] transition-all"
                      title="Edit Category"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCategoryId(cat.id)}
                      className="p-1.5 bg-[#1B1B1B] border border-white/5 rounded-md text-[#F5F5F5]/60 hover:text-red-400 transition-all"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {categories.length === 0 && (
                <div className="col-span-2 py-12 text-center text-xs text-[#F5F5F5]/30 uppercase tracking-widest">
                  No Categories Registered Yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Form Sidebar */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-[#1B1B1B] p-6 rounded-2xl border border-white/5 space-y-6 h-fit"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#C8A951]">
                  {editingCategory ? "Edit Category" : "New Category"}
                </h3>
                <button 
                  onClick={resetForm} 
                  className="text-xs text-[#F5F5F5]/40 hover:text-white uppercase tracking-wider font-semibold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Category Name */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Wall Hangings"
                    className={`w-full px-4 py-3 bg-black/20 border ${errors.name ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-sm text-[#F5F5F5] outline-none transition-all`}
                  />
                  {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
                </div>

                {/* Slug */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="wall-hangings"
                    className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-sm text-[#F5F5F5]/50 outline-none"
                  />
                  <p className="text-[10px] text-[#F5F5F5]/30">Auto-generated for routes.</p>
                </div>

                {/* Image Cover */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Category Image</label>
                  
                  {/* Image Preview Box */}
                  <div className="aspect-video w-full bg-black/20 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden mb-2">
                    {image ? (
                      <>
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-all">
                          <label className="px-3 py-1.5 bg-[#C8A951] text-white rounded-md text-xs uppercase tracking-wider font-semibold cursor-pointer hover:bg-[#B59642] transition-colors">
                            Replace
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                        <ImageIcon className="w-5 h-5 text-[#F5F5F5]/30" />
                        <label className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#C8A951] rounded-md text-[10px] uppercase tracking-wider font-semibold cursor-pointer border border-[#C8A951]/20 transition-all flex items-center gap-1.5">
                          {uploading ? (
                            <div className="w-3 h-3 border-2 border-[#C8A951]/30 border-t-[#C8A951] rounded-full animate-spin" />
                          ) : (
                            "Upload File"
                          )}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                        </label>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Or enter Image URL"
                    className={`w-full px-4 py-3 bg-black/20 border ${errors.image ? 'border-red-500' : 'border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951]'} rounded-xl text-xs text-[#F5F5F5] outline-none transition-all`}
                  />
                  {errors.image && <p className="text-[11px] text-red-400 mt-1">{errors.image}</p>}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest font-semibold text-[#F5F5F5]/60">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description..."
                    className="w-full px-4 py-3 bg-black/20 border border-white/5 hover:border-[#C8A951]/30 focus:border-[#C8A951] rounded-xl text-xs text-[#F5F5F5] outline-none transition-all resize-none"
                  />
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#C8A951] hover:bg-[#B59642] disabled:bg-[#C8A951]/55 text-white py-5 rounded-xl uppercase tracking-widest text-xs font-semibold border border-[#C8A951]/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Category
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteCategoryId && (
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
                  <FolderTree className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold uppercase tracking-wider text-white">Delete Category?</h3>
                  <p className="text-xs text-[#F5F5F5]/60 mt-1.5 leading-relaxed">
                    This action is permanent and will remove the category. Products classified under this category will need to be reassigned.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeleteCategoryId(null)}
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
