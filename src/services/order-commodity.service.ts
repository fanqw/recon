
export class OrderCommodityService {
  path: string;

  constructor() {
    this.path = '/api/order_commodities';
  }

  getOrderCommodityList = async (orderId: string) => {
    const res = await fetch(`${this.path}/${orderId}`)
    return res.json();
  }

  getOrderCommodity = async (id: string) => {
    const res = await fetch(`${this.path}/${id}`)
    return res.json();
  }

  createOrderCommodity = async (params: any) => {
    const res = await fetch(this.path, { method: 'POST', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    
    return res.json();
  }
  
  editOrderCommodity = async (id: string, params: any) => {
    const res = await fetch(`${this.path}/${id}`, { method: 'PUT', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    return res.json();
  }
  
  removeOrderCommodity = async (id: string) => {
    const res = await fetch(`${this.path}/remove/${id}`, { method: 'DELETE' })
    return res.json();
  }
}

const orderCommodityService = new OrderCommodityService();

export default orderCommodityService;