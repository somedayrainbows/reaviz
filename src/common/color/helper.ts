import { scaleOrdinal, scaleQuantile } from 'd3-scale';
import { maxIndex, extent } from 'd3-array';
import { schemes } from './schemes';
import { uniqueBy } from '../utils';

export type ColorSchemeType =
  | ((data, index: number, active?: any[]) => string)
  | Partial<CSSStyleDeclaration>[]
  | string[]
  | string;

type ColorHelperProps = {
  colorScheme: ColorSchemeType;
  point: any;
  data: any[];
  index: number;
  active: any[];
  scale?: any;
  domain?: any[];
  key?: any;
  attribute?: string;
  isMultiSeries?: boolean;
};

type ColorSchemeValueScale = (point: any) => string;

/**
 * Given a point, get the key attributes for it.
 */
const rangeHelper = (point: any, attribute: string) =>
  point.map((r, i) => {
    if (r) {
      if (r[attribute] !== undefined) {
        return r[attribute];
      } else if (r.data && r.data[attribute] !== undefined) {
        return r.data[attribute];
      }
    }

    return i;
  });

/**
 * Get a color given a range.
 */
export const getColor = (props: Partial<ColorHelperProps>) => {
  let {
    point,
    colorScheme,
    attribute,
    index,
    data,
    active,
    isMultiSeries,
    domain,
    key,
    scale
  } = {
    attribute: 'key',
    isMultiSeries: false,
    scale: scaleOrdinal,
    ...props
  };

  if (typeof colorScheme === 'string' && schemes[colorScheme]) {
    colorScheme = schemes[colorScheme];
  }

  if (Array.isArray(colorScheme)) {
    if (!domain) {
      if (isMultiSeries && Array.isArray(data)) {
        const maxIdx = maxIndex(data, (d) => d.data.length);
        const maxVal = data[maxIdx];
        data = maxVal.data;
      }

      domain = rangeHelper(data, attribute);
    }

    key = key !== undefined ? key : point[attribute];

    return scale(colorScheme).domain(domain)(key);
  } else if (typeof colorScheme === 'function') {
    return colorScheme(point, index!, active);
  } else {
    return colorScheme;
  }
};

/**
 * This function creates a value scale that maps data points to colors or CSS styles.
 *
 * @param {Array} data - The data used to create the scale.
 * @param {ColorSchemeType} colorScheme - The color scheme used to generate the scale. This can be an array of colors or an array of css styles objects.
 * @param {string} emptyColor - The color used for data points with no value.
 *
 * @returns {ColorSchemeValueScale} A function that takes a data point and returns a color or CSS style based on the data point's value.
 */
const getValueScale = (
  data,
  colorScheme: ColorSchemeType,
  emptyColor: string
): ColorSchemeValueScale => {
  const valueDomain = extent(
    uniqueBy(
      data,
      (d) => d.data,
      (d) => d.value
    )
  );

  return (point) => {
    // For 0 values, lets show a placeholder fill
    if (point === undefined || point === null) {
      return emptyColor;
    }

    // Note: this can return css style values, not just colors
    return getColor({
      scale: scaleQuantile,
      domain: valueDomain,
      key: point,
      colorScheme
    });
  };
};

/**
 * This function generates a style object for a given data point based on a map of value scales.
 *
 * @param {any} point - The data point for which to generate the style object.
 * @param {Map<string, ColorSchemeValueScale>} valueScales - A map where each key is a property name and each value is a function that takes a data point and returns a color or CSS style.
 *
 * @returns {Partial<CSSStyleDeclaration>} A style object where each key is a property name and each value is a color or CSS style based on the value of the data point for that property.
 */
export const getColorSchemeStyles = (
  point,
  valueScales: Map<string, ColorSchemeValueScale>
): Partial<CSSStyleDeclaration> =>
  Array.from(valueScales).reduce((acc, [key, valueScale]) => {
    return { ...acc, [key]: valueScale(point) };
  }, {});

/**
 * This function retrieves a color scheme for a specific property from a given color scheme.
 *
 * @param {ColorSchemeType} colorScheme - The color scheme used to generate the scale. This can be an array of colors or an array of objects where each object maps a property to a color.
 * @param {string} colorSchemeProperty - The property for which to retrieve the color scheme.
 *
 * @returns {ColorSchemeType} A color scheme for the specified property.
 */
const getColorSchemeForProperty = (
  colorScheme: ColorSchemeType,
  colorSchemeProperty: string
): ColorSchemeType => {
  if (!Array.isArray(colorScheme)) {
    return colorScheme;
  }

  const newColorScheme = colorScheme.map(
    (schemeItem: string | Partial<CSSStyleDeclaration>) => {
      if (typeof schemeItem === 'object') {
        return schemeItem?.[colorSchemeProperty];
      }

      return schemeItem;
    }
  );
  return newColorScheme;
};

/**
 * This function creates a map of value scales for different properties based on a provided color scheme.
 * Each value scale is a function that takes a data point and returns a css style value based on that point.
 *
 * @param {Array} data - The data used to create the scales.
 * @param {ColorSchemeType} colorScheme - The color scheme used to generate the scales. This can be an array of colors or an array of objects where each object contains a set of css styles.
 * @param {string} emptyColor - The color used for data points with no value.
 *
 * @returns {Map<string, ColorSchemeValueScale>} A map where each key is a property name and each value is a function that takes a data point and returns a value for the property.
 *
 * If the color scheme is an array of strings, they will be treated as fill values.
 */
export const createColorSchemeValueScales = (
  data,
  colorScheme: ColorSchemeType,
  emptyColor: string
): Map<string, ColorSchemeValueScale> => {
  const valueScales = new Map<string, ColorSchemeValueScale>();

  const isColorSchemeObjectArray =
    Array.isArray(colorScheme) && typeof colorScheme[0] === 'object';

  if (isColorSchemeObjectArray) {
    const colorSchemeProperties = isColorSchemeObjectArray
      ? [...new Set(colorScheme.flatMap(Object.keys))]
      : [];

    colorSchemeProperties.forEach((key) => {
      const valueScale = getValueScale(
        data,
        getColorSchemeForProperty(colorScheme, key),
        emptyColor
      );
      valueScales.set(key, valueScale);
    });
  } else {
    valueScales.set('fill', getValueScale(data, colorScheme, emptyColor));
  }

  return valueScales;
};
