import React, { FunctionComponent } from "react";
import styled from "styled-components";
import { BaseModal, BaseModalProps } from "./BaseModal";

export interface Wallet {
  id: string;
  name: string;
  description: string;
  logoImgUrl: string;
}

export const SelectWalletModal: FunctionComponent<
  BaseModalProps & {
    wallets: Wallet[];
    selectWallet: (walletId: string) => void;
  }
> = ({ isOpen, onRequestClose, wallets, selectWallet }) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Select a wallet"
    >
      <WalletList>
        {wallets.map((wallet) => (
          <Wallet
            key={wallet.id}
            onClick={(e) => {
              e.preventDefault();
              selectWallet(wallet.id);
            }}
          >
            <WalletIconImg src={wallet.logoImgUrl} alt="keplr logo" />
            <WalletInfo>
              <WalletName>{wallet.name}</WalletName>
              <WalletDescription>{wallet.description}</WalletDescription>
            </WalletInfo>
          </Wallet>
        ))}
      </WalletList>
    </BaseModal>
  );
};

const WalletList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Wallet = styled.div`
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  background-color: rgb(229 231 235);
  box-shadow: inset 0 0 0 1px rgb(156 163 175);

  &:hover {
    cursor: pointer;
  }
`;

const WalletIconImg = styled.img`
  width: 4rem;
  height: 4rem;
`;

const WalletInfo = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 1.25rem;
`;

const WalletName = styled.div`
  color: black;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.75rem;
`;

const WalletDescription = styled.div`
  margin-top: 0.25rem;
  color: rgb(75 85 99);
`;
