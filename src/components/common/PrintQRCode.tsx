import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PrintQRCodeProps {
  url?: string;
  caption?: string;
  className?: string;
}

export const PrintQRCode: React.FC<PrintQRCodeProps> = ({
  url = 'https://university-academic-calculator.vercel.app/',
  caption = 'Scan to use Academic Calculator',
  className = '',
}) => {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1D1D1F',
        light: '#FFFFFF',
      },
    })
      .then((svg) => setSvgContent(svg))
      .catch(() => {});
  }, [url]);

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {svgContent ? (
        <div
          className="w-14 h-14 border border-[#D2D2D7] rounded-lg p-1 bg-white flex items-center justify-center overflow-hidden"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <div className="w-14 h-14 border border-[#D2D2D7] rounded-lg bg-[#FAFAFA]" />
      )}
      <span className="text-[8px] text-[#6E6E73] font-medium mt-1 leading-tight max-w-[85px]">
        {caption}
      </span>
    </div>
  );
};
