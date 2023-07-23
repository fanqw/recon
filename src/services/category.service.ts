
export class CategoryService {
  path: string;

  constructor() {
    this.path = '/api/categories';
  }

  getCategoryList = async () => {
    const res = await fetch(this.path)
    return res.json();
  }

  getCategory = async (id: string) => {
    const res = await fetch(`${this.path}/${id}`)
    return res.json();
  }

  createCategory = async (params: any) => {
    debugger
    const res = await fetch(this.path, { method: 'POST', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    
    return res.json();
  }
  
  editCategory = async (id: string, params: any) => {
    const res = await fetch(`${this.path}/${id}`, { method: 'PUT', headers: {
      'content-type': 'application/json'
    }, body: JSON.stringify(params) })
    return res.json();
  }
  
  removeCategory = async (id: string) => {
    const res = await fetch(`${this.path}/remove/${id}`, { method: 'DELETE' })
    return res.json();
  }
}

const categoryService = new CategoryService();

export default categoryService;