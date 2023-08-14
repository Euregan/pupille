import typescript from '@rollup/plugin-typescript'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import shebang from 'rollup-plugin-shebang-bin'

export default {
  input: 'src/index.ts',
  output: {
    file: './dist/pupille.js',
    format: 'es',
  },
  external: [/node_modules/],
  plugins: [
    typescript({ tsconfig: './tsconfig.json' }),
    nodeResolve(),
    shebang({
      include: ['**/*.ts'],
    }),
  ],
}
