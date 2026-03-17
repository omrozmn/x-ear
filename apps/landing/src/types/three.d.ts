declare module "three" {
  export class Object3D {
    children: Object3D[];
    rotation: {
      x: number;
      y: number;
    };
  }

  export class Group extends Object3D {}

  export class BufferAttribute {
    constructor(array: Float32Array, itemSize: number);
    array: Float32Array;
    needsUpdate: boolean;
  }

  export class BufferGeometry {
    attributes: {
      position: BufferAttribute;
    };
    setAttribute(name: string, attribute: BufferAttribute): void;
  }

  export class Color {
    constructor(color: string);
    clone(): Color;
    lerp(color: Color, alpha: number): Color;
  }

  export class LineBasicMaterial {
    constructor(options: {
      color: Color;
      transparent?: boolean;
      opacity?: number;
      linewidth?: number;
    });
  }

  export class Line extends Object3D {
    constructor(geometry: BufferGeometry, material: LineBasicMaterial);
    geometry: BufferGeometry;
  }

  export class Points extends Object3D {
    geometry: BufferGeometry;
  }

  export const AdditiveBlending: number;

  export const MathUtils: {
    lerp(start: number, end: number, alpha: number): number;
  };
}
