// src/contexts/CartContext.tsx
import { createContext, useContext, useState } from "react";
import type { CartItem } from "@shared/schema";

export interface ResumedHeldSale {
  _id: string;
  receiptNo?: string | number;
  customerId?: any;
  saleType?: string;
  orderId?: string | null;
  clientRef?: string;
  createdAt?: string;
  extraCharges?: Array<{ name?: string; amount?: number }>;
  extraChargesTotal?: number;
  salesnote?: string;
  [key: string]: any;
}

interface CartContextType {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  clearCart: () => void;
  orderId: string | null;
  setOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  resumedHeldSale: ResumedHeldSale | null;
  setResumedHeldSale: React.Dispatch<React.SetStateAction<ResumedHeldSale | null>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [resumedHeldSale, setResumedHeldSale] = useState<ResumedHeldSale | null>(null);
  const clearCart = () => {
    setCartItems([]);
    setOrderId(null);
    setResumedHeldSale(null);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        clearCart,
        orderId,
        setOrderId,
        resumedHeldSale,
        setResumedHeldSale,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
};
