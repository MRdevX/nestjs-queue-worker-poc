import { faker } from '@faker-js/faker';
import { TaskType } from '@root/app/task/types/task-type.enum';

export interface IOrderMockData {
  id?: string;
  customerId?: string;
  status?: 'delivered' | 'pending' | 'shipped' | 'cancelled';
  invoiced?: boolean;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    description?: string;
    sku?: string;
  }>;
  totalAmount?: number;
  deliveryDate?: string | null;
}

export interface IInvoiceMockData {
  id?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerAddress?: string;
  orders?: string[];
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    description?: string;
    sku?: string;
  }>;
  totalAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
  status?: string;
  createdAt?: string;
  dueDate?: string;
}

export class OrderMockFactory {
  static create(data: IOrderMockData = {}): any {
    const items = data.items || [
      {
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        price: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
        quantity: faker.number.int({ min: 1, max: 10 }),
        description: faker.commerce.productDescription(),
        sku: faker.string.alphanumeric(8).toUpperCase(),
      },
    ];

    const totalAmount =
      data.totalAmount ||
      items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      id: data.id || faker.string.uuid(),
      customerId: data.customerId || faker.string.uuid(),
      status: data.status || 'delivered',
      invoiced: data.invoiced ?? false,
      items,
      totalAmount,
      deliveryDate:
        data.deliveryDate ?? faker.date.recent().toISOString().split('T')[0],
    };
  }

  static createDelivered(data: IOrderMockData = {}): any {
    return this.create({ ...data, status: 'delivered', invoiced: false });
  }

  static createPending(data: IOrderMockData = {}): any {
    return this.create({ ...data, status: 'pending', invoiced: false });
  }

  static createAlreadyInvoiced(data: IOrderMockData = {}): any {
    return this.create({ ...data, status: 'delivered', invoiced: true });
  }

  static createArray(count: number = 3, data: IOrderMockData = {}): any[] {
    return Array.from({ length: count }, () => this.create(data));
  }

  static createDeliveredArray(
    count: number = 3,
    data: IOrderMockData = {},
  ): any[] {
    return Array.from({ length: count }, () => this.createDelivered(data));
  }

  static createMixedStatusArray(data: IOrderMockData = {}): any[] {
    return [
      this.createDelivered(data),
      this.createAlreadyInvoiced(data),
      this.createPending(data),
      this.createDelivered(data),
    ];
  }
}

export class InvoiceMockFactory {
  static create(data: IInvoiceMockData = {}): any {
    const items = data.items || [
      {
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        price: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
        quantity: faker.number.int({ min: 1, max: 10 }),
        description: faker.commerce.productDescription(),
        sku: faker.string.alphanumeric(8).toUpperCase(),
      },
    ];

    const totalAmount =
      data.totalAmount ||
      items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = data.taxAmount || totalAmount * 0.1;
    const grandTotal = data.grandTotal || totalAmount + taxAmount;

    return {
      id: data.id || faker.string.uuid(),
      invoiceNumber:
        data.invoiceNumber ||
        `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
      customerId: data.customerId || faker.string.uuid(),
      customerEmail: data.customerEmail || faker.internet.email(),
      customerName: data.customerName || faker.person.fullName(),
      customerAddress: data.customerAddress || faker.location.streetAddress(),
      orders: data.orders || [faker.string.uuid()],
      items,
      totalAmount,
      taxAmount,
      grandTotal,
      status: data.status || 'created',
      createdAt: data.createdAt || new Date().toISOString(),
      dueDate:
        data.dueDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  static createFromOrders(orders: any[], data: IInvoiceMockData = {}): any {
    const totalAmount = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    const items = orders.flatMap((order) => order.items);
    const orderIds = orders.map((order) => order.id);

    return this.create({
      ...data,
      customerId: orders[0]?.customerId,
      orders: orderIds,
      items,
      totalAmount,
    });
  }

  static createArray(count: number = 3, data: IInvoiceMockData = {}): any[] {
    return Array.from({ length: count }, () => this.create(data));
  }
}

export class InvoiceWorkflowMockFactory {
  static createWorkflowPayload(customerId: string, orders: any[] = []) {
    return {
      customerId,
      orders,
      dateFrom: faker.date.past().toISOString().split('T')[0],
      dateTo: faker.date.recent().toISOString().split('T')[0],
    };
  }

  static createScheduledWorkflowPayload(
    customerId: string,
    scheduledAt: string,
  ) {
    return {
      customerId,
      scheduledAt,
      dateFrom: faker.date.past().toISOString().split('T')[0],
      dateTo: faker.date.recent().toISOString().split('T')[0],
    };
  }

  static createRecurringWorkflowPayload(
    customerId: string,
    cronExpression: string = '0 0 * * *',
  ) {
    return {
      customerId,
      cronExpression,
      dateFrom: faker.date.past().toISOString().split('T')[0],
      dateTo: faker.date.recent().toISOString().split('T')[0],
    };
  }

  static createEmailWorkflowPayload(
    customerId: string,
    invoiceId: string,
    scheduledAt: string,
  ) {
    return {
      customerId,
      invoiceId,
      scheduledAt,
    };
  }

  static createTaskPayload(taskType: TaskType, data: any = {}) {
    const basePayload = {
      customerId: faker.string.uuid(),
      ...data,
    };

    switch (taskType) {
      case TaskType.FETCH_ORDERS:
        return {
          ...basePayload,
          dateFrom: faker.date.past().toISOString().split('T')[0],
          dateTo: faker.date.recent().toISOString().split('T')[0],
        };
      case TaskType.CREATE_INVOICE:
        return {
          ...basePayload,
          orders: OrderMockFactory.createDeliveredArray(2),
        };
      case TaskType.GENERATE_PDF:
        return {
          ...basePayload,
          invoice: InvoiceMockFactory.create(),
          pdfProcessorUrl: faker.internet.url(),
        };
      case TaskType.SEND_EMAIL:
        return {
          ...basePayload,
          invoice: InvoiceMockFactory.create(),
          pdfUrl: faker.internet.url(),
          emailServiceUrl: faker.internet.url(),
        };
      default:
        return basePayload;
    }
  }
}
