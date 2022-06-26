import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productsAlreadyExistInCart = cart.find(
        (product) => product.id === productId
      );

      const stock = await api.get<Stock>(`/stock/${productId}`);

      if (!productsAlreadyExistInCart) {
        if (!validarEstoque(1, stock.data.amount)) return;
        const product = await api.get<Product>(`/products/${productId}`);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...product.data, amount: 1 }])
        );
        setCart([...cart, { ...product.data, amount: 1 }]);
        return;
      }

      if (productsAlreadyExistInCart) {
        if (
          !validarEstoque(
            productsAlreadyExistInCart.amount + 1,
            stock.data.amount
          )
        )
          return;

        const cartProducts = cart.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount: product.amount + 1,
            };
          }

          return {
            ...product,
          };
        });

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartProducts));

        setCart(cartProducts);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const validarEstoque = (amountAdd: number, amountCart: number): boolean => {
    if (amountAdd > amountCart) {
      toast.error("Quantidade solicitada fora de estoque");
      return false;
    }

    return true;
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex < 0) throw Error();

      const newCartProducts = cart.filter(
        (productCart) => productCart.id !== productId
      );

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(newCartProducts)
      );
      setCart(newCartProducts);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const productIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex < 0) throw Error();

      const stock = await api.get<Stock>(`/stock/${productId}`);
      if (!validarEstoque(amount, stock.data.amount)) return;
      const newCartProducts = cart.map((product) => {
        return {
          ...product,
          amount: product.id === productId ? amount : product.amount,
        };
      });

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(newCartProducts)
      );
      setCart(newCartProducts);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
