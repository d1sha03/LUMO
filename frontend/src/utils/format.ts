export const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const formatCompactINR = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
};

export const formatNumber = (value: number, decimals = 0) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

/** India-shaped dot mask — coarse grid, `#` = a life touched by LUMO. */
export const INDIA_MASK: string[] = [
  "..........#########.........",
  "........############........",
  "......##############.......",
  ".....################......",
  "....##################.....",
  "...####################....",
  "...####################....",
  "..######################...",
  "..######################...",
  "..######################...",
  "..#####################....",
  "..######################...",
  "...#####################...",
  "...#####################...",
  "....###################....",
  "....###################....",
  ".....##################....",
  "......################.....",
  ".......###############.....",
  "........#############......",
  ".........###########.......",
  "..........#########........",
  "...........#######.........",
  "...........#####...........",
  "...........######..........",
  "............#####..........",
  "............####...........",
  ".............###...........",
  "..............##...........",
  "..............#............",
];

export const maskToPoints = (mask: string[], step = 1) => {
  const pts: { x: number; y: number }[] = [];
  mask.forEach((row, y) => {
    row.split("").forEach((cell, x) => {
      if (cell === "#") pts.push({ x: x * step, y: y * step });
    });
  });
  return pts;
};
