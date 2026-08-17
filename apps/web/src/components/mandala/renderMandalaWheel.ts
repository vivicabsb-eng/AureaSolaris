import * as d3 from 'd3';
import {
  FERAL_RULE,
  PLANET_NAMES_PT,
  RETROGRADE_ALLOWED,
  getDecanateRuler,
  getDignityState,
  getFixedStar,
  getMansion,
  getMotionStatus,
  getProximityToSun,
  getTermRuler,
  getVisibilityState,
  isFeral,
} from '../../utils/astro-dignity';
import { ASPECT_MEANINGS, getAspectKeyword } from '../../utils/astro-dictionary';
import {
  DECANATE_RULERS_PT,
  EGYPTIAN_TERMS_PT,
  ELEMENT_COLORS,
  ELEMENTS as SIGN_ELEMENTS,
  PLANET_SYMBOLS,
  SIGN_SYMBOLS,
} from '../../utils/astro-reference-data';
import {
  getHouseMidpointDegree,
  getSignIndex,
  normalizeDegree,
} from '../../utils/mandala-geometry';
import { ASPECT_COLORS, ASPECT_OPACITY, PLANET_COLORS, SIGN_NAMES } from './constants';
import { formatMandalaDegree } from './model';
import type {
  Aspect,
  AspectTooltipModel,
  House,
  MandalaLayout,
  MandalaPlanetPosition,
  Planet,
  PlanetTooltipModel,
} from './types';

interface MandalaOrientation {
  rotationOffset: number;
  pointAt: (cx: number, cy: number, radius: number, degree: number) => { x: number; y: number };
  toArcRadians: (degree: number) => number;
  rotateDegree: (degree: number) => number;
}

export interface RenderMandalaWheelOptions {
  svgElement: SVGSVGElement;
  layout: MandalaLayout;
  orientation: MandalaOrientation;
  ascDegree: number;
  planets: Planet[];
  filteredPlanets: Planet[];
  houses: House[];
  aspects: Aspect[];
  transitPlanets?: Planet[];
  transitAspects?: Aspect[];
  planetsMap: Record<string, MandalaPlanetPosition>;
  showDecanates: boolean;
  showTerms: boolean;
  calculationCertified: boolean;
  onPlanetTooltip: (tooltip: PlanetTooltipModel | null) => void;
  onAspectTooltip: (tooltip: AspectTooltipModel | null) => void;
}

/** Render the immutable SVG layers for one Mandala frame.
 *
 * React owns state and overlays; this module owns D3 layer construction,
 * geometry-to-SVG translation, hit areas and tooltip event payloads.
 */
export function renderMandalaWheel({
  svgElement,
  layout,
  orientation,
  ascDegree,
  planets,
  filteredPlanets,
  houses,
  aspects,
  transitPlanets,
  transitAspects,
  planetsMap,
  showDecanates,
  showTerms,
  calculationCertified,
  onPlanetTooltip,
  onAspectTooltip,
}: RenderMandalaWheelOptions): void {
  const {
    cx,
    cy,
    radius,
    degreeRadius,
    signRadius,
    decanateRadius,
    termRadius,
    houseRadius,
    planetRadius,
    aspectRadius,
    transitRadius,
  } = layout;

  console.log('--- RENDERING D3 WIDGET ---');
  console.log('ascDeg:', ascDegree);
  console.log('rotOffset:', orientation.rotationOffset);

  const svg = d3.select(svgElement);
  svg.selectAll('*').remove();
  const g = svg.append('g');

  const polarX = (r: number, deg: number) => orientation.pointAt(cx, cy, r, deg).x;
  const polarY = (r: number, deg: number) => orientation.pointAt(cx, cy, r, deg).y;
  const arcRad = orientation.toArcRadians;

  // Background -------------------------------------------------------------
  g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', radius + 12)
    .attr('fill', '#FDFAF3').attr('stroke', '#c5a059').attr('stroke-width', 1).attr('opacity', 0.95);
  g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', radius + 2)
    .attr('fill', 'none').attr('stroke', '#c5a059').attr('stroke-width', 2).attr('opacity', 0.6);
  g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', aspectRadius)
    .attr('fill', 'none').attr('stroke', '#c5a059').attr('stroke-width', 0.5).attr('opacity', 0.15);

  // Degree ring ------------------------------------------------------------
  for (let i = 0; i < 360; i++) {
    const isSignBoundary = i % 30 === 0;
    const isTen = i % 10 === 0;
    const isFive = i % 5 === 0;
    if (!isSignBoundary && !isTen && !isFive) continue;
    const length = isSignBoundary ? 14 : isTen ? 8 : 4;
    const strokeWidth = isSignBoundary ? 1.8 : isTen ? 0.8 : 0.4;
    const opacity = isSignBoundary ? 0.7 : isTen ? 0.4 : 0.2;
    g.append('line')
      .attr('x1', polarX(degreeRadius, i)).attr('y1', polarY(degreeRadius, i))
      .attr('x2', polarX(degreeRadius - length, i)).attr('y2', polarY(degreeRadius - length, i))
      .attr('stroke', '#c5a059').attr('stroke-width', strokeWidth).attr('opacity', opacity);
  }

  for (let i = 0; i < 360; i += 10) {
    if (i % 30 === 0) continue;
    const signDegree = i % 30;
    const px = polarX(degreeRadius + 6, i);
    const py = polarY(degreeRadius + 6, i);
    g.append('text')
      .attr('x', px).attr('y', py)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 6).attr('fill', '#b09860').attr('opacity', 0.7)
      .attr('transform', `rotate(${180 - orientation.rotateDegree(i)}, ${px}, ${py})`)
      .text(`${signDegree}`);
  }

  // Zodiac ring ------------------------------------------------------------
  for (let i = 0; i < 12; i++) {
    const startDegree = i * 30;
    const midDegree = startDegree + 15;
    const element = SIGN_ELEMENTS[i];
    const elementColor = ELEMENT_COLORS[element];
    const arcPath = d3.arc()({
      innerRadius: signRadius,
      outerRadius: degreeRadius,
      startAngle: arcRad(startDegree),
      endAngle: arcRad(startDegree + 30),
    })!;
    g.append('path').attr('d', arcPath)
      .attr('transform', `translate(${cx},${cy})`)
      .attr('fill', elementColor).attr('opacity', 0.08);
    g.append('line')
      .attr('x1', polarX(degreeRadius, startDegree)).attr('y1', polarY(degreeRadius, startDegree))
      .attr('x2', polarX(houseRadius, startDegree)).attr('y2', polarY(houseRadius, startDegree))
      .attr('stroke', '#c5a059').attr('stroke-width', 0.6).attr('opacity', 0.4);
    g.append('text')
      .attr('x', polarX((signRadius + degreeRadius) / 2, midDegree))
      .attr('y', polarY((signRadius + degreeRadius) / 2, midDegree))
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-family', '"Segoe UI Symbol", Arial, sans-serif')
      .attr('font-size', 20).attr('fill', elementColor).attr('opacity', 0.85).attr('font-weight', 'normal')
      .text(SIGN_SYMBOLS[i] + '\uFE0E');
  }

  // Decanates --------------------------------------------------------------
  if (showDecanates) {
    for (let i = 0; i < 36; i++) {
      const signIndex = Math.floor(i / 3);
      const decanIndex = i % 3;
      const startDegree = i * 10;
      const midDegree = startDegree + 5;
      const colors = ['#E8D5B7', '#D4C4A0', '#C0B389'];
      const decanatePath = d3.arc()({
        innerRadius: termRadius,
        outerRadius: decanateRadius,
        startAngle: arcRad(startDegree),
        endAngle: arcRad(startDegree + 10),
      })!;
      g.append('path').attr('d', decanatePath)
        .attr('transform', `translate(${cx},${cy})`)
        .attr('fill', colors[decanIndex]).attr('opacity', 0.35);
      g.append('line')
        .attr('x1', polarX(decanateRadius, startDegree)).attr('y1', polarY(decanateRadius, startDegree))
        .attr('x2', polarX(termRadius, startDegree)).attr('y2', polarY(termRadius, startDegree))
        .attr('stroke', '#c5a059').attr('stroke-width', 0.3).attr('opacity', 0.2);
      const ruler = DECANATE_RULERS_PT[signIndex * 3 + decanIndex];
      g.append('text')
        .attr('x', polarX((decanateRadius + termRadius) / 2, midDegree))
        .attr('y', polarY((decanateRadius + termRadius) / 2, midDegree))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 5).attr('fill', '#8a7a5a').attr('opacity', 0.6)
        .text(ruler.substring(0, 3));
    }
  }

  // Egyptian terms ---------------------------------------------------------
  if (showTerms) {
    for (let signIndex = 0; signIndex < 12; signIndex++) {
      const signTerms = EGYPTIAN_TERMS_PT[signIndex];
      for (const term of signTerms) {
        const absoluteStart = signIndex * 30 + term.start;
        const absoluteEnd = signIndex * 30 + term.end;
        const absoluteMid = (absoluteStart + absoluteEnd) / 2;
        const termPath = d3.arc()({
          innerRadius: houseRadius,
          outerRadius: termRadius,
          startAngle: arcRad(absoluteStart),
          endAngle: arcRad(absoluteEnd),
        })!;
        g.append('path').attr('d', termPath)
          .attr('transform', `translate(${cx},${cy})`)
          .attr('fill', PLANET_COLORS[term.planet] || '#ccc').attr('opacity', 0.30);
        g.append('line')
          .attr('x1', polarX(termRadius, absoluteStart)).attr('y1', polarY(termRadius, absoluteStart))
          .attr('x2', polarX(houseRadius, absoluteStart)).attr('y2', polarY(houseRadius, absoluteStart))
          .attr('stroke', '#c5a059').attr('stroke-width', 0.3).attr('opacity', 0.25);
        if (term.end - term.start >= 4) {
          g.append('text')
            .attr('x', polarX((houseRadius + termRadius) / 2, absoluteMid))
            .attr('y', polarY((houseRadius + termRadius) / 2, absoluteMid))
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('font-size', 6).attr('fill', '#999').attr('opacity', 0.75)
            .text(term.planet.substring(0, 2));
        }
      }
    }
  }

  // Houses and angles ------------------------------------------------------
  houses.forEach(house => {
    const degree = house.degree;
    const isMain = [1, 4, 7, 10].includes(house.house);
    const strokeWidth = isMain ? 2.8 : 1.4;
    const opacity = isMain ? 1.0 : 0.7;
    const dash = isMain ? 'none' : '4 3';
    const color = isMain ? '#111111' : '#a08850';
    g.append('line')
      .attr('x1', polarX(degreeRadius + 8, degree)).attr('y1', polarY(degreeRadius + 8, degree))
      .attr('x2', polarX(aspectRadius + 5, degree)).attr('y2', polarY(aspectRadius + 5, degree))
      .attr('stroke', color).attr('stroke-width', strokeWidth).attr('opacity', opacity)
      .attr('stroke-dasharray', dash);
    if (house.house === 1) {
      console.log('House 1 (ASC) line drawn at degree', degree, 'Mapped x,y =', polarX(degreeRadius, degree), polarY(degreeRadius, degree));
    }
    if (house.house === 10) {
      console.log('House 10 (MC) line drawn at degree', degree, 'Mapped x,y =', polarX(degreeRadius, degree), polarY(degreeRadius, degree));
    }
    const nextHouse = houses[house.house % 12];
    if (nextHouse) {
      const midpoint = getHouseMidpointDegree(degree, nextHouse.degree);
      const labelRadius = (houseRadius + aspectRadius) / 2;
      g.append('text')
        .attr('x', polarX(labelRadius, midpoint)).attr('y', polarY(labelRadius, midpoint))
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 7).attr('fill', isMain ? '#1a1a2e' : '#c5a059')
        .attr('opacity', isMain ? 0.6 : 0.35).attr('font-weight', 'bold')
        .text(house.house);
    }
  });

  ([
    { house: 1, label: 'Asc' },
    { house: 10, label: 'MC' },
    { house: 7, label: 'Dsc' },
    { house: 4, label: 'IC' },
  ] as const).forEach(({ house: houseNumber, label }) => {
    const house = houses.find(candidate => candidate.house === houseNumber);
    if (!house) return;
    const x = polarX(degreeRadius + 14, house.degree);
    const y = polarY(degreeRadius + 14, house.degree);
    g.append('text')
      .attr('x', x).attr('y', y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', 8).attr('fill', '#1a1a2e').attr('font-weight', '900')
      .attr('opacity', 0.85)
      .text(label);
  });

  // Natal aspects ----------------------------------------------------------
  aspects.forEach(aspect => {
    const first = filteredPlanets.find(planet => planet.name === aspect.p1);
    const second = filteredPlanets.find(planet => planet.name === aspect.p2);
    if (!first || !second) return;
    const color = ASPECT_COLORS[aspect.type] || '#ccc';
    const opacity = ASPECT_OPACITY[aspect.type] || 0.3;
    const x1 = polarX(planetRadius, first.degree);
    const y1 = polarY(planetRadius, first.degree);
    const x2 = polarX(planetRadius, second.degree);
    const y2 = polarY(planetRadius, second.degree);

    g.append('line')
      .attr('class', `aspect-line aspect-p1-${aspect.p1} aspect-p2-${aspect.p2}`)
      .attr('data-default-opacity', opacity)
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', color).attr('stroke-width', 0.8).attr('opacity', opacity);

    const hitArea = g.append('line')
      .attr('class', 'aspect-hit-area')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', 'white').attr('stroke-width', 12).attr('opacity', 0.0001)
      .style('cursor', 'pointer').attr('pointer-events', 'stroke');

    hitArea.on('mouseenter mousemove', (event: MouseEvent) => {
      d3.selectAll('.aspect-line').transition().duration(200).style('opacity', 0.05);
      d3.selectAll(`.aspect-line.aspect-p1-${aspect.p1}.aspect-p2-${aspect.p2}`).transition().duration(100)
        .style('opacity', 1.0).attr('stroke-width', 2.5);
      const rect = svgElement.getBoundingClientRect();
      const p1Pt = PLANET_NAMES_PT[aspect.p1] || aspect.p1;
      const p2Pt = PLANET_NAMES_PT[aspect.p2] || aspect.p2;
      onAspectTooltip({
        type: aspect.type,
        p1: p1Pt,
        p2: p2Pt,
        orb: aspect.orb,
        general: ASPECT_MEANINGS[aspect.type] || 'Aspecto geométrico ligando os planetas.',
        specific: getAspectKeyword(aspect.type, p1Pt, p2Pt),
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        color: '#B8860B',
      });
    }).on('mouseleave', () => {
      d3.selectAll('.aspect-line').transition().duration(200)
        .style('opacity', function restoreOpacity() { return d3.select(this).attr('data-default-opacity'); })
        .attr('stroke-width', 0.8);
      onAspectTooltip(null);
    });
  });

  // Transit aspects --------------------------------------------------------
  if (transitAspects?.length) {
    transitAspects.forEach(aspect => {
      const first = filteredPlanets.find(planet => planet.name === aspect.p1)
        || transitPlanets?.find(planet => planet.name === aspect.p1);
      const second = filteredPlanets.find(planet => planet.name === aspect.p2)
        || transitPlanets?.find(planet => planet.name === aspect.p2);
      if (!first || !second) return;
      const color = ASPECT_COLORS[aspect.type] || '#ccc';
      g.append('line')
        .attr('x1', polarX(first.isAngle ? planetRadius : transitRadius, first.degree))
        .attr('y1', polarY(first.isAngle ? planetRadius : transitRadius, first.degree))
        .attr('x2', polarX(second.isAngle ? planetRadius : transitRadius, second.degree))
        .attr('y2', polarY(second.isAngle ? planetRadius : transitRadius, second.degree))
        .attr('stroke', color).attr('stroke-width', 0.8).attr('opacity', 0.3)
        .attr('stroke-dasharray', '4,4');
    });
  }

  // Natal planets / points -------------------------------------------------
  const sortedPlanets = [...filteredPlanets].sort((a, b) => normalizeDegree(a.degree) - normalizeDegree(b.degree));
  const placed: { x: number; y: number }[] = [];
  const minimumDistance = 22;

  sortedPlanets.forEach(planet => {
    const degree = planet.degree;
    const isAngle = planet.isAngle || ['ASC', 'MC', 'DSC', 'IC'].includes(planet.name);
    const color = planet.color || PLANET_COLORS[planet.name] || (isAngle ? '#B8860B' : '#888');
    const symbol = planet.symbol || PLANET_SYMBOLS[planet.name] || '●';
    let x = polarX(planetRadius, degree);
    let y = polarY(planetRadius, degree);
    for (let attempt = 0; attempt < 8; attempt++) {
      const tooClose = placed.some(point => Math.hypot(point.x - x, point.y - y) < minimumDistance);
      if (!tooClose) break;
      const nudge = (attempt + 1) * 4;
      x = polarX(planetRadius + nudge, degree);
      y = polarY(planetRadius + nudge, degree);
    }
    placed.push({ x, y });

    g.append('line')
      .attr('x1', polarX(aspectRadius + 5, degree)).attr('y1', polarY(aspectRadius + 5, degree))
      .attr('x2', x).attr('y2', y)
      .attr('stroke', color).attr('stroke-width', 0.3).attr('opacity', 0.15);

    const planetGroup = g.append('g').attr('class', 'planet-node').style('cursor', 'pointer');
    planetGroup.append('circle').attr('cx', x).attr('cy', y).attr('r', 18)
      .attr('fill', 'none').attr('pointer-events', 'all');

    if (isAngle) {
      const size = 10;
      planetGroup.append('polygon')
        .attr('points', `${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`)
        .attr('fill', 'white').attr('stroke', color).attr('stroke-width', 1.5);
    } else {
      planetGroup.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', 10)
        .attr('fill', 'white').attr('stroke', color).attr('stroke-width', 1.5);
    }

    planetGroup.append('text')
      .attr('x', x).attr('y', y + 1)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', isAngle ? 8 : 10).attr('fill', color)
      .attr('font-weight', 'bold').text(symbol);
    planetGroup.append('text')
      .attr('x', x).attr('y', y + 11)
      .attr('text-anchor', 'middle')
      .attr('font-size', 6).attr('fill', '#666').attr('font-weight', '600')
      .text(formatMandalaDegree(normalizeDegree(degree)));

    if (planet.retrograde && RETROGRADE_ALLOWED.includes(planet.name)) {
      planetGroup.append('text')
        .attr('x', x + 13).attr('y', y - 8)
        .attr('font-size', 7).attr('fill', '#E74C3C').attr('font-weight', 'bold')
        .text('℞');
    }

    planetGroup.on('mouseenter mousemove', (event: MouseEvent) => {
      const signIndex = getSignIndex(degree);
      const sun = planets.find(candidate => candidate.name === 'Sun');
      const sunDegree = sun ? sun.degree : 0;
      const motion = typeof planet.speed === 'number' && Number.isFinite(planet.speed)
        ? getMotionStatus(planet.name, planet.speed)
        : 'Indisponível';
      const mansionValue = getMansion(degree);
      const dignity = getDignityState(planet.name, degree);
      const proximity = getProximityToSun(planet.name, degree, sunDegree);
      const feral = calculationCertified && isFeral(planet.name, planetsMap);
      const rect = svgElement.getBoundingClientRect();
      onPlanetTooltip({
        name: planet.name,
        sign: `${SIGN_NAMES[signIndex]} ${formatMandalaDegree(normalizeDegree(degree))}`,
        degree: `${normalizeDegree(degree).toFixed(2)}°`,
        retrograde: Boolean(planet.retrograde),
        stationary: Boolean(planet.stationary),
        motion,
        color,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        decanate: getDecanateRuler(degree),
        term: getTermRuler(degree),
        mansion: `${mansionValue.name} ${mansionValue.deg}°${String(mansionValue.min).padStart(2, '0')}'`,
        star: getFixedStar(degree),
        dignity: dignity.label || 'Peregrino',
        visibility: getVisibilityState(planet.name, degree, sunDegree),
        special: proximity || (feral ? `${FERAL_RULE.label} · ${FERAL_RULE.layer}` : null),
        specialRule: feral ? FERAL_RULE : undefined,
      });
    }).on('mouseleave', () => onPlanetTooltip(null));
  });

  // Transit planets --------------------------------------------------------
  if (transitPlanets?.length) {
    const sortedTransits = [...transitPlanets].sort((a, b) => normalizeDegree(a.degree) - normalizeDegree(b.degree));
    const placedTransits: { x: number; y: number }[] = [];
    const minimumTransitDistance = 22;
    sortedTransits.forEach(planet => {
      const degree = planet.degree;
      const color = '#87CEEB';
      const symbol = planet.symbol || PLANET_SYMBOLS[planet.name] || '●';
      const isAngle = planet.isAngle || ['ASC', 'MC', 'DSC', 'IC'].includes(planet.name);
      let x = polarX(transitRadius, degree);
      let y = polarY(transitRadius, degree);
      for (let attempt = 0; attempt < 8; attempt++) {
        const tooClose = placedTransits.some(point => Math.hypot(point.x - x, point.y - y) < minimumTransitDistance);
        if (!tooClose) break;
        const nudge = (attempt + 1) * 4;
        x = polarX(transitRadius + nudge, degree);
        y = polarY(transitRadius + nudge, degree);
      }
      placedTransits.push({ x, y });
      g.append('line')
        .attr('x1', polarX(aspectRadius + 5, degree)).attr('y1', polarY(aspectRadius + 5, degree))
        .attr('x2', x).attr('y2', y)
        .attr('stroke', color).attr('stroke-width', 0.3).attr('opacity', 0.15);
      const transitGroup = g.append('g').attr('class', 'transit-node').style('cursor', 'pointer');
      transitGroup.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', 10)
        .attr('fill', 'white').attr('stroke', color).attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2');
      transitGroup.append('text')
        .attr('x', x).attr('y', y + 1)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', isAngle ? 8 : 10).attr('fill', color)
        .attr('font-weight', 'bold').text(symbol);
    });
  }
}
