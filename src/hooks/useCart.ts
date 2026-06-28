// src/hooks/useCart.ts
"use client";

import { useState, useEffect } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stock?: number;
};

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  const loadCart = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("pahadi-vibes-cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCart((current) => {
          if (JSON.stringify(current) === saved) {
            return current;
          }
          return parsed;
        });
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    } else {
      setCart((current) => (current.length === 0 ? current : []));
    }
  };

  useEffect(() => {
    loadCart();
    setIsLoaded(true);

    const handleSync = () => {
      loadCart();
    };

    window.addEventListener("cart-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("cart-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Save to local storage whenever cart changes
  useEffect(() => {
    if (isLoaded) {
      const saved = localStorage.getItem("pahadi-vibes-cart");
      const stringifiedCart = JSON.stringify(cart);
      if (saved !== stringifiedCart) {
        localStorage.setItem("pahadi-vibes-cart", stringifiedCart);
        window.dispatchEvent(new Event("cart-updated"));
      }
    }
  }, [cart, isLoaded]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        const stockLimit = item.stock ?? existing.stock ?? 9999;
        return prev.map((p) => 
          p.id === item.id ? { ...p, quantity: Math.min(stockLimit, p.quantity + item.quantity) } : p
        );
      }
      const stockLimit = item.stock ?? 9999;
      return [...prev, { ...item, quantity: Math.min(stockLimit, item.quantity) }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) => 
      prev.map((item) => 
        item.id === id ? { ...item, quantity: Math.min(item.stock ?? 9999, quantity) } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return {
    cart,
    setCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    cartTotal,
    isLoaded
  };
}
