import "react";

/**
 * Native WebMCP declarative attributes. Browsers without WebMCP simply ignore
 * unknown attributes, so these are safe progressive enhancement.
 */
declare module "react" {
  interface HTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolparamdescription?: string;
  }
}
