// Next's built-in image declarations are lowercase-only; webpack's loader matches case-insensitively.
declare module "*.PNG" {
  const content: import("next/image").StaticImageData;
  export default content;
}
