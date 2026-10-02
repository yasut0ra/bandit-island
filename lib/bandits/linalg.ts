/** Tiny dense linear algebra for LinUCB (feature dimension is 1–3). */

export type Matrix = number[][];

export function identity(d: number, scale = 1): Matrix {
  return Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? scale : 0)));
}

export function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

export function matVec(m: Matrix, v: readonly number[]): number[] {
  return m.map((row) => dot(row, v));
}

/** Inverse by Gauss–Jordan elimination with partial pivoting (A must be invertible). */
export function invert(a: Matrix): Matrix {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...identity(n)[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const p = m[col][col];
    for (let c = 0; c < 2 * n; c++) m[col][c] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      if (f === 0) continue;
      for (let c = 0; c < 2 * n; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map((row) => row.slice(n));
}
