export interface Product {
  id: number;
  title: string;
  price: number;
  image: string;
}

export interface ProductCart extends Product {
  amount: number;
}

export interface ProductFormatted extends ProductCart {
  priceFormatted: string;
}

export interface Stock {
  id: number;
  amount: number;
}
