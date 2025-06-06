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

export function TokenDeleteDialog({ open, onClose, token, onDelete }: TokenDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <Dialog.Header>Delete Token</Dialog.Header>
        <Dialog.Body>
          Are you sure you want to delete the token "{token.displayName}"? This action cannot be undone.
        </Dialog.Body>
        <Dialog.Footer>
          <Button ref={cancelRef} onClick={onClose}>
            Cancel
          </Button>
          <Button colorPalette="red" onClick={() => onDelete(token.id)} ml={3}>
            Delete
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
} 