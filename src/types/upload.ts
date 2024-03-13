export interface UploadJsonUriRespone {
  tokenUri: string;
}

export interface JsonUriMetadata {
  items: Array<{
    name: string;
    description: string;
    [key: string]: any;
  }>;
}

export interface PresignedImageResponse {
  urls: Array<string>;
}

export interface PresignImageData {
  files: Array<{
    mimeType: string;
    fileName: string;
  }>;
}
