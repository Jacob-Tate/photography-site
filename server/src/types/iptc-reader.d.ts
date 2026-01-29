declare module 'iptc-reader' {
  interface IptcData {
    keywords?: string | string[];
    caption?: string;
    headline?: string;
    credit?: string;
    source?: string;
    copyright?: string;
    city?: string;
    state?: string;
    country?: string;
    [key: string]: unknown;
  }

  function iptcReader(buffer: Buffer): IptcData;
  export = iptcReader;
}
