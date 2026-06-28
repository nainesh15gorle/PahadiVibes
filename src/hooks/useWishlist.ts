// src/hooks/useWishlist.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export function useWishlist() {
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const fetchWishlist = async () => {
    if (!isSignedIn) return [];
    const res = await fetch("/api/wishlist");
    if (!res.ok) throw new Error("Failed to fetch wishlist");
    const data = await res.json();
    return data.data;
  };

  const { data: wishlist = [], isLoading, error } = useQuery({
    queryKey: ["wishlist"],
    queryFn: fetchWishlist,
    enabled: isLoaded && isSignedIn,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Failed to add to wishlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove from wishlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  return {
    wishlist,
    isLoading,
    error,
    addToWishlist: (productId: string) => addToWishlistMutation.mutate(productId),
    removeFromWishlist: (productId: string) => removeFromWishlistMutation.mutate(productId),
    isAdding: addToWishlistMutation.isPending,
    isRemoving: removeFromWishlistMutation.isPending,
  };
}
