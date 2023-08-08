export interface Params {
  current: number;
  pageSize: number;
}

export class OrderService {
  path: string;

  constructor() {
    this.path = '/api/orders';
  }

  getOrderList = async (params: Params) => {
    const res = await fetch(`${this.path}/list`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(params) 
    })
    return res.json();
  }

  getOrder = async (id: string) => {
    const res = await fetch(`${this.path}/${id}`)
    return res.json();
  }

  createOrder = async (params: any) => {
    const res = await fetch(this.path, { method: 'POST', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    
    return res.json();
  }
  
  editOrder = async (id: string, params: any) => {
    const res = await fetch(`${this.path}/${id}`, { method: 'PUT', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    return res.json();
  }
  
  removeOrder = async (id: string) => {
    const res = await fetch(`${this.path}/remove/${id}`, { method: 'DELETE' })
    return res.json();
  }
}

const orderService = new OrderService();

export default orderService;