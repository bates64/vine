import Memory from './vm/Memory'

export default interface Cartridge {
  name: string,
  sourceCode: string,
  tileset: string,
}
