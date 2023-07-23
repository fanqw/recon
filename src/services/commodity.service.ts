
export class CommodityService {
  path: string;

  constructor() {
    this.path = '/api/commodities';
  }

  getCommodityList = async () => {
    const res = await fetch(this.path)
    return res.json();
  }

  getCommodity = async (id: string) => {
    const res = await fetch(`${this.path}/${id}`)
    return res.json();
  }

  createCommodity = async (params: any) => {
    debugger
    const res = await fetch(this.path, { method: 'POST', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    
    return res.json();
  }
  
  editCommodity = async (id: string, params: any) => {
    const res = await fetch(`${this.path}/${id}`, { method: 'PUT', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    return res.json();
  }
  
  removeCommodity = async (id: string) => {
    const res = await fetch(`${this.path}/remove/${id}`, { method: 'DELETE' })
    return res.json();
  }
}

const commodityService = new CommodityService();

export default commodityService;