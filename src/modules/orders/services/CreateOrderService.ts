import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
  price: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customerExists = await this.customersRepository.findById(customer_id);

    if (customerExists === undefined) {
      throw new AppError('Could not find any customer with the given id');
    }

    const productsExists = await this.productsRepository.findAllById(products);

    if (!productsExists.length) {
      throw new AppError('Could not find any products with the given ids');
    }

    const existentProductsIds = productsExists.map(product => product.id);

    const checkInexistentIds = products.filter(
      product => !existentProductsIds.includes(product.id),
    );

    if (checkInexistentIds.length) {
      throw new AppError(`Clound not find product ${checkInexistentIds[0].id}`);
    }

    const findProductsWithNoQuantityAvaliable = products.filter(
      product =>
        productsExists.filter(p => p.id === product.id)[0].quantity <
        product.quantity,
    );

    if (findProductsWithNoQuantityAvaliable.length) {
      throw new AppError(
        `The quantity ${findProductsWithNoQuantityAvaliable[0].quantity} is not avaliable for ${findProductsWithNoQuantityAvaliable}`,
      );
    }

    const serializedProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: productsExists.filter(p => p.id === product.id)[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer: customerExists,
      products: serializedProducts,
    });

    const { order_products } = order;

    const orderedProductQuantity = order_products.map(product => ({
      id: product.product_id,
      quantity:
        productsExists.filter(p => p.id === product.product_id)[0].quantity -
        product.quantity,
    }));

    await this.productsRepository.updateQuantity(orderedProductQuantity);

    return order;
  }
}

export default CreateOrderService;
