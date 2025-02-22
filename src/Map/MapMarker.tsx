import React, { Fragment, useRef, useState, FC, useMemo } from 'react';
import { Tooltip } from 'reablocks';
import { motion } from 'framer-motion';
import css from './MapMarker.module.css';

export interface MapMarkerProps {
  coordinates: [number, number];
  index: number;
  cy?: number;
  cx?: number;
  size?: number;
  tooltip?: any;
  onClick?: () => void;
}

// Set padding modifier for the tooltips
const modifiers = {
  offset: {
    offset: '0, 3px'
  }
};

export const MapMarker: FC<Partial<MapMarkerProps>> = ({
  size = 3,
  index,
  tooltip,
  cx,
  cy,
  onClick = () => undefined
}) => {
  const ref = useRef<SVGCircleElement | null>(null);
  const [active, setActive] = useState<boolean>(false);

  const ariaLabelData = useMemo(() => typeof tooltip === 'string' ? tooltip: 'map marker', [tooltip]);

  return (
    <Fragment>
      <motion.circle
        initial={{
          opacity: 0,
          scale: 0.02
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        transition={{
          delay: index! * 0.3
        }}
        ref={ref}
        className={css.marker}
        cx={cx}
        cy={cy}
        r={size}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onClick={onClick}
        tabIndex={0}
        aria-label={ariaLabelData}
        role="graphics-document"
      />
      {tooltip && (
        <Tooltip
          visible={active}
          reference={ref}
          modifiers={modifiers}
          content={tooltip}
        />
      )}
    </Fragment>
  );
};
