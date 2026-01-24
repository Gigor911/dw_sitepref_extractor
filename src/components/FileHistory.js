import React from 'react';
import {
  Box,
  Text,
  Badge,
  IconButton,
  VStack,
  HStack,
  Card,
} from '@chakra-ui/react';
import { MdClose } from 'react-icons/md';

const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const FileHistory = ({ history, currentFileId, onSelectFile, onDeleteFile }) => {
    if (!history || history.length === 0) {
        return (
            <Box p={3} bg="gray.50" borderRadius="md" textAlign="center">
                <Text fontSize="sm" color="gray.500">No file history yet</Text>
            </Box>
        );
    }

    return (
        <VStack align="stretch" spacing={2}>
            {history.map((file) => {
                const isActive = file.id === currentFileId;
                return (
                    <Card.Root
                        key={file.id}
                        variant={isActive ? 'elevated' : 'outline'}
                        bg={isActive ? 'blue.50' : 'white'}
                        borderColor={isActive ? 'blue.300' : 'gray.200'}
                        cursor="pointer"
                        onClick={() => onSelectFile(file.id)}
                        _hover={{ borderColor: 'blue.200', bg: isActive ? 'blue.50' : 'gray.50' }}
                        transition="all 0.2s"
                    >
                        <Card.Body p={3}>
                            <HStack justify="space-between" align="start">
                                <Box flex="1" minW="0">
                                    <Text fontWeight="medium" fontSize="sm" isTruncated>
                                        {file.fileInfo.name}
                                    </Text>
                                    <HStack spacing={2} mt={1}>
                                        <Badge size="xs" colorPalette="gray">
                                            {formatBytes(file.fileInfo.size)}
                                        </Badge>
                                        <Text fontSize="xs" color="gray.500">
                                            {formatDate(file.fileInfo.uploadedAt)}
                                        </Text>
                                        {isActive && (
                                            <Badge size="xs" colorPalette="blue">
                                                Active
                                            </Badge>
                                        )}
                                    </HStack>
                                </Box>
                                <IconButton
                                    size="xs"
                                    variant="ghost"
                                    colorPalette="red"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteFile(file.id);
                                    }}
                                    aria-label="Delete file"
                                >
                                    <MdClose />
                                </IconButton>
                            </HStack>
                        </Card.Body>
                    </Card.Root>
                );
            })}
        </VStack>
    );
};

export default FileHistory;
