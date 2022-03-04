// 用于编译第一代脚本
export class Page {
  url: string
  constructor() {
    this.url = 'baidu'
  }
  async create(url:string) {
    console.log('create')
  }

  async change(index:number) {
    console.log('change')
  }
}

export class Dom {
  async click(sign:string) {
    console.log('create click')
  }

  async set(value:string, sign:string) {
    console.log('create set')
  }

  async fill(sign:string, value:string) {
    console.log('create fill')
  }
}
