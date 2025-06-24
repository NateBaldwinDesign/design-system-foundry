import React, { useState } from 'react';
import {
  Box,
  HStack,
  IconButton,
  useColorMode,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Badge,
} from '@chakra-ui/react';
import {
  GitPullRequestArrow,
  User,
  History,
} from 'lucide-react';
import { ChangeLog } from './ChangeLog';

interface HeaderProps {
  hasChanges?: boolean;
  changeCount?: number;
  getCurrentData: () => Record<string, unknown>;
  getBaselineData: () => Record<string, unknown>;
}

export const Header: React.FC<HeaderProps> = ({ 
  hasChanges = false, 
  changeCount = 0,
  getCurrentData,
  getBaselineData
}) => {
  const { colorMode } = useColorMode();
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [changeLogData, setChangeLogData] = useState<{
    currentData: Record<string, unknown>;
    baselineData: Record<string, unknown>;
  } | null>(null);

  // Get real data when modal opens
  const handleOpenModal = () => {
    const currentData = getCurrentData();
    const baselineData = getBaselineData();
    setChangeLogData({ currentData, baselineData });
    onOpen();
  };

  return (
    <>
      <Box
        as="header"
        borderBottom="1px"
        borderColor={borderColor}
        bg={bgColor}
        px={4}
        py={3}
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
      >
        <HStack spacing={2}>
          <IconButton
            aria-label="Pull Request"
            icon={<GitPullRequestArrow size={20} />}
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Implement pull request functionality
              console.log('Pull request clicked');
            }}
          />
          <IconButton
            aria-label="User Profile"
            icon={<User size={20} />}
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Implement user profile functionality
              console.log('User profile clicked');
            }}
          />
          <Box position="relative">
            <IconButton
              aria-label="History"
              icon={<History size={20} />}
              variant="ghost"
              size="sm"
              onClick={handleOpenModal}
            />
            {hasChanges && (
              <Badge
                position="absolute"
                top="-2px"
                right="-2px"
                colorScheme="red"
                variant="solid"
                size="sm"
                borderRadius="full"
                minW="18px"
                h="18px"
                fontSize="xs"
                display="flex"
                alignItems="center"
                justifyContent="center"
                zIndex={1}
              >
                {changeCount > 99 ? '99+' : changeCount}
              </Badge>
            )}
          </Box>
        </HStack>
      </Box>

      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="xl" 
        scrollBehavior="inside"
        closeOnOverlayClick={true}
        closeOnEsc={true}
        isCentered={true}
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Change History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <ChangeLog 
              previousData={changeLogData?.baselineData}
              currentData={changeLogData?.currentData}
            />
           
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}; 