import React, {
  createContext,
  FunctionComponent,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Keplr } from "@keplr-wallet/types";
import { getKeplrFromWindow } from "@keplr-wallet/stores";
import {
  KeplrConnectionSelectModal,
  KeplrWalletConnectQRModal,
} from "../components";
import EventEmitter from "eventemitter3";
import { BroadcastMode, StdTx } from "@cosmjs/launchpad";
import Axios from "axios";
import { EmbedChainInfos } from "../config";
import { Buffer } from "buffer";
import WalletConnect from "@walletconnect/client";
import { KeplrWalletConnectV1 } from "./wc-client";

export async function sendTxWC(
  chainId: string,
  tx: StdTx | Uint8Array,
  mode: BroadcastMode
): Promise<Uint8Array> {
  const restInstance = Axios.create({
    baseURL: EmbedChainInfos.find((chainInfo) => chainInfo.chainId === chainId)!
      .rest,
  });

  const isProtoTx = Buffer.isBuffer(tx) || tx instanceof Uint8Array;

  const params = isProtoTx
    ? {
        tx_bytes: Buffer.from(tx as any).toString("base64"),
        mode: (() => {
          switch (mode) {
            case "async":
              return "BROADCAST_MODE_ASYNC";
            case "block":
              return "BROADCAST_MODE_BLOCK";
            case "sync":
              return "BROADCAST_MODE_SYNC";
            default:
              return "BROADCAST_MODE_UNSPECIFIED";
          }
        })(),
      }
    : {
        tx,
        mode: mode,
      };

  const result = await restInstance.post(
    isProtoTx ? "/cosmos/tx/v1beta1/txs" : "/txs",
    params
  );

  const txResponse = isProtoTx ? result.data["tx_response"] : result.data;

  if (txResponse.code != null && txResponse.code !== 0) {
    throw new Error(txResponse["raw_log"]);
  }

  return Buffer.from(txResponse.txhash, "hex");
}

export const GetKeplrContext = createContext<{
  getKeplr(): Promise<Keplr | undefined>;
  clearLastUsedKeplr(): void;
  connectionType?: "extension" | "wallet-connect";
  setDefaultConnectionType(
    type: "extension" | "wallet-connect" | undefined
  ): void;
} | null>(null);

export const GetKeplrProvider: FunctionComponent = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wcUri, setWCUri] = useState("");

  const lastUsedKeplrRef = useRef<Keplr | undefined>();
  const defaultConnectionTypeRef = useRef<
    "extension" | "wallet-connect" | undefined
  >();
  const [connectionType, setConnectionType] = useState<
    "extension" | "wallet-connect" | undefined
  >();
  const [eventListener] = useState(() => new EventEmitter());

  const [getKeplr] = useState(() => (): Promise<Keplr | undefined> => {
    if (typeof window === "undefined") {
      return Promise.resolve(undefined);
    }

    if (lastUsedKeplrRef.current) {
      return Promise.resolve(lastUsedKeplrRef.current);
    }

    if (defaultConnectionTypeRef.current === "extension") {
      return getKeplrFromWindow().then((keplr) => {
        lastUsedKeplrRef.current = keplr;
        setConnectionType("extension");
        return keplr;
      });
    }

    let callbackClosed: (() => void) | undefined;

    if (defaultConnectionTypeRef.current === "wallet-connect") {
      const connector = new WalletConnect({
        bridge: "https://bridge.walletconnect.org", // Required
        signingMethods: [
          "keplr_enable_wallet_connect_v1",
          "keplr_sign_amino_wallet_connect_v1",
        ],
        qrcodeModal: {
          open: (uri: string, cb: any) => {
            setWCUri(uri);
            callbackClosed = cb;
          },
          close: () => setWCUri(""),
        },
      });

      if (connector.connected) {
        const keplr = new KeplrWalletConnectV1(connector, {
          sendTx: sendTxWC,
        });
        lastUsedKeplrRef.current = keplr;
        setConnectionType("wallet-connect");
        return Promise.resolve(keplr);
      }
    }

    return new Promise((resolve, reject) => {
      setIsModalOpen(true);

      const cleanUp = () => {
        eventListener.off("modal_close");
        eventListener.off("select_extension");
        eventListener.off("select_wallet_connect");
        eventListener.off("wc_qr_modal_close");
        eventListener.off("connect");
      };

      eventListener.on("modal_close", () => {
        setIsModalOpen(false);
        reject();
        cleanUp();
      });

      eventListener.on("select_extension", () => {
        setIsModalOpen(false);
        getKeplrFromWindow().then((keplr) => {
          lastUsedKeplrRef.current = keplr;
          setConnectionType("extension");
          resolve(keplr);
          cleanUp();
        });
      });

      eventListener.on("select_wallet_connect", () => {
        const connector = new WalletConnect({
          bridge: "https://bridge.walletconnect.org", // Required
          signingMethods: [
            "keplr_enable_wallet_connect_v1",
            "keplr_sign_amino_wallet_connect_v1",
          ],
          qrcodeModal: {
            open: (uri: string, cb: any) => {
              setIsModalOpen(false);
              setWCUri(uri);
              callbackClosed = cb;
            },
            close: () => setWCUri(""),
          },
        });

        eventListener.on("wc_qr_modal_close", () => {
          setWCUri("");
          if (callbackClosed) {
            callbackClosed();
          }
        });

        // Check if connection is already established
        if (!connector.connected) {
          // create new session
          connector.createSession();

          connector.on("connect", (error) => {
            cleanUp();
            if (error) {
              reject(error);
            } else {
              const keplr = new KeplrWalletConnectV1(connector, {
                sendTx: sendTxWC,
              });
              setIsModalOpen(false);
              lastUsedKeplrRef.current = keplr;
              setConnectionType("wallet-connect");
              resolve(keplr);
            }
          });
        } else {
          const keplr = new KeplrWalletConnectV1(connector, {
            sendTx: sendTxWC,
          });
          setIsModalOpen(false);
          lastUsedKeplrRef.current = keplr;
          setConnectionType("wallet-connect");
          resolve(keplr);
          cleanUp();
        }
      });
    });
  });

  return (
    <GetKeplrContext.Provider
      value={{
        getKeplr,
        clearLastUsedKeplr: useCallback(() => {
          lastUsedKeplrRef.current = undefined;
          setConnectionType(undefined);
        }, []),
        setDefaultConnectionType: useCallback(
          (type: "extension" | "wallet-connect" | undefined) => {
            defaultConnectionTypeRef.current = type;
          },
          []
        ),
        connectionType,
      }}
    >
      <KeplrConnectionSelectModal
        isOpen={isModalOpen}
        onRequestClose={() => {
          eventListener.emit("modal_close");
        }}
        onSelectExtension={() => {
          eventListener.emit("select_extension");
        }}
        onSelectWalletConnect={() => {
          eventListener.emit("select_wallet_connect");
        }}
      />
      <KeplrWalletConnectQRModal
        isOpen={wcUri.length > 0}
        onRequestClose={() => {
          eventListener.emit("wc_qr_modal_close");
        }}
        uri={wcUri}
      />
      {children}
    </GetKeplrContext.Provider>
  );
};

export const useKeplr = () => {
  const context = useContext(GetKeplrContext);
  if (!context) {
    throw new Error("You forgot yo use GetKeplrProvider");
  }

  return context;
};
