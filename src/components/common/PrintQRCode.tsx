import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PrintQRCodeProps {
  url?: string;
  caption?: string;
  className?: string;
}

const DEFAULT_URL = 'https://university-academic-calculator.vercel.app/';

// Pre-generated SVG with errorCorrectionLevel 'H', margin 2, black modules on white background
// Guarantees immediate zero-delay synchronous vector rendering in print preview
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" shape-rendering="crispEdges"><path fill="#FFFFFF" d="M0 0h45v45H0z"/><path stroke="#000000" d="M2 2.5h7m1 0h6m1 0h1m4 0h1m1 0h1m5 0h4m2 0h7M2 3.5h1m5 0h1m1 0h1m2 0h1m1 0h3m1 0h4m3 0h1m2 0h3m4 0h1m5 0h1M2 4.5h1m1 0h3m1 0h1m1 0h1m1 0h3m1 0h2m1 0h2m1 0h1m5 0h1m2 0h3m2 0h1m1 0h3m1 0h1M2 5.5h1m1 0h3m1 0h1m2 0h1m1 0h1m2 0h1m1 0h2m2 0h1m1 0h1m4 0h1m6 0h1m1 0h3m1 0h1M2 6.5h1m1 0h3m1 0h1m4 0h1m4 0h1m5 0h1m1 0h3m1 0h1m1 0h3m1 0h1m1 0h3m1 0h1M2 7.5h1m5 0h1m1 0h2m1 0h1m2 0h4m5 0h1m3 0h2m5 0h1m5 0h1M2 8.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M10 9.5h2m2 0h2m1 0h3m3 0h2m1 0h5m3 0h1M4 10.5h3m1 0h1m1 0h1m3 0h3m1 0h1m2 0h1m1 0h2m3 0h1m1 0h2m2 0h4m2 0h3M9 11.5h1m1 0h1m2 0h2m1 0h1m1 0h1m1 0h3m1 0h4m1 0h1m1 0h7m1 0h3M2 12.5h2m1 0h4m3 0h2m5 0h1m1 0h4m1 0h2m1 0h2m3 0h2m2 0h1m2 0h1M2 13.5h6m1 0h1m1 0h3m2 0h1m1 0h1m4 0h1m1 0h3m1 0h2m2 0h3m1 0h1m1 0h1m1 0h1M6 14.5h1m1 0h2m2 0h2m1 0h5m1 0h1m2 0h3m2 0h1m1 0h1m1 0h3m3 0h2m1 0h1M7 15.5h1m3 0h2m5 0h1m3 0h3m3 0h5m2 0h4m1 0h3M2 16.5h1m2 0h4m4 0h3m1 0h1m1 0h2m2 0h3m5 0h1m2 0h2m1 0h3M2 17.5h1m1 0h1m4 0h8m3 0h1m1 0h4m2 0h1m1 0h1m1 0h1m3 0h2m1 0h1M2 18.5h1m2 0h5m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1m5 0h2m2 0h1m2 0h2m1 0h1m1 0h3M6 19.5h2m1 0h2m1 0h2m1 0h2m1 0h1m3 0h2m1 0h1m1 0h2m1 0h1m2 0h2m1 0h7M3 20.5h1m1 0h2m1 0h3m2 0h1m1 0h1m1 0h1m1 0h1m2 0h6m1 0h1m2 0h1m1 0h2m2 0h1M4 21.5h2m1 0h1m4 0h1m1 0h2m2 0h3m2 0h1m2 0h3m4 0h2m3 0h2m2 0h1M3 22.5h2m1 0h3m1 0h2m1 0h2m1 0h1m1 0h1m1 0h1m2 0h2m1 0h2m1 0h1m2 0h2m3 0h1m2 0h2M2 23.5h1m1 0h1m1 0h2m3 0h3m2 0h1m2 0h1m1 0h4m1 0h1m4 0h1m1 0h10M2 24.5h1m2 0h1m2 0h2m2 0h1m1 0h4m1 0h2m1 0h2m2 0h1m1 0h4m2 0h2m2 0h1m1 0h1M11 25.5h3m7 0h1m2 0h1m1 0h3m3 0h1m5 0h2m1 0h2M8 26.5h1m1 0h1m1 0h1m3 0h2m1 0h2m2 0h1m4 0h2m1 0h1m8 0h2M2 27.5h1m3 0h1m3 0h3m2 0h1m3 0h2m1 0h1m2 0h2m1 0h1m1 0h4m2 0h4m1 0h2M4 28.5h3m1 0h3m3 0h2m1 0h2m2 0h4m3 0h2m4 0h1m1 0h3M3 29.5h2m1 0h2m1 0h1m1 0h1m2 0h4m1 0h7m1 0h1m2 0h1m2 0h2m1 0h4M3 30.5h1m4 0h2m2 0h2m3 0h1m2 0h2m1 0h1m1 0h2m1 0h4m1 0h1m1 0h1m3 0h2M2 31.5h1m4 0h1m1 0h1m1 0h1m3 0h1m1 0h2m3 0h1m3 0h1m2 0h1m2 0h1m1 0h2m2 0h2m1 0h2M2 32.5h1m2 0h2m1 0h1m2 0h2m3 0h2m4 0h2m1 0h2m2 0h3m1 0h1m1 0h4M2 33.5h1m3 0h2m3 0h1m2 0h1m3 0h3m2 0h2m1 0h2m1 0h1m2 0h5m2 0h1m2 0h1M2 34.5h1m1 0h1m2 0h2m2 0h2m3 0h2m3 0h3m1 0h1m2 0h4m1 0h9M10 35.5h2m4 0h1m1 0h2m2 0h2m2 0h2m2 0h3m1 0h1m3 0h1m3 0h1M2 36.5h7m2 0h1m4 0h1m1 0h2m2 0h1m1 0h2m1 0h1m1 0h3m1 0h2m1 0h1m1 0h3M2 37.5h1m5 0h1m4 0h5m1 0h2m2 0h2m1 0h2m1 0h6m3 0h2m1 0h2M2 38.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h3m2 0h3m2 0h4m4 0h8M2 39.5h1m1 0h3m1 0h1m1 0h5m1 0h1m1 0h1m1 0h2m3 0h4m1 0h3m2 0h1m1 0h1m4 0h1M2 40.5h1m1 0h3m1 0h1m1 0h1m3 0h2m2 0h4m1 0h3m1 0h1m1 0h2m1 0h2m1 0h5m1 0h1M2 41.5h1m5 0h1m2 0h2m4 0h1m1 0h1m1 0h1m3 0h1m1 0h1m1 0h1m4 0h2m2 0h2m1 0h1M2 42.5h7m2 0h1m1 0h2m2 0h1m1 0h1m4 0h2m1 0h2m1 0h2m1 0h1m2 0h5"/></svg>`;

export const PrintQRCode: React.FC<PrintQRCodeProps> = ({
  url = DEFAULT_URL,
  caption = 'Scan to open Academic Calculator',
  className = '',
}) => {
  const [svgContent, setSvgContent] = useState<string>(
    url === DEFAULT_URL ? DEFAULT_SVG : ''
  );

  useEffect(() => {
    if (url === DEFAULT_URL) {
      setSvgContent(DEFAULT_SVG);
      return;
    }

    QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((svg) => setSvgContent(svg))
      .catch(() => {});
  }, [url]);

  return (
    <div className={`print-qr-wrapper flex flex-col items-center text-center ${className}`}>
      <div
        className="print-qr-box w-[84px] h-[84px] min-w-[84px] min-h-[84px] max-w-[84px] max-h-[84px] border border-[#D2D2D7] rounded-lg p-1 bg-white flex items-center justify-center overflow-hidden [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <span className="print-qr-caption text-[7.5px] text-[#6E6E73] font-medium mt-1 leading-tight max-w-[84px] tracking-tight">
        {caption}
      </span>
    </div>
  );
};

