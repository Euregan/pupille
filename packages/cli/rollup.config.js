import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default {
  input: 'src/index.ts',
  output: {
    file: './dist/pupille.js',
    format: 'cjs',
  },
  external: [/node_modules/],
  plugins: [typescript({ tsconfig: './tsconfig.json' }), nodeResolve()],
}
