import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface Props {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
}

const BarcodeImage: React.FC<Props> = ({ value, width = 1.6, height = 50, fontSize = 12, className }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width,
        height,
        fontSize,
        margin: 6,
        displayValue: true,
      });
    } catch (e) {
      console.error('Barcode render failed', e);
    }
  }, [value, width, height, fontSize]);

  return <svg ref={svgRef} className={className} />;
};

export default BarcodeImage;
