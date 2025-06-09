import React, { useState } from 'react';
import {
  Input,
  Stack,
  Popover,
  Button,
  useDisclosure,
  Box
} from '@chakra-ui/react';
import { Search } from 'lucide-react';
import type { Token, ResolvedValueType } from '@token-model/data-model';
import TokenTag from './TokenTag';

export interface TokenValuePickerProps {
  value: { value?: unknown; tokenId?: string };
  tokens: Token[];
  excludeTokenId?: string;
  modes: string[];
  resolvedValueTypeId: string;
  resolvedValueTypes: ResolvedValueType[];
  onChange: (value: { value?: unknown; tokenId?: string }) => void;
}

export function TokenValuePicker({
  value,
  tokens,
  excludeTokenId,
  resolvedValueTypeId,
  resolvedValueTypes,
  onChange
}: TokenValuePickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { open, onOpen, onClose } = useDisclosure();

  const handleValueChange = (newValue: string | number) => {
    onChange({ value: newValue });
  };

  const handleTokenSelect = (token: Token) => {
    onChange({ tokenId: token.id });
    onClose();
  };

  const filteredTokens = tokens.filter(token => 
    token.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Popover.Root open={open} onOpenChange={onClose}>
      <Popover.Trigger asChild>
        <Box>
          {value.tokenId ? (
            <TokenTag
              displayName={tokens.find(t => t.id === value.tokenId)?.displayName || ''}
              resolvedValueTypeId={resolvedValueTypeId}
              resolvedValueTypes={resolvedValueTypes}
              value={value.tokenId}
              onClick={excludeTokenId === value.tokenId ? undefined : onOpen}
            />
          ) : (
            <Input
              value={value.value as string}
              onChange={e => handleValueChange(e.target.value)}
              disabled={excludeTokenId === value.tokenId}
              onClick={excludeTokenId === value.tokenId ? undefined : onOpen}
            />
          )}
        </Box>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content>
          <Popover.Arrow />
          <Button
            position="absolute"
            top={2}
            right={2}
            variant="ghost"
            onClick={onClose}
            aria-label="Close popover"
          >
            ×
          </Button>
          <Popover.Body>
            <Stack gap={2}>
              <Box position="relative">
                <Input
                  placeholder="Search tokens..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  pl={8}
                />
                <Box position="absolute" left={2} top="50%" transform="translateY(-50%)" pointerEvents="none">
                  <Search size={16} />
                </Box>
              </Box>
              <Box as="ul" listStyleType="none" p={0}>
                {filteredTokens.map(token => (
                  <Box as="li" key={token.id}>
                    <Button
                      variant="ghost"
                      width="full"
                      justifyContent="flex-start"
                      onClick={() => handleTokenSelect(token)}
                    >
                      {token.displayName}
                    </Button>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
} 