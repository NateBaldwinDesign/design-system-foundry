import React, { useRef } from 'react';
import {
  Dialog,
  Button
} from '@chakra-ui/react';
import type { Token } from '@token-model/data-model';

interface TokenDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  token: Token;
  onDelete: (tokenId: string) => void;
}

export const TokenDeleteDialog: React.FC<TokenDeleteDialogProps> = ({
  open,
  onClose,
  token,
  onDelete
}) => {
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>Delete Token</Dialog.Header>
          <Dialog.Body>
            Are you sure you want to delete the token &ldquo;{token.displayName}&rdquo;? This action cannot be undone.
          </Dialog.Body>
          <Dialog.Footer>
            <Button
              ref={initialFocusRef}
              onClick={onClose}
              variant="ghost"
              colorPalette="gray"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onDelete(token.id);
                onClose();
              }}
              colorPalette="red"
              ml={3}
            >
              Delete
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}; 