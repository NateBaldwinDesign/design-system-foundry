import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  IconButton,
  Tooltip,
  useColorMode,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Badge,
  Select,
  Text,
} from '@chakra-ui/react';
import {
  GitPullRequestArrow,
  User,
  History,
} from 'lucide-react';
import { ChangeLog } from './ChangeLog';
import { StorageService } from '../services/storage';
import type { Platform } from '@token-model/data-model';
import { DimensionsPicker } from './DimensionsPicker';

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
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');

  // Load platforms from storage on mount
  useEffect(() => {
    const loadPlatforms = () => {
      const storedPlatforms = StorageService.getPlatforms();
      setPlatforms(storedPlatforms);
      
      // Set first platform as default if none selected
      if (storedPlatforms.length > 0 && !selectedPlatformId) {
        setSelectedPlatformId(storedPlatforms[0].id);
      }
    };

    loadPlatforms();

    // Listen for storage changes to update platforms
    const handleStorageChange = () => {
      loadPlatforms();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedPlatformId]);

  // Get real data when modal opens
  const handleOpenModal = () => {
    const currentData = getCurrentData();
    const baselineData = getBaselineData();
    setChangeLogData({ currentData, baselineData });
    onOpen();
  };

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatformId(platformId);
    // TODO: Implement platform-specific functionality
    console.log('Platform selected:', platformId);
  };

  const handleDimensionModeChange = (dimensionId: string, modeId: string) => {
    // TODO: Implement dimension mode change functionality
    console.log('Dimension mode changed:', { dimensionId, modeId });
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
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Left side - Platform and Dimensions Pickers */}
        <Box>
          <HStack spacing={4} align="center">
            {/* Platform Picker */}
            <HStack spacing={2} align="center">
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Platform:
              </Text>
              <Select
                value={selectedPlatformId}
                onChange={(e) => handlePlatformChange(e.target.value)}
                size="sm"
                width="auto"
                minW="200px"
                variant="outline"
                bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                borderColor={borderColor}
                _hover={{ borderColor: colorMode === 'dark' ? 'gray.600' : 'gray.300' }}
              >
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.displayName}
                  </option>
                ))}
              </Select>
            </HStack>

            {/* Dimensions Picker */}
            <DimensionsPicker onDimensionModeChange={handleDimensionModeChange} />
          </HStack>
        </Box>

        {/* Right side - Action Buttons */}
        <HStack spacing={2}>
          <Tooltip label="Pull Request" placement="bottom">
            <IconButton
              aria-label="Pull Request"
              icon={<GitPullRequestArrow size={16} />}
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement pull request functionality
                console.log('Pull request clicked');
              }}
            />
          </Tooltip>
          <Tooltip label="User Profile" placement="bottom">
            <IconButton
              aria-label="User Profile"
              icon={<User size={16} />}
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement user profile functionality
                console.log('User profile clicked');
              }}
            />
          </Tooltip>
          <Box position="relative">
            <Tooltip label="History" placement="bottom">
              <IconButton
                aria-label="History"
                icon={<History size={16} />}
                variant="ghost"
                size="sm"
                onClick={handleOpenModal}
              />
            </Tooltip>
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