"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Edit, MapPin, Phone, 
  User, Check, ChevronRight, AlertCircle, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MandalaLoader } from "@/components/ui/mandala-loader";

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

export default function AddressesPage() {
  const { user, profile, isLoaded: isUserLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    isDefault: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isUserLoaded) {
      if (!isSignedIn) {
        router.push("/sign-in?redirect_url=/addresses");
        return;
      }

      fetch("/api/addresses")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setAddresses(data.data);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch addresses:", err);
          setLoading(false);
        });
    }
  }, [isSignedIn, isUserLoaded, router]);

  const openAddForm = () => {
    setForm({
      customerName: profile?.full_name || "",
      phone: profile?.phone || "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      isDefault: addresses.length === 0,
    });
    setFormErrors({});
    setEditingAddress(null);
    setIsAdding(true);
  };

  const openEditForm = (address: any) => {
    setForm({
      customerName: address.fullName || address.customerName || "",
      phone: address.phone || "",
      addressLine1: address.addressLine1 || "",
      addressLine2: address.addressLine2 || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      landmark: address.landmark || "",
      isDefault: !!address.isDefault,
    });
    setFormErrors({});
    setEditingAddress(address);
    setIsAdding(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.customerName.trim()) errors.customerName = "Full Name is required";
    if (!form.phone.trim()) errors.phone = "Phone number is required";
    else if (form.phone.replace(/\D/g, "").length < 10) errors.phone = "Phone must be at least 10 digits";
    if (!form.addressLine1.trim()) errors.addressLine1 = "Address Line 1 is required";
    if (!form.city.trim()) errors.city = "City is required";
    if (!form.state.trim()) errors.state = "State is required";
    if (!form.pincode.trim()) errors.pincode = "PIN Code is required";
    else if (form.pincode.length < 6) errors.pincode = "PIN Code must be 6 digits";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setActionLoading(true);
    try {
      const url = editingAddress ? `/api/addresses/${editingAddress.id}` : "/api/addresses";
      const method = editingAddress ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (data.success) {
        const addRes = await fetch("/api/addresses");
        const addData = await addRes.json();
        if (addData.success && addData.data) {
          setAddresses(addData.data);
        }
        setIsAdding(false);
        setEditingAddress(null);
      } else {
        alert(formatErrorMsg(data.error) || "Failed to save address");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while saving address");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAddresses((prev) => prev.filter((addr) => addr.id !== id));
      } else {
        alert(formatErrorMsg(data.error) || "Failed to delete address");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (addr: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/addresses/${addr.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addr, isDefault: true }),
      });
      const data = await res.json();
      if (data.success) {
        const addRes = await fetch("/api/addresses");
        const addData = await addRes.json();
        if (addData.success && addData.data) {
          setAddresses(addData.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !isUserLoaded) {
    return (
      <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <MandalaLoader size={48} />
        <p className="mt-4 text-xs text-primary/70 tracking-widest uppercase">Opening Address Book...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full bg-background pt-32 md:pt-40 pb-20 font-sans">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl">
        
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground">My Address Book</span>
        </nav>

        {/* Back Link */}
        <div className="mb-6">
          <Link href="/cart" className="inline-flex items-center gap-1 text-xs uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 mb-8 gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold">Address Book</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your saved shipping addresses for faster checkouts.</p>
          </div>
          {!isAdding && (
            <Button
              onClick={openAddForm}
              className="rounded-none bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold tracking-widest uppercase px-6 h-11 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4.5 h-4.5 mr-2" /> Add New Address
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isAdding ? (
            /* ADD/EDIT ADDRESS FORM */
            <motion.div
              key="address-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass rounded-none p-6 md:p-8 shadow-md border border-border/60"
            >
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <h2 className="text-xl font-bold tracking-wide border-b border-border/40 pb-2">
                  {editingAddress ? "Edit Shipping Address" : "New Shipping Address"}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="customerName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      value={form.customerName}
                      onChange={handleInputChange}
                      className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${formErrors.customerName ? 'border-destructive' : 'border-border'}`}
                      placeholder="e.g. Naina Rawat"
                    />
                    {formErrors.customerName && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {formErrors.customerName}</span>}
                  </div>

                  {/* Phone */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleInputChange}
                      className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${formErrors.phone ? 'border-destructive' : 'border-border'}`}
                      placeholder="10-digit mobile number"
                    />
                    {formErrors.phone && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {formErrors.phone}</span>}
                  </div>
                </div>

                {/* Address Line 1 */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="addressLine1" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address Line 1</label>
                  <input
                    type="text"
                    id="addressLine1"
                    name="addressLine1"
                    value={form.addressLine1}
                    onChange={handleInputChange}
                    className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${formErrors.addressLine1 ? 'border-destructive' : 'border-border'}`}
                    placeholder="Flat, House no., Building, Company, Apartment"
                  />
                  {formErrors.addressLine1 && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {formErrors.addressLine1}</span>}
                </div>

                {/* Address Line 2 */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="addressLine2" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={form.addressLine2}
                    onChange={handleInputChange}
                    className="h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none"
                    placeholder="Area, Colony, Street, Sector, Village"
                  />
                </div>

                {/* Landmark */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="landmark" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Landmark (Optional)</label>
                  <input
                    type="text"
                    id="landmark"
                    name="landmark"
                    value={form.landmark}
                    onChange={handleInputChange}
                    className="h-12 border border-border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none"
                    placeholder="e.g. Near Shiv Temple"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* City */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleInputChange}
                      className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${formErrors.city ? 'border-destructive' : 'border-border'}`}
                      placeholder="Dehradun"
                    />
                    {formErrors.city && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {formErrors.city}</span>}
                  </div>

                  {/* State */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="state" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={form.state}
                      onChange={handleInputChange}
                      className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${formErrors.state ? 'border-destructive' : 'border-border'}`}
                      placeholder="Uttarakhand"
                    />
                    {formErrors.state && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {formErrors.state}</span>}
                  </div>

                  {/* Pincode */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="pincode" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN Code</label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      value={form.pincode}
                      onChange={handleInputChange}
                      className={`h-12 border bg-background px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all rounded-none ${formErrors.pincode ? 'border-destructive' : 'border-border'}`}
                      placeholder="248001"
                    />
                    {formErrors.pincode && <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {formErrors.pincode}</span>}
                  </div>
                </div>

                {/* Default checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={form.isDefault}
                    onChange={handleCheckboxChange}
                    className="h-4.5 w-4.5 accent-primary border-border focus:ring-primary"
                  />
                  <label htmlFor="isDefault" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none">Set as default shipping address</label>
                </div>

                <div className="flex gap-4 border-t border-border/40 pt-6">
                  <Button 
                    type="submit"
                    disabled={actionLoading}
                    className="px-8 h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-none uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-primary/10"
                  >
                    {actionLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : "Save Address"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingAddress(null);
                    }}
                    className="px-8 h-12 border-border text-muted-foreground hover:bg-black/5 rounded-none uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* ADDRESS LIST VIEW */
            <motion.div
              key="address-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {addresses.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/85 p-8 glass rounded-none">
                  <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-heading text-xl font-bold text-foreground mb-2">Your Address Book is Empty</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">Save your delivery addresses here to enjoy a fast and seamless luxury checkout experience.</p>
                  <Button 
                    onClick={openAddForm}
                    className="bg-primary text-primary-foreground rounded-none px-6 h-12 text-xs font-bold tracking-widest uppercase shadow-md"
                  >
                    Add Your First Address
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {addresses.map((addr) => (
                    <motion.div
                      layout
                      key={addr.id}
                      className="glass rounded-none p-6 border border-border/60 hover:border-primary/30 transition-all duration-500 flex flex-col justify-between text-left h-full group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="flex flex-col gap-1">
                            <h3 className="font-bold text-base text-foreground leading-none">{addr.fullName || addr.customerName}</h3>
                          </div>
                          {addr.isDefault && (
                            <span className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-bold px-2 py-0.5 uppercase tracking-wider leading-none">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground/90 space-y-0.5 leading-relaxed font-light mb-6">
                          <p>{addr.addressLine1}</p>
                          {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                          {addr.landmark && <p className="text-primary/70 font-normal">Landmark: {addr.landmark}</p>}
                          <p>{addr.city}, {addr.state} - <span className="font-semibold">{addr.pincode}</span></p>
                          <p className="flex items-center gap-1.5 mt-3 font-semibold text-foreground/80"><Phone className="w-3.5 h-3.5 text-primary" /> {addr.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t border-border/40 pt-4 mt-auto">
                        <button
                          onClick={() => openEditForm(addr)}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(addr.id)}
                          className="text-[10px] text-destructive hover:underline transition-colors font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                        {!addr.isDefault && (
                          <button
                            onClick={() => handleSetDefault(addr)}
                            className="text-[10px] text-primary hover:underline transition-colors font-bold uppercase tracking-wider ml-auto"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
