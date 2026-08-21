declare module "@elevenlabs/react" {
  export function useScribe(options: any): {
    isConnected: boolean;
    isConnecting?: boolean;
    connect(options: any): Promise<void>;
    disconnect(): void;
    partialTranscript?: string;
    committedTranscripts?: Array<{id:string;text:string}>;
  };
}
