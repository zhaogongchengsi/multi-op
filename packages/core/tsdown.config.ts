import { defineConfig } from 'tsdown'

export default defineConfig({
  deps: {
    // electron 是运行时环境提供，不参与 bundle 也不做类型解析
    neverBundle: ['electron'],
  },
})
