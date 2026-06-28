export function useWishlist() {
  return {
    wishlist: [],
    isLoading: false,
    error: null,
    addToWishlist: () => {},
    removeFromWishlist: () => {},
    isAdding: false,
    isRemoving: false,
  };
}
