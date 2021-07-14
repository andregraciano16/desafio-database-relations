import Customer from '@modules/customers/infra/typeorm/entities/Customer';

interface IProduct {
  product_id: string;
  quantity: number;
  price: number;
}

export default interface ICreateOrderDTO {
  customer: Customer;
  products: IProduct[];
}
