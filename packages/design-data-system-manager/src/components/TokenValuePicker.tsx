import React, { useState } from 'react';
import {
  Input,
  NumberInput,
  Stack,
  Popover,
  Button,
  useDisclosure,
  IconButton,
  Box,
  InputGroup,
  InputElement
} from '@chakra-ui/react';
import { Search, Unlink } from 'lucide-react';
import type { Token, TokenValue, ResolvedValueType } from '@token-model/data-model';
import TokenTag from './TokenTag';

export interface TokenValuePickerProps {
  value: { value?: any; tokenId?: string };
  tokens: Token[];
  excludeTokenId?: string;
  modes: string[];
  resolvedValueTypeId: string;
  resolvedValueTypes: ResolvedValueType[];
  onChange: (value: { value?: any; tokenId?: string }) => void;
}

export function TokenValuePicker({
  value,
  tokens,
  excludeTokenId,
  modes,
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
      <Popover.Trigger>
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
              value={value.value}
              onChange={e => handleValueChange(e.target.value)}
              disabled={excludeTokenId === value.tokenId}
              onClick={excludeTokenId === value.tokenId ? undefined : onOpen}
            />
          )}
        </Box>
      </Popover.Trigger>
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
            <InputGroup startElement={<Search size={16} />}>
              <Input
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </InputGroup>
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
    </Popover.Root>
  );
} 