export interface MandalaHouseLike {
  house: number;
  degree: number;
}

export interface MandalaPointLike {
  name: string;
  degree: number;
}

export interface MandalaPoint {
  x: number;
  y: number;
}

export interface MandalaOrientation {
  ascDegree: number;
  rotationOffset: number;
  rotateDegree: (degree: number) => number;
  toSvgRadians: (degree: number) => number;
  toArcRadians: (degree: number) => number;
  pointAt: (centerX: number, centerY: number, radius: number, degree: number) => MandalaPoint;
}

export const normalizeDegree = (degree: number) => ((degree % 360) + 360) % 360;

export const getSignIndex = (degree: number) => Math.floor(normalizeDegree(degree) / 30);

export function resolveAscDegree(
  houses: MandalaHouseLike[],
  points: MandalaPointLike[],
): number {
  const ascHouse = houses.find((house) => house.house === 1);
  if (ascHouse) return normalizeDegree(ascHouse.degree);

  const ascPoint = points.find((point) => point.name.toUpperCase().startsWith('ASC'));
  return ascPoint ? normalizeDegree(ascPoint.degree) : 0;
}

export function createMandalaOrientation(ascDegree: number): MandalaOrientation {
  const normalizedAscDegree = normalizeDegree(ascDegree);
  const rotationOffset = (360 - normalizedAscDegree) % 360;
  const rotateDegree = (degree: number) => normalizeDegree(degree + rotationOffset);
  const toSvgRadians = (degree: number) => ((180 - rotateDegree(degree)) * Math.PI) / 180;
  const toArcRadians = (degree: number) => ((180 - rotateDegree(degree) - 90) * Math.PI) / 180;

  return {
    ascDegree: normalizedAscDegree,
    rotationOffset,
    rotateDegree,
    toSvgRadians,
    toArcRadians,
    pointAt: (centerX, centerY, radius, degree) => {
      const radians = toSvgRadians(degree);
      return {
        x: centerX + radius * Math.cos(radians),
        y: centerY + radius * Math.sin(radians),
      };
    },
  };
}

export const getHouseMidpointDegree = (degree: number, nextDegree: number) => {
  let difference = normalizeDegree(nextDegree - degree);
  if (difference > 180) difference -= 360;
  return normalizeDegree(degree + difference / 2);
};
