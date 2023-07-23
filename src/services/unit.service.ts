
export class UnitService {
  path: string;

  constructor() {
    this.path = '/api/units';
  }

  getUnitList = async () => {
    const res = await fetch(this.path)
    return res.json();
  }

  getUnit = async (id: string) => {
    const res = await fetch(`${this.path}/${id}`)
    return res.json();
  }

  createUnit = async (params: any) => {
    debugger
    const res = await fetch(this.path, { method: 'POST', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    
    return res.json();
  }
  
  editUnit = async (id: string, params: any) => {
    const res = await fetch(`${this.path}/${id}`, { method: 'PUT', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    return res.json();
  }
  
  removeUnit = async (id: string) => {
    const res = await fetch(`${this.path}/remove/${id}`, { method: 'DELETE' })
    return res.json();
  }
}

const unitService = new UnitService();

export default unitService;