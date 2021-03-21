import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { ProductCart, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

export interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: ProductCart[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const keyCartOnLocalStorage: string = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [updateLocalStorage, setUpdateLocalStorage] = useState(false);

  const [cart, setCart] = useState<ProductCart[]>(() => {
    const storedCart = localStorage.getItem(keyCartOnLocalStorage);

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  useEffect(() => {
    if (updateLocalStorage === true) {
      localStorage.setItem(keyCartOnLocalStorage, JSON.stringify(cart));
      setUpdateLocalStorage(false);
    }
  }, [updateLocalStorage, cart]);

  const addProduct = async (productId: number) => {
    try {
      let cartCopy = Object.assign([] as ProductCart[], cart);
      let productCart = cartCopy.find((c) => c.id === productId);

      if (productCart === undefined) {
        const product = await api
          .get(`/products/${productId}`)
          .then((response) => response.data);

        if (product) {
          productCart = { ...product, amount: 1 } as ProductCart;

          cartCopy = [...cart, productCart];
        } else {
          throw new Error('Product not found on Product List');
        }
      } else {
        for (const item of cartCopy) {
          if (item.id === productCart?.id) {
            const amountWanted = item.amount + 1;

            const hasOnStock = await hasAmountWantedOnStock(
              item.id,
              amountWanted
            );

            if (hasOnStock === true) {
              item.amount += 1;
            } else {
              toast.error('Quantidade solicitada fora de estoque');
            }
          }
        }
      }

      setCart(cartCopy);
      setUpdateLocalStorage(true);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let product = cart?.find((c) => c.id === productId);

      if (product !== undefined) {
        let cartFiltered = cart?.filter((c) => c.id !== productId);

        setCart(cartFiltered);
        setUpdateLocalStorage(true);
      } else {
        throw new Error('Product not found on Product List');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) return;

    try {
      if (!cart.some((c) => c.id === productId)) {
        throw new Error('Product not found on Cart');
      }

      const hasOnStock = await hasAmountWantedOnStock(productId, amount);

      if (hasOnStock === true) {
        setCart(
          cart.map((c) => {
            if (c.id === productId) c.amount = amount;
            return c;
          })
        );
        setUpdateLocalStorage(true);
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const hasAmountWantedOnStock = async (
    productId: number,
    amountWanted: number
  ): Promise<boolean> => {
    const productOnStock = (await api
      .get(`/stock/${productId}`)
      .then((response) => response.data)) as Stock;

    return productOnStock.amount >= amountWanted;
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
