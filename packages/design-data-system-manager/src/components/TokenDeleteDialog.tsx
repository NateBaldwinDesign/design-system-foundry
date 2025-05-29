import React, { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button
} from '@chakra-ui/react';
import type { Token } from '@token-model/data-model';

interface TokenDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token;
  onDelete: (tokenId: string) => void;
}

export function TokenDeleteDialog({
  isOpen,
  onClose,
  token,
  onDelete
}: TokenDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleDelete = () => {
    onDelete(token.id);
    onClose();
  };

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Token
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to delete the token &ldquo;{token.displayName}&rdquo;? This action cannot be undone.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDelete} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
} 