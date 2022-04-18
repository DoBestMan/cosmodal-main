import React, { FunctionComponent, ReactElement } from "react";
import ReactModal from "react-modal";
import styled from "styled-components";
import { CloseIcon } from "./CloseIcon";

export interface BaseModalProps {
  isOpen: boolean;
  onRequestClose: () => void;

  title?: ReactElement | string;
  maxWidth?: string;
}

export const BaseModal: FunctionComponent<BaseModalProps> = ({
  isOpen,
  onRequestClose,
  title,
  maxWidth = "36rem",
  children,
}) => {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={(e) => {
        e.preventDefault();
        onRequestClose();
      }}
      className="_"
      overlayClassName="_"
      contentElement={(props, children) => (
        <ModalContent maxWidth={maxWidth} {...props}>
          {children}
        </ModalContent>
      )}
      overlayElement={(props, children) => (
        <ModalOverlay {...props}>{children}</ModalOverlay>
      )}
    >
      {typeof title === "string" ? <ModalHeader>{title}</ModalHeader> : title}
      <ModalCloseButton onClick={() => onRequestClose()}>
        <CloseIcon width={26} height={26} />
      </ModalCloseButton>
      {children}
    </ReactModal>
  );
};

const ModalContent = styled.div<{ maxWidth: string }>`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  padding: 1.25rem;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  background: white;
  width: 100%;
  max-width: ${(props) => props.maxWidth};
  outline: none;

  @media (max-width: 768px) {
    width: calc(100% - 40px);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: cetner;
`;

const ModalHeader = styled.div`
  color: rgb(31, 41, 55);
  font-size: 1.25rem;
  font-weight: bold;
  line-height: 1.75rem;
  margin-bottom: 1rem;
`;

const ModalCloseButton = styled.div`
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  cursor: pointer;
`;
